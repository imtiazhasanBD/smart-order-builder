import { describe, it, expect } from 'vitest';
import { MENU_FIXTURE } from '@/mocks/data/menu';
import { serverStore } from '@/mocks/serverStore';
import {
  getOrderCount,
  getTotalRevenue,
  getBestSellingOption,
  getRevenueByPaymentMethod,
  getAverageOrderValue,
  getCouponUsageStats,
  getOrdersByDate,
  getUnavailableDataNotice,
} from '@/engines/analytics';

describe('Step 08: Sales Analytics Engine & Deterministic Tools', () => {
  const seedOrders = serverStore.getOrders();

  it('calculates total order count deterministically', () => {
    const result = getOrderCount(seedOrders);
    expect(result.totalOrders).toBe(6);
  });

  it('Q5: calculates total revenue across seed orders in BDT and Poisha', () => {
    seedOrders.forEach((o) => {
      console.log(`ORDER ${o.id}: payableBDT=${o.pricing?.payableBDT}, method=${o.paymentMethod}`);
    });
    const result = getTotalRevenue(seedOrders);
    expect(result.totalRevenueBDT).toBe(4995);
    expect(result.totalRevenuePoisha).toBe(499500);
  });

  it('Q6: identifies the best-selling option and returns complete ranking', () => {
    const result = getBestSellingOption(seedOrders, MENU_FIXTURE.groups);
    expect(result.optionId).toBeDefined();
    expect(result.ranking.length).toBeGreaterThan(0);

    // Verify ordering is sorted descending by units sold
    for (let i = 0; i < result.ranking.length - 1; i++) {
      expect(result.ranking[i].units).toBeGreaterThanOrEqual(result.ranking[i + 1].units);
    }

    // Fried eggs sold 10 units, scrambled 8 units, toast 4 units...
    expect(result.optionId).toBe('fried');
    expect(result.optionName).toBe('Fried');
    expect(result.totalUnitsSold).toBe(10);
  });

  it('Q7: aggregates revenue and order count broken down by payment method', () => {
    const result = getRevenueByPaymentMethod(seedOrders);
    expect(result).toHaveProperty('card');
    expect(result).toHaveProperty('bkash');
    expect(result).toHaveProperty('cash');

    // 3 card orders (ORD-1001: 339, ORD-1004: 578, ORD-1006: 1228 = 2,145 BDT)
    expect(result.card.orderCount).toBe(3);
    expect(result.card.revenueBDT).toBe(2145);

    // 2 bkash orders (ORD-1002: 713, ORD-1005: 866 = 1,579 BDT)
    expect(result.bkash.orderCount).toBe(2);
    expect(result.bkash.revenueBDT).toBe(1579);

    // 1 cash order (ORD-1003: 1271 = 1,271 BDT)
    expect(result.cash.orderCount).toBe(1);
    expect(result.cash.revenueBDT).toBe(1271);

    // Sum of method revenues equals total revenue (4995 BDT)
    expect(result.card.revenueBDT + result.bkash.revenueBDT + result.cash.revenueBDT).toBe(4995);
  });

  it('computes average order value (AOV) rounded to two decimals', () => {
    const result = getAverageOrderValue(seedOrders);
    expect(result.totalOrders).toBe(6);
    // 4995 / 6 = 832.5 BDT
    expect(result.aovBDT).toBe(832.5);
  });

  it('Q8: evaluates promotional coupon MORNING15 performance', () => {
    const result = getCouponUsageStats(seedOrders, 'MORNING15');
    expect(result.couponCode).toBe('MORNING15');
    // Entered 4 times across seed orders
    expect(result.enteredCount).toBe(4);
    // Applied 3 times (ORD-1001, ORD-1003, ORD-1005), not applied on ORD-1006 (past 11:00 AM cutoff)
    expect(result.appliedCount).toBe(3);
    expect(result.notAppliedCount).toBe(1);
    expect(result.ordersReceivingDiscount).toEqual(['ORD-1001', 'ORD-1003', 'ORD-1005']);
    expect(result.ordersWithCodeNotApplied[0].orderId).toBe('ORD-1006');
    expect(result.totalDiscountBDT).toBeGreaterThan(0);
  });

  it('filters orders by Asia/Dhaka date', () => {
    const resultNov20 = getOrdersByDate(seedOrders, '2026-11-20');
    expect(resultNov20.orderCount).toBe(2); // ORD-1001 and ORD-1002
    expect(resultNov20.orderIds).toEqual(['ORD-1001', 'ORD-1002']);

    const resultNov21 = getOrdersByDate(seedOrders, '2026-11-21');
    expect(resultNov21.orderCount).toBe(2); // ORD-1003 and ORD-1004

    const resultNov22 = getOrdersByDate(seedOrders, '2026-11-22');
    expect(resultNov22.orderCount).toBe(2); // ORD-1005 and ORD-1006
  });

  it('D5: returns deterministic factual refusal for untracked customer identity queries', () => {
    const result = getUnavailableDataNotice('customer');
    expect(result.supported).toBe(false);
    expect(result.reason).toContain('Information regarding "customer"');
    expect(result.reason).toContain('is not collected or stored');
  });
});
