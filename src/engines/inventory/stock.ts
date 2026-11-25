import { Group, OptionItem, CartLine, SelectedOptions } from '@/types';

// Builds an index of options by optionId for O(1) ingredient lookup.
export function buildOptionLookup(groups: Group[]): Map<string, OptionItem> {
  const map = new Map<string, OptionItem>();
  for (const group of groups) {
    for (const opt of group.options) {
      map.set(opt.id, opt);
    }
  }
  return map;
}

// Computes raw ingredient usage for a single configuration (1 unit).
export function calculateItemUsage(
  options: SelectedOptions,
  optionLookup: Map<string, OptionItem>
): Record<string, number> {
  const usage: Record<string, number> = {};

  for (const [optionId, qty] of Object.entries(options)) {
    if (qty <= 0) continue;
    const option = optionLookup.get(optionId);
    if (!option || !option.ingredients) continue;

    for (const [ingredient, amount] of Object.entries(option.ingredients)) {
      usage[ingredient] = (usage[ingredient] || 0) + amount * qty;
    }
  }

  return usage;
}

// Calculates total ingredient usage across cart items, optionally excluding one item for editing.
export function calculateTotalCartUsage(
  cart: CartLine[],
  optionLookup: Map<string, OptionItem>,
  excludeCartItemId?: string
): Record<string, number> {
  const totalUsage: Record<string, number> = {};

  for (const line of cart) {
    if (excludeCartItemId && line.id === excludeCartItemId) {
      continue;
    }
    const lineUsage = calculateItemUsage(line.options, optionLookup);
    for (const [ing, count] of Object.entries(lineUsage)) {
      totalUsage[ing] = (totalUsage[ing] || 0) + count * line.qty;
    }
  }

  return totalUsage;
}

// Computes remaining unreserved physical stock available for new items or edits.
export function calculateAvailableStock(
  totalStock: Record<string, number>,
  cart: CartLine[],
  optionLookup: Map<string, OptionItem>,
  excludeCartItemId?: string
): Record<string, number> {
  const cartUsage = calculateTotalCartUsage(cart, optionLookup, excludeCartItemId);
  const available: Record<string, number> = {};

  for (const [ing, total] of Object.entries(totalStock)) {
    const used = cartUsage[ing] || 0;
    available[ing] = Math.max(0, total - used);
  }

  return available;
}

// Checks how many additional units of an option can be made with current stock.
export function calculateOptionRemaining(
  optionId: string,
  availableStock: Record<string, number>,
  optionLookup: Map<string, OptionItem>
): number {
  const option = optionLookup.get(optionId);
  if (!option || !option.ingredients || Object.keys(option.ingredients).length === 0) {
    // Options that consume no stock (e.g. ketchup, chili) are unlimited
    return Infinity;
  }

  let minUnits = Infinity;
  for (const [ingredient, requiredPerUnit] of Object.entries(option.ingredients)) {
    if (requiredPerUnit <= 0) continue;
    const available = availableStock[ingredient] ?? 0;
    const canAdd = Math.floor(available / requiredPerUnit);
    if (canAdd < minUnits) {
      minUnits = canAdd;
    }
  }

  return minUnits === Infinity ? 0 : minUnits;
}

export interface StockCheckResult {
  isValid: boolean;
  shortages: string[];
  formattedMessage?: string;
  missingByIngredient: Record<string, number>;
}


// Checks if the requested quantity can be reserved with available stock and lists any shortages with exact missing quantities.
export function checkStockForConfig(
  config: SelectedOptions,
  qty: number,
  availableStock: Record<string, number>,
  optionLookup: Map<string, OptionItem>
): StockCheckResult {
  const unitUsage = calculateItemUsage(config, optionLookup);
  const shortages: string[] = [];
  const missingByIngredient: Record<string, number> = {};
  let isValid = true;

  for (const [ingredient, requiredPerUnit] of Object.entries(unitUsage)) {
    const totalRequired = requiredPerUnit * qty;
    const available = availableStock[ingredient] ?? 0;

    if (totalRequired > available) {
      isValid = false;
      const missing = totalRequired - available;
      missingByIngredient[ingredient] = missing;
      shortages.push(`${missing} ${ingredient}`);
    }
  }

  const formattedMessage =
    shortages.length > 0 ? `Short: ${shortages.join(', ')}` : undefined;

  return {
    isValid,
    shortages,
    formattedMessage,
    missingByIngredient,
  };
}
