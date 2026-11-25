export interface OptionItem {
  id: string;
  name: string;
  priceBDT: number;
  pricePoisha: number;
  ingredients: Record<string, number>;
}

export interface GroupLimits {
  min?: number;
  max?: number;
  step?: number;
  maxDistinct?: number;
  maxPerOption?: number;
}

export interface Group {
  id: string;
  name: string;
  limits: GroupLimits;
  options: OptionItem[];
}

export type CrossGroupRule =
  | {
      id: string;
      type: 'requires';
      optionId: string;
      requiredAnyOf: string[];
      message?: string;
    }
  | {
      id: string;
      type: 'excludes';
      optionId: string;
      excludedOptions: string[];
      message?: string;
    }
  | {
      id: string;
      type: 'overrideLimit';
      optionId: string;
      targetGroupId: string;
      limits: Partial<GroupLimits>;
      message?: string;
    };

export interface Violation {
  id: string;
  message: string;
}

export interface UnitExtrasPromotion {
  id: string;
  name: string;
  type: 'cheapest_free_per_n';
  targetGroupId: string;
  everyNUnits: number;
}

export interface UnitComboPromotion {
  id: string;
  name: string;
  type: 'combo_discount';
  conditions: Array<{
    groupId: string;
    minUnits: number;
  }>;
  discountPercent: number;
}

export interface CartThresholdPromotion {
  id: string;
  name: string;
  type: 'threshold_fixed';
  minSubtotalPoisha: number;
  discountPoisha: number;
}

export interface CartCouponPromotion {
  id: string;
  name: string;
  type: 'coupon_percentage_capped';
  code: string;
  percent: number;
  maxDiscountPoisha: number;
  cutoffHourDhaka: number;
  cutoffMinuteDhaka: number;
}

export interface Promotions {
  unitExtras: UnitExtrasPromotion;
  unitCombo: UnitComboPromotion;
  cartThreshold: CartThresholdPromotion;
  cartCoupon: CartCouponPromotion;
}

export interface MenuResponse {
  productId: string;
  productName: string;
  basePriceBDT: number;
  basePricePoisha: number;
  groups: Group[];
  rules: CrossGroupRule[];
  promotions: Promotions;
  ingredientStock: Record<string, number>;
  serverTime: string;
}

export type SelectedOptions = Record<string, number>;

export interface CartLine {
  id: string;
  qty: number;
  options: SelectedOptions;
  reservedUntilServerTime?: string;
  isExpired?: boolean;
}

export type PaymentMethod = 'card' | 'bkash' | 'cash';

export interface AppliedDiscount {
  type: 'C1' | 'C2' | 'NONE';
  name: string;
  amountPoisha: number;
  amountBDT: number;
}

export interface CouponStatus {
  code: string;
  entered: boolean;
  applied: boolean;
  reason?: string;
}

export interface PricingBreakdown {
  currency: 'BDT';
  unitSubtotalPoisha: number;
  unitSubtotalBDT: number;
  step2ExtrasDiscountPoisha: number;
  step3ComboDiscountPoisha: number;
  finalUnitPricePoisha: number;
  finalUnitPriceBDT: number;
  cartSubtotalPoisha: number;
  cartSubtotalBDT: number;
  appliedDiscount: AppliedDiscount;
  couponStatus: CouponStatus;
  discountedSubtotalPoisha: number;
  discountedSubtotalBDT: number;
  vatPoisha: number;
  vatBDT: number;
  payablePoisha: number;
  payableBDT: number;
}

export interface StoredOrderLine {
  itemId: string;
  qty: number;
  options: SelectedOptions;
  unitPricePoisha: number;
  unitPriceBDT: number;
  lineTotalPoisha: number;
  lineTotalBDT: number;
}

export interface StoredOrderPricing {
  currency: 'BDT';
  cartSubtotalPoisha?: number;
  cartSubtotalBDT?: number;
  subtotalPoisha?: number;
  subtotalBDT?: number;
  appliedDiscount: {
    type: 'C1' | 'C2' | 'NONE';
    name: string;
    amountPoisha?: number;
    amountBDT?: number;
    discountPoisha?: number;
    discountBDT?: number;
  };
  couponStatus: {
    code: string | null;
    entered: boolean;
    applied: boolean;
    reason?: string;
  };
  discountedSubtotalPoisha?: number;
  discountedSubtotalBDT?: number;
  vatPoisha: number;
  vatBDT?: number;
  payablePoisha: number;
  payableBDT: number;
}

export interface StoredOrder {
  id: string;
  createdAt: string;
  paymentMethod: PaymentMethod;
  couponCode: string | null;
  lines: StoredOrderLine[];
  pricing?: StoredOrderPricing;
}

export interface SeedOrderLine {
  qty: number;
  options: SelectedOptions;
}

export interface SeedOrder {
  id: string;
  createdAt: string;
  paymentMethod: PaymentMethod;
  couponCode: string | null;
  lines: SeedOrderLine[];
}

export interface SeedOrdersPayload {
  schemaVersion: number;
  currency: string;
  note: string;
  orders: SeedOrder[];
}
