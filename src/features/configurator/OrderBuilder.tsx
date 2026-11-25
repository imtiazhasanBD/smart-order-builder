import React, { useState, useMemo, useEffect } from 'react';
import {
  MenuResponse,
  SelectedOptions,
  Group,
  GroupLimits,
} from '@/types';
import { validate } from '@/engines/validation';
import {
  buildOptionLookup,
  calculateOptionRemaining,
  checkStockForConfig,
} from '@/engines/inventory';
import { usePricePreview } from './usePricePreview';
import {
  Plus,
  Minus,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  RotateCcw,
  Info,
  CheckCircle2,
  Tag,
  ChevronDown,
  ChevronUp,
  Receipt,
} from 'lucide-react';
import { IngredientIcon } from '@/components/IngredientIcon';

export interface OrderBuilderProps {
  menu: MenuResponse;
  availableStock: Record<string, number>;
  onAddToCart: (item: {
    options: SelectedOptions;
    qty: number;
    unitPriceBDT: number;
  }) => void;
  editingItem?: {
    id: string;
    options: SelectedOptions;
    qty: number;
  } | null;
  onCancelEdit?: () => void;
  skipDebounceForTest?: boolean;
}

const DRAFT_STORAGE_KEY = 'smart_order_builder_draft_config';

export const OrderBuilder: React.FC<OrderBuilderProps> = ({
  menu,
  availableStock,
  onAddToCart,
  editingItem = null,
  onCancelEdit,
  skipDebounceForTest = false,
}) => {
  // Option lookup map
  const optionLookup = useMemo(
    () => buildOptionLookup(menu.groups),
    [menu.groups]
  );

  // Initialize selections (restore draft from localStorage if not editing)
  const [config, setConfig] = useState<SelectedOptions>(() => {
    if (editingItem) {
      return { ...editingItem.options };
    }
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore parse errors
    }
    return {};
  });

  const [qty, setQty] = useState<number>(() => editingItem?.qty || 1);
  const [showMobileBreakdown, setShowMobileBreakdown] = useState<boolean>(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const allCollapsed =
    menu.groups.length > 0 && menu.groups.every((g) => !!collapsedGroups[g.id]);

  const toggleAllGroups = () => {
    if (allCollapsed) {
      setCollapsedGroups({});
    } else {
      const next: Record<string, boolean> = {};
      for (const g of menu.groups) {
        next[g.id] = true;
      }
      setCollapsedGroups(next);
    }
  };

  // Sync draft to localStorage when not editing (Part G bonus: draft survives refresh)
  useEffect(() => {
    if (!editingItem) {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(config));
    }
  }, [config, editingItem]);

  // When editingItem prop changes
  useEffect(() => {
    if (editingItem) {
      setConfig({ ...editingItem.options });
      setQty(editingItem.qty);
    }
  }, [editingItem]);

  // Compute active override limits for display
  const activeOverrides = useMemo(() => {
    const overrides = new Map<string, Partial<GroupLimits>>();
    for (const rule of menu.rules) {
      if (rule.type === 'overrideLimit') {
        if ((config[rule.optionId] || 0) > 0) {
          overrides.set(rule.targetGroupId, rule.limits);
        }
      }
    }
    return overrides;
  }, [config, menu.rules]);

  // Run validation engine
  const violations = useMemo(() => {
    return validate(config, menu.groups, menu.rules);
  }, [config, menu.groups, menu.rules]);

  // Run shared stock engine check
  const stockCheck = useMemo(() => {
    return checkStockForConfig(config, qty, availableStock, optionLookup);
  }, [config, qty, availableStock, optionLookup]);

  // Compute remaining unreserved stock after deducting current in-builder configuration
  const currentAvailableStock = useMemo(() => {
    const remaining = { ...availableStock };
    for (const [optId, count] of Object.entries(config)) {
      if (count <= 0) continue;
      const opt = optionLookup.get(optId);
      if (!opt) continue;
      for (const [ing, req] of Object.entries(opt.ingredients)) {
        const used = req * count * qty;
        remaining[ing] = Math.max(0, (remaining[ing] || 0) - used);
      }
    }
    return remaining;
  }, [config, qty, availableStock, optionLookup]);

  // Async price preview hook
  const {
    pricing,
    isLoading: isPriceLoading,
    isError: isPriceError,
    errorMessage: priceErrorMessage,
    retry: retryPrice,
  } = usePricePreview({
    config,
    qty,
    skipDebounce: skipDebounceForTest,
  });

  // Modify option quantity
  const handleUpdateOption = (optionId: string, delta: number) => {
    setConfig((prev) => {
      const current = prev[optionId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[optionId];
      } else {
        updated[optionId] = next;
      }
      return updated;
    });
  };

  const handleReset = () => {
    setConfig({});
    setQty(1);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    if (editingItem && onCancelEdit) {
      onCancelEdit();
    }
  };

  const isAddToCartDisabled =
    violations.length > 0 || !stockCheck.isValid || isPriceLoading || isPriceError;

  const handleAddToCartClick = () => {
    if (isAddToCartDisabled || !pricing) return;

    onAddToCart({
      options: { ...config },
      qty,
      unitPriceBDT: pricing.finalUnitPriceBDT,
    });

    if (!editingItem) {
      setConfig({});
      setQty(1);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    }
  };

  // Live breakdown calculations matching reference design
  const baseTotalBDT = menu.basePriceBDT * qty;
  const optionsTotalBDT = pricing
    ? Math.max(0, (pricing.unitSubtotalBDT - menu.basePriceBDT) * qty)
    : 0;
  const subtotalBDT = pricing ? pricing.unitSubtotalBDT * qty : baseTotalBDT;
  const extrasDiscountBDT = pricing ? (pricing.step2ExtrasDiscountPoisha * qty) / 100 : 0;
  const comboDiscountBDT = pricing ? (pricing.step3ComboDiscountPoisha * qty) / 100 : 0;
  const totalPayableBDT = pricing ? pricing.finalUnitPriceBDT * qty : baseTotalBDT;
  const hasSelections = useMemo(() => Object.values(config).some((q) => q > 0), [config]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Configurator & Option Groups (adds bottom padding on mobile so dock never covers bottom options) */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-6 pb-48 lg:pb-0">
        {/* Product Banner */}
        <div className="bg-white border border-slate-200 rounded-md p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-900">{menu.productName}</h2>
              {editingItem && (
                <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-md border border-amber-300">
                  Editing Item
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Base price: <strong className="text-slate-800">{menu.basePriceBDT.toFixed(2)} BDT</strong>. Select your options below according to breakfast rules.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 border border-slate-200 rounded-md px-2.5 py-2 hover:bg-slate-50"
              title="Reset options to default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        {/* Option Groups */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Item Customization
            </span>
            <button
              type="button"
              onClick={toggleAllGroups}
              data-testid="toggle-all-groups-btn"
              className="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
            >
              {allCollapsed ? 'Expand All' : 'Collapse All'}
            </button>
          </div>

          {menu.groups.map((group: Group) => {
            const groupTotal = group.options.reduce((sum, opt) => sum + (config[opt.id] || 0), 0);
            const overrideLimits = activeOverrides.get(group.id);
            const effectiveMax = overrideLimits?.max ?? group.limits.max;
            const isCollapsed = !!collapsedGroups[group.id];

            const selectedItemsSummary = group.options
              .filter((opt) => (config[opt.id] || 0) > 0)
              .map((opt) => `${config[opt.id]}× ${opt.name}`)
              .join(', ');

            return (
              <div
                key={group.id}
                className="bg-white border border-slate-200 rounded-md p-4 sm:p-5 shadow-sm transition-all"
                data-testid={`group-${group.id}`}
              >
                {/* Accordion / FAQ Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={!isCollapsed}
                  aria-controls={`group-options-${group.id}`}
                  data-testid={`accordion-toggle-${group.id}`}
                  className={`w-full text-left flex flex-wrap items-center justify-between gap-2 cursor-pointer transition-colors ${!isCollapsed ? 'border-b border-slate-100 pb-3 mb-4' : ''
                    }`}
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-200/80 p-1 flex items-center justify-center shrink-0">
                      <IngredientIcon id={group.id} size="sm" alt={group.name} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">{group.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-medium transition-colors ${groupTotal > 0
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                        }`}
                    >
                      Selected: {groupTotal}
                    </span>
                    {isCollapsed && selectedItemsSummary && (
                      <span className="text-xs text-slate-500 font-normal italic truncate max-w-[200px] sm:max-w-xs">
                        ({selectedItemsSummary})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Group Limit Hint */}
                    <div className="text-xs text-slate-500 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-sm border border-slate-100">
                      <Info className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Limits:{' '}
                        {group.limits.min !== undefined ? `Min ${group.limits.min}` : 'Min 0'},{' '}
                        {effectiveMax !== undefined ? `Max ${effectiveMax}` : 'No max'}
                        {overrideLimits ? ' (Override active)' : ''}
                        {group.limits.step ? `, Step of ${group.limits.step}` : ''}
                        {group.limits.maxDistinct ? `, Max distinct ${group.limits.maxDistinct}` : ''}
                        {group.limits.maxPerOption ? `, Max/option ${group.limits.maxPerOption}` : ''}
                      </span>
                    </div>

                    {/* Chevron icon indicating expand/collapse state */}
                    <div className="text-slate-400 hover:text-slate-700 p-0.5 rounded">
                      {isCollapsed ? (
                        <ChevronDown className="w-5 h-5" aria-hidden="true" />
                      ) : (
                        <ChevronUp className="w-5 h-5" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Collapsible Options Grid */}
                {!isCollapsed && (
                  <div
                    id={`group-options-${group.id}`}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  >
                    {group.options.map((opt) => {
                      const currentSelected = config[opt.id] || 0;
                      const availableUnitsToAdd = calculateOptionRemaining(
                        opt.id,
                        currentAvailableStock,
                        optionLookup
                      );
                      const isStockDepleted = availableUnitsToAdd <= 0;

                      return (
                        <div
                          key={opt.id}
                          className={`border rounded-md p-3 transition-all flex flex-col justify-between ${currentSelected > 0
                            ? 'border-amber-400 bg-amber-50/40'
                            : isStockDepleted
                              ? 'border-slate-200 bg-slate-50/60 opacity-60'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          data-testid={`option-card-${opt.id}`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-200/60 p-1 flex items-center justify-center shrink-0">
                                  <IngredientIcon id={opt.id} size="sm" alt={opt.name} />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-semibold text-slate-900 text-sm block leading-tight truncate">
                                    {opt.name}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-xs inline-block mt-0.5">
                                    {opt.priceBDT === 0 ? 'Free' : `+${opt.priceBDT} BDT`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Ingredients usage and remaining units display */}
                            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 pt-1.5 border-t border-slate-100">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {opt.ingredients && Object.keys(opt.ingredients).length > 0 ? (
                                  Object.entries(opt.ingredients).map(([ing, amt]) => (
                                    <span
                                      key={ing}
                                      className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-medium px-1.5 py-0.5 rounded-sm"
                                    >
                                      <IngredientIcon id={ing} size="xs" alt={ing} className="w-3.5 h-3.5 inline-block" />
                                      <span>{amt} {ing}</span>
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400">Unlimited stock</span>
                                )}
                              </div>

                              <span
                                className={`font-medium shrink-0 ml-1.5 ${isStockDepleted
                                  ? 'text-rose-600 font-bold'
                                  : 'text-emerald-700'
                                  }`}
                              >
                                {availableUnitsToAdd === Infinity
                                  ? 'In Stock'
                                  : isStockDepleted
                                    ? 'Out of Stock'
                                    : `+${availableUnitsToAdd} available`}
                              </span>
                            </div>
                          </div>

                          {/* Stepper Controls */}
                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-500">
                              Qty: <strong className="text-slate-900">{currentSelected}</strong>
                            </span>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={currentSelected <= 0}
                                onClick={() => handleUpdateOption(opt.id, -1)}
                                aria-label={`Decrease ${opt.name}`}
                                className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                title="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>

                              <span
                                className="w-6 text-center text-sm font-bold text-slate-800"
                                data-testid={`qty-${opt.id}`}
                              >
                                {currentSelected}
                              </span>

                              <button
                                type="button"
                                disabled={isStockDepleted}
                                onClick={() => handleUpdateOption(opt.id, 1)}
                                aria-label={`Increase ${opt.name}`}
                                className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                title="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column / Mobile Fixed Bottom Dock:
          On mobile (< lg), docks fixed at bottom of screen so alerts & cart action are ALWAYS visible without scrolling.
          On desktop (>= lg), sits in sticky right column. */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-2xl p-3 lg:static lg:p-0 lg:bg-transparent lg:border-none lg:shadow-none lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20 lg:z-20 space-y-2 lg:space-y-3 max-h-[85vh] overflow-y-auto lg:max-h-none lg:overflow-visible">

        {/* Sticky Stock Depletion / Shortage Alert */}
        {!stockCheck.isValid && stockCheck.formattedMessage && (
          <div
            role="alert"
            className="bg-rose-50 border-l-4 border-rose-500 p-2.5 lg:p-3.5 rounded-r-md flex items-start gap-2 shadow-sm"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h4 className="font-bold text-rose-900 text-xs uppercase tracking-wide">
                Stock Limit Exceeded
              </h4>
              <p className="text-xs text-rose-700 font-semibold mt-0.5">
                {stockCheck.formattedMessage}
              </p>
              <p className="text-[11px] text-rose-600 mt-0.5 hidden sm:block">
                Reduce the quantity of options consuming short ingredients to proceed.
              </p>
            </div>
          </div>
        )}

        {/* Sticky Rules Engine Violations Banner */}
        {violations.length > 0 && (
          <div
            role="alert"
            className="bg-amber-50 border-l-4 border-amber-500 p-2.5 lg:p-3.5 rounded-r-md flex items-start gap-2 shadow-sm"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0 flex-1">
              <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wide">
                Rules Validation ({violations.length})
              </h4>
              <ul className="space-y-1 text-xs text-amber-800 max-h-24 lg:max-h-44 overflow-y-auto pr-1">
                {violations.map((v, i) => (
                  <li key={`${v.id}-${i}`} className="flex items-start gap-1.5 leading-snug">
                    <span className="font-mono text-[10px] uppercase bg-amber-200/70 text-amber-900 px-1 py-0.5 rounded-sm font-semibold shrink-0">
                      {v.id}
                    </span>
                    <span>{v.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Price Preview Card */}
        <div className="bg-white rounded-md shadow-md border border-slate-200 overflow-hidden">
          {/* Card Top Header (Desktop only) */}
          <div className="hidden lg:flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white rounded-t-md shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-xs">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Order Summary</h3>
                <p className="text-[11px] text-slate-400 font-normal">
                  {!hasSelections ? 'Base configuration' : 'Live price preview'}
                </p>
              </div>
            </div>

            {isPriceLoading ? (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-300 bg-slate-800/90 border border-slate-700 px-2.5 py-0.5 rounded-full shadow-xs">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                Updating
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300 bg-slate-800/90 border border-slate-700 px-2.5 py-0.5 rounded-full shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>

          {/* Pricing Details Container */}
          <div className="p-3 lg:p-5 space-y-2 lg:space-y-3.5">
            {/* Mobile Expand/Collapse Toggle for detailed breakdown */}
            <button
              type="button"
              onClick={() => setShowMobileBreakdown((prev) => !prev)}
              className="lg:hidden text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 w-full py-0.5"
            >
              <span>{showMobileBreakdown ? 'Hide price details' : 'Show price details'}</span>
              {showMobileBreakdown ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Detailed Itemized Rows (Always visible on desktop; expandable on mobile) */}
            <div className={`${showMobileBreakdown ? 'block' : 'hidden lg:block'} space-y-2.5 border-b border-slate-100 pb-2.5 lg:border-none lg:pb-0`}>
              <div className="flex items-center justify-between text-xs lg:text-sm text-slate-600">
                <span>Base Price</span>
                <span className="font-semibold text-slate-800">
                  {baseTotalBDT.toFixed(2)} BDT
                </span>
              </div>

              <div className="flex items-center justify-between text-xs lg:text-sm text-slate-600">
                <span>Selected Options</span>
                <span className="font-semibold text-slate-800">
                  {!pricing && isPriceLoading ? (
                    <span className="inline-block h-3.5 w-16 bg-slate-200 rounded animate-pulse align-middle" />
                  ) : (
                    `${optionsTotalBDT.toFixed(2)} BDT`
                  )}
                </span>
              </div>

              {/* Selected Ingredients Breakdown with Flaticon Icons */}
              {hasSelections && (
                <div className="bg-slate-50/80 rounded-md border border-slate-100 p-2 space-y-1.5 my-1 max-h-36 overflow-y-auto">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Selected Ingredients
                  </span>
                  {Object.entries(config)
                    .filter(([_, q]) => q > 0)
                    .map(([optId, q]) => {
                      const opt = optionLookup.get(optId);
                      if (!opt) return null;
                      return (
                        <div key={optId} className="flex items-center justify-between text-xs text-slate-700">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <IngredientIcon id={optId} size="xs" className="w-3.5 h-3.5" />
                            <span className="truncate">{q}× {opt.name}</span>
                          </div>
                          <span className="text-slate-500 font-medium shrink-0 ml-1.5 text-[11px]">
                            {opt.priceBDT === 0 ? 'Free' : `+${(opt.priceBDT * q).toFixed(2)} BDT`}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}

              <div className="border-t border-slate-100 my-1 lg:my-2" />

              <div className="flex items-center justify-between font-bold text-slate-900 text-xs lg:text-sm">
                <span>Subtotal</span>
                <span>
                  {!pricing && isPriceLoading ? (
                    <span className="inline-block h-4 w-20 bg-slate-200 rounded animate-pulse align-middle" />
                  ) : (
                    `${subtotalBDT.toFixed(2)} BDT`
                  )}
                </span>
              </div>

              {/* Extras Deal Discount */}
              {extrasDiscountBDT > 0 && (
                <div className="flex items-center justify-between text-xs lg:text-sm text-emerald-600 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Extras Discount
                  </span>
                  <span>-{extrasDiscountBDT.toFixed(2)} BDT</span>
                </div>
              )}

              {/* Combo Deal Discount */}
              {comboDiscountBDT > 0 && (
                <div className="flex items-center justify-between text-xs lg:text-sm text-emerald-600 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" /> Combo Discount
                  </span>
                  <span>-{comboDiscountBDT.toFixed(2)} BDT</span>
                </div>
              )}
            </div>

            {/* Error Notice */}
            {isPriceError && (
              <div className="bg-rose-50 border border-rose-200 rounded-md p-2 text-xs text-rose-700 flex items-center justify-between">
                <span>{priceErrorMessage || 'Calculation failed'}</span>
                <button
                  type="button"
                  onClick={retryPrice}
                  className="underline font-bold text-rose-800 hover:text-rose-950 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              </div>
            )}

            {/* Total Payable Box (Compact on mobile, centered box on desktop) */}
            <div className="bg-emerald-50/80 border border-emerald-100 rounded-md px-3 py-1.5 lg:py-2 text-center my-1 lg:my-2">
              <div className="flex items-center justify-between lg:block">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                  TOTAL PAYABLE
                </span>
                <div
                  className="text-xl lg:text-2xl font-extrabold text-emerald-600 tracking-tight"
                  data-testid="preview-unit-price"
                >
                  {pricing ? (
                    <span className={isPriceLoading ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
                      {totalPayableBDT.toFixed(2)} BDT
                    </span>
                  ) : isPriceLoading ? (
                    <span
                      data-testid="price-skeleton"
                      className="inline-block h-6 w-24 bg-emerald-200/70 rounded animate-pulse align-middle"
                    />
                  ) : !hasSelections ? (
                    <span>{baseTotalBDT.toFixed(2)} BDT</span>
                  ) : (
                    <span
                      data-testid="price-skeleton"
                      className="inline-block h-6 w-24 bg-emerald-200/70 rounded animate-pulse align-middle"
                    />
                  )}
                </div>
              </div>
              {pricing && qty > 1 ? (
                <span className="text-[11px] text-emerald-700/80 block mt-0.5 text-right lg:text-center">
                  (Unit: {pricing.finalUnitPriceBDT.toFixed(2)} BDT x {qty})
                </span>
              ) : !hasSelections ? (
                <span className="text-[11px] text-emerald-700/80 block mt-0.5 text-right lg:text-center font-medium">
                  (Base price{qty > 1 ? `: ${menu.basePriceBDT.toFixed(2)} BDT x ${qty}` : ''})
                </span>
              ) : null}
            </div>

            {/* Action Buttons */}
            {editingItem && onCancelEdit && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="w-full py-1.5 lg:py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50 transition"
              >
                Cancel Edit
              </button>
            )}

            <div className="flex items-stretch gap-2.5">
              {/* Item Qty Stepper */}
              <div className="flex items-center border border-slate-200 rounded-md bg-slate-50 px-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label="Decrease item quantity"
                  className="w-8 h-9 flex items-center justify-center rounded-sm text-slate-700 hover:bg-slate-200/70 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Decrease item quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span
                  className="w-7 text-center text-sm font-bold text-slate-900 select-none"
                  data-testid="item-qty"
                >
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(3, q + 1))}
                  disabled={qty >= 3}
                  aria-label="Increase item quantity"
                  className="w-8 h-9 flex items-center justify-center rounded-sm text-slate-700 hover:bg-slate-200/70 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Increase item quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add to Cart Primary Button */}
              <button
                type="button"
                disabled={isAddToCartDisabled}
                onClick={handleAddToCartClick}
                data-testid="add-to-cart-button"
                className={`flex-1 py-2.5 px-4 rounded-md font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition ${!isAddToCartDisabled
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer active:scale-[0.99]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
              >
                {editingItem ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>
            </div>

            {/* Footer Note */}
            <div className="hidden lg:flex flex-col items-center justify-center gap-0.5 text-center text-[11px] text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Prices are from live pricing engine</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Vector ingredient icons &amp; stock engine
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
