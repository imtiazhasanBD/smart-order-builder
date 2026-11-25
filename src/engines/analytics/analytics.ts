import { Group, StoredOrder } from '@/types';

// retun ALL orders count.
export function getOrderCount(orders: StoredOrder[]): { totalOrders: number } {
  return {
    totalOrders: orders.length,
  };
}

// return ALL orders total revenue in BDT and Poisha.
export function getTotalRevenue(orders: StoredOrder[]): {
  totalRevenueBDT: number;
  totalRevenuePoisha: number;
} {
  let totalRevenuePoisha = 0;
  let totalRevenueBDT = 0;

  for (const order of orders) {
    if (order.pricing) {
      totalRevenueBDT += order.pricing.payableBDT;
      totalRevenuePoisha += order.pricing.payablePoisha;
    }
  }

  return {
    totalRevenueBDT,
    totalRevenuePoisha,
  };
}

// return best selling option and ranking.
export function getBestSellingOption(
  orders: StoredOrder[],
  groups: Group[]
): {
  optionId: string;
  optionName: string;
  totalUnitsSold: number;
  ranking: Array<{ optionId: string; optionName: string; units: number }>;
} {
  const optionNameMap = new Map<string, string>();
  for (const group of groups) {
    for (const opt of group.options) {
      optionNameMap.set(opt.id, opt.name);
    }
  }

  const counts: Record<string, number> = {};

  for (const order of orders) {
    for (const line of order.lines) {
      const lineQty = line.qty || 1;
      for (const [optId, optQty] of Object.entries(line.options)) {
        if (optQty > 0) {
          counts[optId] = (counts[optId] || 0) + optQty * lineQty;
        }
      }
    }
  }

  const ranking = Object.entries(counts)
    .map(([optionId, units]) => ({
      optionId,
      optionName: optionNameMap.get(optionId) || optionId,
      units,
    }))
    .sort((a, b) => b.units - a.units);

  const best = ranking[0] || {
    optionId: 'none',
    optionName: 'None',
    units: 0,
  };

  return {
    optionId: best.optionId,
    optionName: best.optionName,
    totalUnitsSold: best.units,
    ranking,
  };
}

// Aggregates order count and total revenue grouped by payment method
export function getRevenueByPaymentMethod(orders: StoredOrder[]): Record<
  string,
  { orderCount: number; revenueBDT: number }
> {
  const result: Record<string, { orderCount: number; revenueBDT: number }> = {
    card: { orderCount: 0, revenueBDT: 0 },
    bkash: { orderCount: 0, revenueBDT: 0 },
    cash: { orderCount: 0, revenueBDT: 0 },
  };

  for (const order of orders) {
    const method = order.paymentMethod || 'cash';
    if (!result[method]) {
      result[method] = { orderCount: 0, revenueBDT: 0 };
    }
    result[method].orderCount += 1;
    if (order.pricing) {
      result[method].revenueBDT += order.pricing.payableBDT;
    }
  }

  return result;
}

// Calculates average order value (AOV) rounded to two decimals.
export function getAverageOrderValue(orders: StoredOrder[]): {
  aovBDT: number;
  totalOrders: number;
} {
  if (orders.length === 0) {
    return { aovBDT: 0, totalOrders: 0 };
  }

  const { totalRevenueBDT } = getTotalRevenue(orders);
  const aovBDT = Math.round((totalRevenueBDT / orders.length) * 100) / 100;

  return {
    aovBDT,
    totalOrders: orders.length,
  };
}

// Tracks promotional coupon performance, application rate, and total discounts surrendered.
export function getCouponUsageStats(
  orders: StoredOrder[],
  targetCode: string = 'MORNING15'
): {
  couponCode: string;
  enteredCount: number;
  appliedCount: number;
  notAppliedCount: number;
  totalDiscountBDT: number;
  ordersReceivingDiscount: string[];
  ordersWithCodeNotApplied: Array<{ orderId: string; reason?: string }>;
} {
  let enteredCount = 0;
  let appliedCount = 0;
  let totalDiscountBDT = 0;
  const ordersReceivingDiscount: string[] = [];
  const ordersWithCodeNotApplied: Array<{ orderId: string; reason?: string }> = [];

  for (const order of orders) {
    const entered = order.couponCode?.toUpperCase() === targetCode.toUpperCase();
    if (entered) {
      enteredCount += 1;
      const isApplied =
        order.pricing?.couponStatus?.applied === true ||
        order.pricing?.appliedDiscount?.type === 'C2';

      if (isApplied) {
        appliedCount += 1;
        ordersReceivingDiscount.push(order.id);
        const discountPoisha =
          order.pricing?.appliedDiscount?.amountPoisha ??
          order.pricing?.appliedDiscount?.discountPoisha ??
          0;
        totalDiscountBDT += discountPoisha / 100;
      } else {
        ordersWithCodeNotApplied.push({
          orderId: order.id,
          reason:
            order.pricing?.couponStatus?.reason ||
            'Order placed after 11:00 AM cutoff or beaten by threshold discount',
        });
      }
    }
  }

  return {
    couponCode: targetCode,
    enteredCount,
    appliedCount,
    notAppliedCount: enteredCount - appliedCount,
    totalDiscountBDT,
    ordersReceivingDiscount,
    ordersWithCodeNotApplied,
  };
}

// Retrieves orders filtered by date formatted in Asia/Dhaka timezone (YYYY-MM-DD).
export function getOrdersByDate(
  orders: StoredOrder[],
  targetDate: string
): {
  date: string;
  orderCount: number;
  totalRevenueBDT: number;
  orderIds: string[];
} {
  const matchingOrders: StoredOrder[] = [];

  for (const order of orders) {
    const d = new Date(order.createdAt);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dhakaDateStr = formatter.format(d);

    if (dhakaDateStr === targetDate) {
      matchingOrders.push(order);
    }
  }

  let totalRevenueBDT = 0;
  for (const o of matchingOrders) {
    totalRevenueBDT += o.pricing?.payableBDT || 0;
  }

  return {
    date: targetDate,
    orderCount: matchingOrders.length,
    totalRevenueBDT,
    orderIds: matchingOrders.map((o) => o.id),
  };
}

// Factual refusal generator for untracked business concepts.
export function getUnavailableDataNotice(missingEntity: string): {
  supported: false;
  reason: string;
} {
  return {
    supported: false,
    reason: `Information regarding "${missingEntity}" (e.g. customer names, personal identity, or delivery addresses) is not collected or stored in this sales dataset.`,
  };
}
