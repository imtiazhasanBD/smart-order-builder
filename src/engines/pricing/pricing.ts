import {
  MenuResponse,
  Promotions,
  CartLine,
  SelectedOptions,
  PricingBreakdown,
  AppliedDiscount,
  CouponStatus,
} from '@/types';
import { buildOptionLookup } from '@/engines/inventory';

// Rounds to the nearest integer (half-up)
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

// Checks if the timestamp is before 11:00 AM Dhaka time
export function isBefore11AmDhaka(timeInput: string | Date): boolean {
  const date = typeof timeInput === 'string' ? new Date(timeInput) : timeInput;

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hourPart = parts.find((p) => p.type === 'hour')?.value;
  const hour = parseInt(hourPart || '0', 10);

  // Strictly before 11:00 AM (00:00:00 through 10:59:59)
  return hour < 11;
}

export interface UnitPriceBreakdown {
  unitSubtotalPoisha: number;
  unitSubtotalBDT: number;
  step2ExtrasDiscountPoisha: number;
  step3ComboDiscountPoisha: number;
  finalUnitPricePoisha: number;
  finalUnitPriceBDT: number;
}

// Calculates item unit price
export function priceItemUnit(
  options: SelectedOptions,
  menu: MenuResponse | Omit<MenuResponse, 'serverTime'>,
  promos: Promotions
): UnitPriceBreakdown {
  const optionLookup = buildOptionLookup(menu.groups);

  // Step 1: Base price + sum(option price x option qty)
  let step1SubtotalPoisha = menu.basePricePoisha;
  for (const [optionId, qty] of Object.entries(options)) {
    if (qty <= 0) continue;
    const opt = optionLookup.get(optionId);
    if (opt) {
      step1SubtotalPoisha += opt.pricePoisha * qty;
    }
  }

  // Step 2: P2 Extras deal (for every 3 extra units, cheapest extra unit is free)
  let step2ExtrasDiscountPoisha = 0;
  const extrasPricesPoisha: number[] = [];

  for (const group of menu.groups) {
    if (group.id === promos.unitExtras.targetGroupId) {
      for (const opt of group.options) {
        const qty = options[opt.id] || 0;
        for (let i = 0; i < qty; i++) {
          extrasPricesPoisha.push(opt.pricePoisha);
        }
      }
    }
  }

  const freeExtrasCount = Math.floor(
    extrasPricesPoisha.length / promos.unitExtras.everyNUnits
  );

  if (freeExtrasCount > 0) {
    // Sort ascending so cheapest units are discounted first
    extrasPricesPoisha.sort((a, b) => a - b);
    for (let i = 0; i < freeExtrasCount; i++) {
      step2ExtrasDiscountPoisha += extrasPricesPoisha[i];
    }
  }

  const step2AmountPoisha = step1SubtotalPoisha - step2ExtrasDiscountPoisha;

  // Step 3: P1 Combo deal (if eggs >= 4 AND protein >= 2, take 10% off step-2 amount)
  let step3ComboDiscountPoisha = 0;
  let eggUnits = 0;
  let proteinUnits = 0;

  for (const group of menu.groups) {
    if (group.id === 'eggs') {
      for (const opt of group.options) {
        eggUnits += options[opt.id] || 0;
      }
    } else if (group.id === 'protein') {
      for (const opt of group.options) {
        proteinUnits += options[opt.id] || 0;
      }
    }
  }

  const qualifiesForCombo = eggUnits >= 4 && proteinUnits >= 2;
  if (qualifiesForCombo) {
    step3ComboDiscountPoisha = roundHalfUp(
      (step2AmountPoisha * promos.unitCombo.discountPercent) / 100
    );
  }

  const finalUnitPricePoisha = step2AmountPoisha - step3ComboDiscountPoisha;

  return {
    unitSubtotalPoisha: step1SubtotalPoisha,
    unitSubtotalBDT: step1SubtotalPoisha / 100,
    step2ExtrasDiscountPoisha,
    step3ComboDiscountPoisha,
    finalUnitPricePoisha,
    finalUnitPriceBDT: finalUnitPricePoisha / 100,
  };
}

