import { describe, it, expect } from 'vitest';
import { validate } from '@/engines/validation';
import { MENU_FIXTURE } from '@/mocks/data/menu';

describe('Part A - Rules Engine (TC-01 to TC-04 & Edge Cases)', () => {
  const groups = MENU_FIXTURE.groups;
  const rules = MENU_FIXTURE.rules;

  it('TC-01: Scrambled x3 (plus valid bread/protein) is blocked because eggs must be in steps of 2', () => {
    const config = {
      toast: 1,
      scrambled: 3,
      sausage: 1,
    };

    const violations = validate(config, groups, rules);
    expect(violations.length).toBeGreaterThan(0);

    const eggViolation = violations.find((v) => v.id === 'eggs');
    expect(eggViolation).toBeDefined();
    expect(eggViolation?.message).toContain('eggs total must be 2-6 in steps of 2');
  });

  it('TC-02: Croissant + 3 extras is blocked because extras max is 2 when Croissant is selected (override wins)', () => {
    const config = {
      croissant: 1,
      scrambled: 2,
      sausage: 1,
      hashbrown: 1,
      mushroom: 1,
      beans: 1, // 3 extras
    };

    const violations = validate(config, groups, rules);
    const overrideViolation = violations.find((v) => v.id === 'R3');
    expect(overrideViolation).toBeDefined();
    expect(overrideViolation?.message).toContain('extras max is 2 when Croissant is selected');
  });

  it('allows Croissant + 2 extras (exact override upper limit)', () => {
    const config = {
      croissant: 1,
      scrambled: 2,
      sausage: 1,
      hashbrown: 1,
      mushroom: 1, // 2 extras
    };

    const violations = validate(config, groups, rules);
    expect(violations).toHaveLength(0);
  });

  it('TC-03: Hollandaise with only Fried eggs is blocked because Hollandaise requires Scrambled or Omelette', () => {
    const config = {
      toast: 1,
      fried: 2,
      sausage: 1,
      hollandaise: 1,
    };

    const violations = validate(config, groups, rules);
    const r1Violation = violations.find((v) => v.id === 'R1');
    expect(r1Violation).toBeDefined();
    expect(r1Violation?.message).toContain('Hollandaise requires Scrambled or Omelette');
  });

  it('allows Hollandaise with Scrambled or Omelette', () => {
    const withScrambled = {
      toast: 1,
      scrambled: 2,
      sausage: 1,
      hollandaise: 1,
    };
    expect(validate(withScrambled, groups, rules)).toHaveLength(0);

    const withOmelette = {
      toast: 1,
      omelette: 2,
      sausage: 1,
      hollandaise: 1,
    };
    expect(validate(withOmelette, groups, rules)).toHaveLength(0);
  });

  it('TC-04: Tofu + Beef Bacon AND Chili + Hollandaise lists both violations when both exist', () => {
    const config = {
      toast: 1,
      scrambled: 2,
      tofu: 1,
      bacon: 1, // Violates R2 (Tofu excludes Bacon)
      hollandaise: 1,
      chili: 1, // Violates R4 (Chili excludes Hollandaise)
    };

    const violations = validate(config, groups, rules);
    expect(violations.length).toBeGreaterThanOrEqual(2);

    const r2Violation = violations.find((v) => v.id === 'R2');
    const r4Violation = violations.find((v) => v.id === 'R4');

    expect(r2Violation).toBeDefined();
    expect(r2Violation?.message).toContain('Tofu cannot be combined with Chicken Sausage or Beef Bacon');

    expect(r4Violation).toBeDefined();
    expect(r4Violation?.message).toContain('Chili cannot be combined with Hollandaise');
  });

  it('validates canonical items A, B, and C without violations', () => {
    // Item A: Toast, Scrambled x2, Chicken Sausage x1, Ketchup
    const itemA = { toast: 1, scrambled: 2, sausage: 1, ketchup: 1 };
    expect(validate(itemA, groups, rules)).toHaveLength(0);

    // Item B: Croissant, Omelette x2, Fried x2, Chicken Sausage x1, Beef Bacon x1, Hash Brown x1, Mushroom x1, Hollandaise
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
    expect(validate(itemB, groups, rules)).toHaveLength(0);

    // Item C: Paratha, Fried x2, Tofu x1, Cheese x2, Baked Beans x1, Mushroom x1, Chili
    const itemC = {
      paratha: 1,
      fried: 2,
      tofu: 1,
      cheese: 2,
      beans: 1,
      mushroom: 1,
      chili: 1,
    };
    expect(validate(itemC, groups, rules)).toHaveLength(0);
  });

  it('enforces maxDistinct and maxPerOption on Sauce group', () => {
    // maxPerOption on Sauce is 1
    const configPerOption = {
      toast: 1,
      scrambled: 2,
      sausage: 1,
      ketchup: 2, // Violates maxPerOption: 1
    };
    const perOptionViolations = validate(configPerOption, groups, rules);
    expect(perOptionViolations.some((v) => v.message.includes('cannot exceed 1'))).toBe(true);

    // maxDistinct on Sauce is 2
    const configDistinct = {
      toast: 1,
      scrambled: 2,
      sausage: 1,
      ketchup: 1,
      hollandaise: 1,
      chili: 1, // 3 distinct sauces, also chili+hollandaise triggers R4
    };
    const distinctViolations = validate(configDistinct, groups, rules);
    expect(distinctViolations.some((v) => v.message.includes('allows at most 2 distinct'))).toBe(true);
  });

  it('reports missing required groups for empty configuration', () => {
    const emptyConfig = {};
    const violations = validate(emptyConfig, groups, rules);

    const groupIds = violations.map((v) => v.id);
    expect(groupIds).toContain('bread');
    expect(groupIds).toContain('eggs');
    expect(groupIds).toContain('protein');
  });
});
