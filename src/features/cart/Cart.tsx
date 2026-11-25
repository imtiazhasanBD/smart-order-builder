import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MenuResponse,
  PaymentMethod,
  PricingBreakdown,
  CartLine,
} from '@/types';
import { CartReservationItem } from '@/mocks/serverStore';
import { priceCart } from '@/engines/pricing';
import {
  Clock,
  Trash2,
  Edit2,
  Tag,
  CreditCard,
  Banknote,
  Smartphone,
  AlertTriangle,
  ShoppingBag,
  Check,
  RefreshCw,
} from 'lucide-react';

export interface CartProps {
  menu: MenuResponse;
  cartItems: CartReservationItem[];
  cartVersion: number;
  serverOffsetMs: number;
  onEditItem: (item: CartReservationItem) => void;
  onRemoveItem: (itemId: string) => Promise<void>;
  onCheckout: (
    paymentMethod: PaymentMethod,
    couponCode: string | null,
    idempotencyKey: string
  ) => Promise<void>;
  onSwitchToBuilder: () => void;
}

export const Cart: React.FC<CartProps> = ({
  menu,
  cartItems,
  serverOffsetMs,
  onEditItem,
  onRemoveItem,
  onCheckout,
  onSwitchToBuilder,
}) => {
  const [couponInput, setCouponInput] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const checkoutKeyRef = useRef<string | null>(null);

  // Current server time estimation: clientNow + serverOffsetMs
  const [currentServerTime, setCurrentServerTime] = useState<number>(
    () => Date.now() + serverOffsetMs
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentServerTime(Date.now() + serverOffsetMs);
    }, 1000);
    return () => clearInterval(timer);
  }, [serverOffsetMs]);

  // Option name lookup
  const optionNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of menu.groups) {
      for (const opt of g.options) {
        map.set(opt.id, opt.name);
      }
    }
    return map;
  }, [menu.groups]);

  // Compute remaining seconds and isExpired
  const itemsWithExpiry = useMemo(() => {
    return cartItems.map((line) => {
      let isExpired = line.isExpired || false;
      let remainingSeconds = 0;

      if (line.reservedUntilServerTime) {
        const expMs = new Date(line.reservedUntilServerTime).getTime();
        const diffMs = expMs - currentServerTime;
        if (diffMs <= 0) {
          isExpired = true;
          remainingSeconds = 0;
        } else {
          remainingSeconds = Math.floor(diffMs / 1000);
        }
      }

      return {
        ...line,
        isExpired,
        remainingSeconds,
      };
    });
  }, [cartItems, currentServerTime]);

  const activeItems = useMemo(
    () => itemsWithExpiry.filter((i) => !i.isExpired),
    [itemsWithExpiry]
  );

  // Price calculation for active items
  const pricingResult: PricingBreakdown = useMemo(() => {
    const activeLines: CartLine[] = activeItems.map((i) => ({
      id: i.id,
      qty: i.qty,
      options: i.options,
    }));

    return priceCart(
      activeLines,
      menu,
      menu.promotions,
      new Date(currentServerTime),
      appliedCoupon
    );
  }, [activeItems, appliedCoupon, menu, currentServerTime]);

  const formatCountdown = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setAppliedCoupon(couponInput.trim().toUpperCase());
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
  };

  const handlePay = async () => {
    if (activeItems.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setCheckoutError(null);

    // Reuse idempotency key
    if (!checkoutKeyRef.current) {
      checkoutKeyRef.current = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    const idempotencyKey = checkoutKeyRef.current;

    try {
      await onCheckout(paymentMethod, appliedCoupon, idempotencyKey);
      checkoutKeyRef.current = null;
    } catch (err: any) {
      setCheckoutError(err.message || 'Payment checkout failed');
      setIsSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-md p-10 text-center shadow-xs max-w-lg mx-auto">
        <div className="w-14 h-14 bg-slate-100 rounded-md flex items-center justify-center mx-auto mb-4 text-slate-400">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Your Cart is Empty</h3>
        <p className="text-sm text-slate-500 mt-2 mb-6">
          Start building your custom breakfast with our interactive rule-driven builder.
        </p>
        <button
          onClick={onSwitchToBuilder}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-md text-sm shadow-xs transition"
        >
          Build a Breakfast
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Cols: Cart Items */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            Cart Items ({cartItems.length})
          </h2>
          <button
            onClick={onSwitchToBuilder}
            className="text-xs font-semibold text-amber-600 hover:text-amber-700 underline"
          >
            + Add Another Item
          </button>
        </div>

        {checkoutError && (
          <div className="bg-rose-50 border border-rose-300 p-3 rounded-md text-rose-700 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{checkoutError}</span>
          </div>
        )}

        <div className="space-y-3">
          {itemsWithExpiry.map((item, idx) => (
            <div
              key={item.id}
              data-testid={`cart-item-${item.id}`}
              className={`bg-white border rounded-md p-4 shadow-xs transition-all ${
                item.isExpired
                  ? 'border-rose-200 bg-rose-50/20 opacity-80'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-base">
                    Item #{idx + 1}: {menu.productName}
                  </span>
                  <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-sm">
                    Qty: {item.qty}
                  </span>
                </div>

                {/* Expiry Countdown / Badge */}
                <div className="flex items-center gap-1.5">
                  {item.isExpired ? (
                    <span
                      data-testid={`expired-badge-${item.id}`}
                      className="bg-rose-100 text-rose-700 text-xs font-bold px-2 py-0.5 rounded-sm flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5" /> Expired (Stock Released)
                    </span>
                  ) : (
                    <span
                      data-testid={`countdown-badge-${item.id}`}
                      className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-sm flex items-center gap-1"
                    >
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      Expires in: {formatCountdown(item.remainingSeconds)}
                    </span>
                  )}
                </div>
              </div>

              {/* Selected Options List */}
              <div className="py-3">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(item.options).map(([optId, count]) => {
                    if (count <= 0) return null;
                    const optName = optionNameMap.get(optId) || optId;
                    return (
                      <span
                        key={optId}
                        className="text-xs bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-sm font-medium"
                      >
                        {optName} <strong className="text-slate-900">x{count}</strong>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {item.isExpired
                    ? 'Read-only: reservation expired'
                    : 'Stock reserved for 5 minutes'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={item.isExpired}
                    onClick={() => onEditItem(item)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-sm border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                    title={
                      item.isExpired
                        ? 'Expired items cannot be edited'
                        : 'Edit this item (net difference stock check)'
                    }
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-sm border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center gap-1"
                    title="Remove from cart"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Col: Checkout & Pricing Summary */}
      <div className="space-y-4">
        {/* Coupon Code Section */}
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 mb-2">
            <Tag className="w-4 h-4 text-amber-500" />
            <span>Promotional Coupon</span>
          </h3>

          <form onSubmit={handleApplyCoupon} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. MORNING15"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {appliedCoupon ? (
              <button
                type="button"
                onClick={handleRemoveCoupon}
                className="px-3 py-1.5 text-xs font-semibold rounded-sm bg-slate-200 text-slate-700 hover:bg-slate-300"
              >
                Clear
              </button>
            ) : (
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded-sm bg-amber-500 text-slate-950 hover:bg-amber-400"
              >
                Apply
              </button>
            )}
          </form>

          {/* Coupon Status Notice */}
          {pricingResult.couponStatus.entered && (
            <div className="mt-2 text-xs">
              {pricingResult.couponStatus.applied ? (
                <div className="text-emerald-700 flex items-center gap-1 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>Coupon {pricingResult.couponStatus.code} applied successfully!</span>
                </div>
              ) : (
                <div className="text-amber-800 bg-amber-50 p-2 rounded-sm border border-amber-200 mt-1">
                  <p className="font-semibold">Coupon entered but not applied:</p>
                  <p className="text-[11px] text-amber-700">
                    {pricingResult.couponStatus.reason || 'Not eligible'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pricing Breakdown Card */}
        <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs space-y-3">
          <h3 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-2">
            Order Summary
          </h3>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Cart Subtotal</span>
              <span className="font-medium text-slate-900">
                {pricingResult.cartSubtotalBDT.toFixed(2)} BDT
              </span>
            </div>

            {/* Applied Discount */}
            {pricingResult.appliedDiscount.type !== 'NONE' && (
              <div className="flex justify-between text-emerald-700 bg-emerald-50 px-2 py-1 rounded-sm">
                <span className="flex items-center gap-1 text-xs font-semibold">
                  <Tag className="w-3 h-3" />
                  {pricingResult.appliedDiscount.name}
                </span>
                <span className="font-bold text-xs">
                  -{pricingResult.appliedDiscount.amountBDT.toFixed(2)} BDT
                </span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Discounted Subtotal</span>
              <span className="font-medium text-slate-900">
                {pricingResult.discountedSubtotalBDT.toFixed(2)} BDT
              </span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>VAT (5% rounded half-up)</span>
              <span className="font-medium text-slate-900">
                {pricingResult.vatBDT.toFixed(2)} BDT
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
              <div>
                <span className="text-sm font-bold text-slate-900">Total Payable</span>
                <p className="text-[10px] text-slate-400">Rounded half-up to whole BDT</p>
              </div>
              <span className="text-2xl font-extrabold text-amber-600">
                {pricingResult.payableBDT.toLocaleString()} BDT
              </span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`py-2 px-2 text-xs font-bold rounded-sm border flex flex-col items-center gap-1 transition ${
                  paymentMethod === 'card'
                    ? 'border-amber-500 bg-amber-50 text-slate-950 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bkash')}
                className={`py-2 px-2 text-xs font-bold rounded-sm border flex flex-col items-center gap-1 transition ${
                  paymentMethod === 'bkash'
                    ? 'border-amber-500 bg-amber-50 text-slate-950 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Smartphone className="w-4 h-4 text-pink-600" />
                <span>bKash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-2 text-xs font-bold rounded-sm border flex flex-col items-center gap-1 transition ${
                  paymentMethod === 'cash'
                    ? 'border-amber-500 bg-amber-50 text-slate-950 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Cash</span>
              </button>
            </div>
          </div>

          {/* Pay Button with Idempotency Protection */}
          <button
            type="button"
            disabled={activeItems.length === 0 || isSubmitting}
            onClick={handlePay}
            className={`w-full py-2.5 rounded-sm font-bold text-sm shadow-xs flex items-center justify-center gap-2 transition ${
              activeItems.length > 0 && !isSubmitting
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <span>Pay {pricingResult.payableBDT.toLocaleString()} BDT</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
