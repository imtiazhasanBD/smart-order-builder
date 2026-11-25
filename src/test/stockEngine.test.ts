import { describe, it, expect } from 'vitest';
import {
  buildOptionLookup,
  calculateItemUsage,
  calculateAvailableStock,
  calculateOptionRemaining,
  checkStockForConfig,
} from '@/engines/inventory';
import { MENU_FIXTURE } from '@/mocks/data/menu';
import { CartLine } from '@/types';

describe('Part B - Shared Stock Engine (TC-08 to TC-11 & Q1)', () => {
  const optionLookup = buildOptionLookup(MENU_FIXTURE.groups);
  const initialStock = MENU_FIXTURE.ingredientStock;

  // Item Definitions from Appendix A / Section 9:
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

  it('calculates correct single item usage for B and C', () => {
    // B: 1 croissant, 2 omelette (4 eggs), 2 fried (2 eggs), 1 sausage, 1 bacon, 1 hashbrown, 1 mushroom, 1 hollandaise
    // Total eggs for B = 4 + 2 = 6 eggs
    const usageB = calculateItemUsage(itemB, optionLookup);
    expect(usageB).toEqual({
      croissant: 1,
      egg: 6,
      sausage: 1,
      bacon: 1,
      hashbrown: 1,
      mushroom: 1,
      hollandaise: 1,
    });

    // C: 1 paratha, 2 fried (2 eggs), 1 tofu, 2 cheese, 1 beans, 1 mushroom, 0 chili
    const usageC = calculateItemUsage(itemC, optionLookup);
    expect(usageC).toEqual({
      paratha: 1,
      egg: 2,
      tofu: 1,
      cheese: 2,
      beans: 1,
      mushroom: 1,
    });
  });

  it('TC-08: Cart B x1 + C x2 results in remaining stock: egg 0, cheese 0, croissant 1; blocks items needing eggs', () => {
    const cart: CartLine[] = [
      { id: 'line-B', qty: 1, options: itemB },
      { id: 'line-C', qty: 2, options: itemC },
    ];

    const available = calculateAvailableStock(initialStock, cart, optionLookup);

    expect(available.egg).toBe(0);
    expect(available.cheese).toBe(0);
    expect(available.croissant).toBe(1);

    // Any new item needing eggs is blocked
    const newConfigNeedingEggs = { toast: 1, fried: 2, sausage: 1 };
    const check = checkStockForConfig(newConfigNeedingEggs, 1, available, optionLookup);

    expect(check.isValid).toBe(false);
    expect(check.formattedMessage).toBe('Short: 2 egg');
  });

  it("TC-09: In that cart, edit B to Omelette x3 + Fried x1 is blocked with 'Short: 1 egg' (B's own 6 eggs counted as available)", () => {
    const cart: CartLine[] = [
      { id: 'line-B', qty: 1, options: itemB },
      { id: 'line-C', qty: 2, options: itemC },
    ];

    // Net-difference editing: exclude line-B from held stock to calculate stock available for B
    const availableForB = calculateAvailableStock(initialStock, cart, optionLookup, 'line-B');

    // Total eggs in stock: 10. Line C (qty 2) uses 4 eggs. Available for B = 6 eggs.
    expect(availableForB.egg).toBe(6);

    // New configuration: Omelette x3 (6 eggs) + Fried x1 (1 egg) = 7 eggs
    const newB = {
      ...itemB,
      omelette: 3,
      fried: 1,
    };

    const check = checkStockForConfig(newB, 1, availableForB, optionLookup);
    expect(check.isValid).toBe(false);
    expect(check.formattedMessage).toBe('Short: 1 egg');
  });

  it('TC-10: In that cart, edit B to Omelette x1 + Fried x3 is allowed and egg remaining becomes 1', () => {
    const cart: CartLine[] = [
      { id: 'line-B', qty: 1, options: itemB },
      { id: 'line-C', qty: 2, options: itemC },
    ];

    const availableForB = calculateAvailableStock(initialStock, cart, optionLookup, 'line-B');

    // New configuration: Omelette x1 (2 eggs) + Fried x3 (3 eggs) = 5 eggs
    const newB = {
      ...itemB,
      omelette: 1,
      fried: 3,
    };

    const check = checkStockForConfig(newB, 1, availableForB, optionLookup);
    expect(check.isValid).toBe(true);

    // Update cart with edited B and verify new remaining stock
    const updatedCart: CartLine[] = [
      { id: 'line-B', qty: 1, options: newB },
      { id: 'line-C', qty: 2, options: itemC },
    ];

    const newAvailable = calculateAvailableStock(initialStock, updatedCart, optionLookup);
    // 10 total - (5 used by B + 4 used by C) = 1 egg remaining
    expect(newAvailable.egg).toBe(1);
  });

  it("TC-11: In that cart, change C quantity 2 -> 3 is blocked with 'Short: 2 egg, 2 cheese'", () => {
    const cart: CartLine[] = [
      { id: 'line-B', qty: 1, options: itemB },
      { id: 'line-C', qty: 2, options: itemC },
    ];

    // Net-difference editing for line-C:
    const availableForC = calculateAvailableStock(initialStock, cart, optionLookup, 'line-C');

    // Total stock: egg 10, cheese 4.
    // Line B uses: egg 6, cheese 0.
    // Available for line C: egg = 4, cheese = 4.
    expect(availableForC.egg).toBe(4);
    expect(availableForC.cheese).toBe(4);

    // Qty 3 of C requires: egg = 2 * 3 = 6; cheese = 2 * 3 = 6.
    const check = checkStockForConfig(itemC, 3, availableForC, optionLookup);
    expect(check.isValid).toBe(false);
    expect(check.formattedMessage).toBe('Short: 2 egg, 2 cheese');
  });

  it('Q1: Verifies starting from empty cart, max number of item C is 2, limited by Cheese', () => {
    const emptyCart: CartLine[] = [];
    const available = calculateAvailableStock(initialStock, emptyCart, optionLookup);

    // Check adding 1 unit of C
    const check1 = checkStockForConfig(itemC, 1, available, optionLookup);
    expect(check1.isValid).toBe(true);

    // Check adding 2 units of C
    const check2 = checkStockForConfig(itemC, 2, available, optionLookup);
    expect(check2.isValid).toBe(true);

    // Check adding 3 units of C
    const check3 = checkStockForConfig(itemC, 3, available, optionLookup);
    expect(check3.isValid).toBe(false);
    // Cheese stock = 4. C uses 2 cheese per unit. 3 units need 6 cheese (short 2).
    // Egg stock = 10. C uses 2 eggs per unit. 3 units need 6 eggs (not short on eggs alone, but 3 units need 6 eggs vs 10 available, wait: 6 <= 10 is valid for eggs!)
    expect(check3.shortages).toContain('2 cheese');
    expect(check3.missingByIngredient.cheese).toBe(2);
  });

  it('correctly reports option remaining units and infinity for unlimited sauce', () => {
    const emptyCart: CartLine[] = [];
    const available = calculateAvailableStock(initialStock, emptyCart, optionLookup);

    // Toast stock = 20 -> remaining = 20
    expect(calculateOptionRemaining('toast', available, optionLookup)).toBe(20);

    // Croissant stock = 2 -> remaining = 2
    expect(calculateOptionRemaining('croissant', available, optionLookup)).toBe(2);

    // Omelette uses 2 eggs. Egg stock = 10 -> remaining = floor(10 / 2) = 5
    expect(calculateOptionRemaining('omelette', available, optionLookup)).toBe(5);

    // Ketchup & Chili consume no stock -> Infinity
    expect(calculateOptionRemaining('ketchup', available, optionLookup)).toBe(Infinity);
    expect(calculateOptionRemaining('chili', available, optionLookup)).toBe(Infinity);
  });
});
