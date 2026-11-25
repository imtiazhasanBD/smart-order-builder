import { describe, it, expect } from 'vitest';
import { priceCart, priceItemUnit } from '@/engines/pricing';
import { MENU_FIXTURE } from '@/mocks/data/menu';
import { CartLine } from '@/types';

describe('Part C - Pricing Engine (TC-05, TC-06, TC-07 & Q2, Q3, Q4)', () => {
  const promos = MENU_FIXTURE.promotions;

  // Canonical Items:
  // A = Toast, Scrambled x2, Chicken Sausage x1, Ketchup
  const itemA = { toast: 1, scrambled: 2, sausage: 1, ketchup: 1 };

  // B = Croissant, Omelette x2, Fried x2, Chicken Sausage x1, Beef Bacon x1, Hash Brown x1, Mushroom x1, Hollandaise
  const itemB = {
    croissant: 1,
    omelette: 2,
    fried: 2,
    sausage: 1,
    bacon: 1,
    hashbrown: 1,
    mushroom: 1,
    hollandaise: 1,
  };

  // C = Paratha, Fried x2, Tofu x1, Cheese x2, Baked Beans x1, Mushroom x1, Chili
  const itemC = {
    paratha: 1,
    fried: 2,
    tofu: 1,
    cheese: 2,
    beans: 1,
    mushroom: 1,
    chili: 1,
  };

  it('TC-05: Computes unit prices of A, B, and C exactly in integer poisha', () => {
    // Item A: 250 (base) + 0 (toast) + 70 (scrambled x2) + 60 (sausage) + 0 (ketchup) = 380 BDT
    const priceA = priceItemUnit(itemA, MENU_FIXTURE, promos);
    expect(priceA.finalUnitPricePoisha).toBe(38000);
    expect(priceA.finalUnitPriceBDT).toBe(380.0);

    // Item B: Base 250 + Options 505 = 755 BDT.
    // Combo discount applies (eggs 4, protein 2) -> 10% off 755 = 75.50 BDT discount.
    // 755 - 75.50 = 679.50 BDT (67,950 poisha).
    const priceB = priceItemUnit(itemB, MENU_FIXTURE, promos);
    expect(priceB.step2ExtrasDiscountPoisha).toBe(0);
    expect(priceB.step3ComboDiscountPoisha).toBe(7550);
    expect(priceB.finalUnitPricePoisha).toBe(67950);
    expect(priceB.finalUnitPriceBDT).toBe(679.5);

    // Item C: Base 250 + Options 265 = 515 BDT.
    // Extras deal applies (4 extras: 2 cheese @35, 1 beans @25, 1 mushroom @30).
    // Cheapest 1 unit is free (beans @ 25 BDT discount) -> 515 - 25 = 490.00 BDT (49,000 poisha).
    const priceC = priceItemUnit(itemC, MENU_FIXTURE, promos);
    expect(priceC.step2ExtrasDiscountPoisha).toBe(2500);
    expect(priceC.step3ComboDiscountPoisha).toBe(0);
    expect(priceC.finalUnitPricePoisha).toBe(49000);
    expect(priceC.finalUnitPriceBDT).toBe(490.0);
  });

  it('TC-06: Cart B x1 + C x2 at 10:59:59 Dhaka time awards C2 coupon (150 BDT) over C1, VAT 75.48, payable 1,585', () => {
    const cart: CartLine[] = [
      { id: 'b', qty: 1, options: itemB },
      { id: 'c', qty: 2, options: itemC },
    ];

    // Server time at 10:59:59 AM Asia/Dhaka
    const serverTime = '2026-11-20T10:59:59+06:00';
    const breakdown = priceCart(cart, MENU_FIXTURE, promos, serverTime, 'MORNING15');

    // Cart subtotal: 679.50 + (490.00 * 2) = 1,659.50 BDT (165,950 poisha)
    expect(breakdown.cartSubtotalBDT).toBe(1659.5);
    expect(breakdown.cartSubtotalPoisha).toBe(165950);

    // C2 coupon (15% of 165,950 = 24,892.5 capped at 15,000 poisha = 150 BDT) wins over C1 (100 BDT)
    expect(breakdown.appliedDiscount.type).toBe('C2');
    expect(breakdown.appliedDiscount.amountBDT).toBe(150.0);
    expect(breakdown.couponStatus.applied).toBe(true);

    // Discounted subtotal = 165,950 - 15,000 = 150,950 poisha (1,509.50 BDT)
    expect(breakdown.discountedSubtotalBDT).toBe(1509.5);

    // 5% VAT = 150,950 * 0.05 = 7,547.5 poisha -> rounded half-up to 7,548 poisha = 75.48 BDT
    expect(breakdown.vatBDT).toBe(75.48);
    expect(breakdown.vatPoisha).toBe(7548);

    // Payable = 150,950 + 7,548 = 158,498 poisha = 1,584.98 BDT -> rounded half-up to whole BDT = 1,585 BDT
    expect(breakdown.payableBDT).toBe(1585);
  });

  it('TC-07: Same cart at 11:00:00 Dhaka time rejects coupon, falls back to C1 (100 BDT), VAT 77.98, payable 1,637', () => {
    const cart: CartLine[] = [
      { id: 'b', qty: 1, options: itemB },
      { id: 'c', qty: 2, options: itemC },
    ];

    // Server time at 11:00:00 AM Asia/Dhaka (coupon cutoff is strictly before 11:00)
    const serverTime = '2026-11-20T11:00:00+06:00';
    const breakdown = priceCart(cart, MENU_FIXTURE, promos, serverTime, 'MORNING15');

    expect(breakdown.cartSubtotalBDT).toBe(1659.5);

    // Coupon is rejected and recorded with explanation
    expect(breakdown.couponStatus.entered).toBe(true);
    expect(breakdown.couponStatus.applied).toBe(false);
    expect(breakdown.couponStatus.reason).toContain('Coupon MORNING15 is valid only strictly before 11:00 AM');

    // Falls back to C1 threshold discount (100 BDT)
    expect(breakdown.appliedDiscount.type).toBe('C1');
    expect(breakdown.appliedDiscount.amountBDT).toBe(100.0);

    // Discounted subtotal = 165,950 - 10,000 = 155,950 poisha (1,559.50 BDT)
    expect(breakdown.discountedSubtotalBDT).toBe(1559.5);

    // 5% VAT = 155,950 * 0.05 = 7,797.5 poisha -> rounded half-up to 7,798 poisha = 77.98 BDT
    expect(breakdown.vatBDT).toBe(77.98);
    expect(breakdown.vatPoisha).toBe(7798);

    // Payable = 155,950 + 7,798 = 163,748 poisha = 1,637.48 BDT -> rounded half-up to whole BDT = 1,637 BDT
    expect(breakdown.payableBDT).toBe(1637);
  });

  it('Q2: Proves the cheapest valid configuration unit price is 360.00 BDT', () => {
    // Toast 1 (0) + Fried 2 (60) + Tofu 1 (50) + Base (250) = 360 BDT
    const cheapestConfig = {
      toast: 1,
      fried: 2,
      tofu: 1,
    };
    const price = priceItemUnit(cheapestConfig, MENU_FIXTURE, promos);
    expect(price.finalUnitPriceBDT).toBe(360.0);
    expect(price.finalUnitPricePoisha).toBe(36000);
  });

  it('Q3: Cart = A x3 at 10:30 vs 11:30 Dhaka time', () => {
    const cart: CartLine[] = [{ id: 'a3', qty: 3, options: itemA }];

    // At 10:30 with MORNING15:
    const at1030 = priceCart(cart, MENU_FIXTURE, promos, '2026-11-20T10:30:00+06:00', 'MORNING15');
    // Subtotal: 380 * 3 = 1,140 BDT.
    // C1 requires >= 1,200 -> 0 BDT.
    // C2 gives 15% of 1,140 = 171 capped at 150 BDT.
    // Discounted subtotal = 1,140 - 150 = 990 BDT.
    // VAT 5% = 49.50 BDT.
    // Payable = 990 + 49.50 = 1039.50 -> rounds to 1,040 BDT.
    expect(at1030.cartSubtotalBDT).toBe(1140.0);
    expect(at1030.appliedDiscount.type).toBe('C2');
    expect(at1030.appliedDiscount.amountBDT).toBe(150.0);
    expect(at1030.vatBDT).toBe(49.5);
    expect(at1030.payableBDT).toBe(1040);

    // At 11:30 with MORNING15:
    const at1130 = priceCart(cart, MENU_FIXTURE, promos, '2026-11-20T11:30:00+06:00', 'MORNING15');
    // Coupon expired past 11:00. Subtotal 1,140 < 1,200 so C1 = 0.
    // Discount = 0.
    // VAT 5% on 1,140 = 57.00 BDT.
    // Payable = 1,140 + 57 = 1,197 BDT.
    expect(at1130.cartSubtotalBDT).toBe(1140.0);
    expect(at1130.appliedDiscount.type).toBe('NONE');
    expect(at1130.appliedDiscount.amountBDT).toBe(0);
    expect(at1130.vatBDT).toBe(57.0);
    expect(at1130.payableBDT).toBe(1197);
  });

  it('Q4: After TC-10 edit (B becomes 643.50), Cart B x1 + C x2 at 11:30 has payable 1,600 BDT', () => {
    // New B: Omelette x1 + Fried x3
    const newB = {
      ...itemB,
      omelette: 1,
      fried: 3,
    };
    const unitPriceNewB = priceItemUnit(newB, MENU_FIXTURE, promos);
    expect(unitPriceNewB.finalUnitPriceBDT).toBe(643.5);

    const cart: CartLine[] = [
      { id: 'b', qty: 1, options: newB },
      { id: 'c', qty: 2, options: itemC },
    ];

    // Evaluated at 11:30 (coupon rejected, C1 applies because 1623.50 >= 1200)
    const at1130 = priceCart(cart, MENU_FIXTURE, promos, '2026-11-20T11:30:00+06:00', 'MORNING15');

    // Subtotal = 643.50 + 980.00 = 1,623.50 BDT
    expect(at1130.cartSubtotalBDT).toBe(1623.5);
    // C1 discount = 100 BDT
    expect(at1130.appliedDiscount.type).toBe('C1');
    expect(at1130.appliedDiscount.amountBDT).toBe(100.0);
    // Discounted subtotal = 1,523.50 BDT. VAT 5% = 76.175 -> 76.18 BDT
    expect(at1130.vatBDT).toBe(76.18);
    // Payable = 1,523.50 + 76.18 = 1,599.68 -> 1,600 BDT
    expect(at1130.payableBDT).toBe(1600);
  });

  it('verifies MSW POST /api/price integration endpoint', async () => {
    const cart: CartLine[] = [
      { id: 'b', qty: 1, options: itemB },
      { id: 'c', qty: 2, options: itemC },
    ];

    const response = await fetch('/api/price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-test-mode': 'true',
      },
      body: JSON.stringify({
        lines: cart,
        couponCode: 'MORNING15',
        requestId: 'req-123',
        skipSimulation: true,
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.requestId).toBe('req-123');
    expect(data.pricing).toBeDefined();
    expect(data.pricing.cartSubtotalBDT).toBe(1659.5);
  });
});