// Calculates complete cart pricing
export function priceCart(
  cart: CartLine[],
  menu: MenuResponse | Omit<MenuResponse, 'serverTime'>,
  promos: Promotions,
  serverTime: string | Date,
  couponCode?: string | null
): PricingBreakdown {
  // Step 4: Line total = unit price x item quantity. Cart subtotal = sum of line totals.
  let cartSubtotalPoisha = 0;
  let representativeUnitBreakdown: UnitPriceBreakdown = {
    unitSubtotalPoisha: menu.basePricePoisha,
    unitSubtotalBDT: menu.basePriceBDT,
    step2ExtrasDiscountPoisha: 0,
    step3ComboDiscountPoisha: 0,
    finalUnitPricePoisha: menu.basePricePoisha,
    finalUnitPriceBDT: menu.basePriceBDT,
  };

  for (const line of cart) {
    const unitPrice = priceItemUnit(line.options, menu, promos);
    representativeUnitBreakdown = unitPrice;
    cartSubtotalPoisha += unitPrice.finalUnitPricePoisha * line.qty;
  }

  // Applies the larger cart discount; ties favor C1 (threshold fixed discount).
  let c1DiscountPoisha = 0;
  if (cartSubtotalPoisha >= promos.cartThreshold.minSubtotalPoisha) {
    c1DiscountPoisha = promos.cartThreshold.discountPoisha;
  }

  // Applies 15% off (max 150 BDT) before 11 AM Dhaka time.
  const isMorningCouponEntered =
    !!couponCode &&
    couponCode.trim().toUpperCase() === promos.cartCoupon.code.toUpperCase();

  let c2DiscountPoisha = 0;
  let couponStatus: CouponStatus = {
    code: couponCode ? couponCode.trim().toUpperCase() : '',
    entered: isMorningCouponEntered,
    applied: false,
  };

  if (isMorningCouponEntered) {
    const isTimingValid = isBefore11AmDhaka(serverTime);
    if (isTimingValid) {
      const calculatedC2 = roundHalfUp(
        (cartSubtotalPoisha * promos.cartCoupon.percent) / 100
      );
      c2DiscountPoisha = Math.min(
        promos.cartCoupon.maxDiscountPoisha,
        calculatedC2
      );
    } else {
      couponStatus.reason = `Coupon ${promos.cartCoupon.code} is valid only strictly before 11:00 AM Dhaka time`;
    }
  }

  // Determine winning discount (larger wins; on a tie pick C1)
  let appliedDiscount: AppliedDiscount = {
    type: 'NONE',
    name: 'No discount applied',
    amountPoisha: 0,
    amountBDT: 0,
  };

  if (c2DiscountPoisha > c1DiscountPoisha) {
    appliedDiscount = {
      type: 'C2',
      name: promos.cartCoupon.name,
      amountPoisha: c2DiscountPoisha,
      amountBDT: c2DiscountPoisha / 100,
    };
    couponStatus.applied = true;
  } else if (c1DiscountPoisha > 0) {
    appliedDiscount = {
      type: 'C1',
      name: promos.cartThreshold.name,
      amountPoisha: c1DiscountPoisha,
      amountBDT: c1DiscountPoisha / 100,
    };
    if (isMorningCouponEntered && !couponStatus.reason) {
      couponStatus.reason = 'Threshold discount C1 provided greater or equal benefit';
    }
  }

  // Step 6: 5% VAT on discounted subtotal
  const discountedSubtotalPoisha =
    cartSubtotalPoisha - appliedDiscount.amountPoisha;

  const vatPoisha = roundHalfUp((discountedSubtotalPoisha * 5) / 100);
  const exactPayablePoisha = discountedSubtotalPoisha + vatPoisha;

  // Final payable rounded half-up to whole BDT
  const payableBDT = roundHalfUp(exactPayablePoisha / 100);
  const payablePoisha = payableBDT * 100;

  return {
    currency: 'BDT',
    unitSubtotalPoisha: representativeUnitBreakdown.unitSubtotalPoisha,
    unitSubtotalBDT: representativeUnitBreakdown.unitSubtotalBDT,
    step2ExtrasDiscountPoisha: representativeUnitBreakdown.step2ExtrasDiscountPoisha,
    step3ComboDiscountPoisha: representativeUnitBreakdown.step3ComboDiscountPoisha,
    finalUnitPricePoisha: representativeUnitBreakdown.finalUnitPricePoisha,
    finalUnitPriceBDT: representativeUnitBreakdown.finalUnitPriceBDT,
    cartSubtotalPoisha,
    cartSubtotalBDT: cartSubtotalPoisha / 100,
    appliedDiscount,
    couponStatus,
    discountedSubtotalPoisha,
    discountedSubtotalBDT: discountedSubtotalPoisha / 100,
    vatPoisha,
    vatBDT: vatPoisha / 100,
    payablePoisha,
    payableBDT,
  };
}
