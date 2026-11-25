import { describe, it, expect } from 'vitest';
import { fetchMenu, fetchServerTime } from '@/services/api';
import { SERVER_OFFSET_MS } from '@/mocks/serverStore';

describe('Step 01 - Mock API & Menu Fixture Contracts', () => {
  it('serves the complete Appendix A menu fixture from /api/menu', async () => {
    const data = await fetchMenu();

    expect(data.productId).toBe('breakfast-builder');
    expect(data.productName).toBe('Build Your Breakfast');
    expect(data.basePriceBDT).toBe(250);
    expect(data.basePricePoisha).toBe(25000);

    // Verify groups
    const groupIds = data.groups.map((g) => g.id);
    expect(groupIds).toEqual(['bread', 'eggs', 'protein', 'extras', 'sauce']);

    // Bread options
    const bread = data.groups.find((g) => g.id === 'bread');
    expect(bread?.limits).toEqual({ min: 1, max: 1 });
    expect(bread?.options.map((o) => o.id)).toEqual(['toast', 'paratha', 'croissant']);

    // Eggs options & limits (step 2)
    const eggs = data.groups.find((g) => g.id === 'eggs');
    expect(eggs?.limits).toEqual({ min: 2, max: 6, step: 2 });
    expect(eggs?.options.map((o) => o.id)).toEqual(['fried', 'scrambled', 'omelette']);

    // Cross-group rules R1 through R4
    expect(data.rules).toHaveLength(4);
    expect(data.rules.map((r) => r.id)).toEqual(['R1', 'R2', 'R3', 'R4']);

    const r1 = data.rules.find((r) => r.id === 'R1');
    expect(r1).toMatchObject({
      type: 'requires',
      optionId: 'hollandaise',
      requiredAnyOf: ['scrambled', 'omelette'],
    });

    const r3 = data.rules.find((r) => r.id === 'R3');
    expect(r3).toMatchObject({
      type: 'overrideLimit',
      optionId: 'croissant',
      targetGroupId: 'extras',
      limits: { max: 2 },
    });

    // Promotions
    expect(data.promotions.unitExtras.id).toBe('P2');
    expect(data.promotions.unitCombo.id).toBe('P1');
    expect(data.promotions.cartThreshold.id).toBe('C1');
    expect(data.promotions.cartCoupon.id).toBe('C2');

    // Ingredient initial stock
    expect(data.ingredientStock).toEqual({
      egg: 10,
      sausage: 4,
      bacon: 3,
      tofu: 5,
      croissant: 2,
      paratha: 10,
      toast: 20,
      hashbrown: 6,
      mushroom: 6,
      beans: 8,
      cheese: 4,
      hollandaise: 5,
    });
  });

  it('serves authoritative serverTime with ~90-second forward offset', async () => {
    const beforeCall = Date.now();
    const timeData = await fetchServerTime();
    const afterCall = Date.now();

    expect(timeData.serverOffsetMs).toBe(SERVER_OFFSET_MS);

    const serverTimestampMs = new Date(timeData.serverTime).getTime();
    const expectedMinMs = beforeCall + SERVER_OFFSET_MS;
    const expectedMaxMs = afterCall + SERVER_OFFSET_MS;

    expect(serverTimestampMs).toBeGreaterThanOrEqual(expectedMinMs - 100);
    expect(serverTimestampMs).toBeLessThanOrEqual(expectedMaxMs + 100);
  });
});
