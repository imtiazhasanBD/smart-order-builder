import {
  Group,
  GroupLimits,
  CrossGroupRule,
  SelectedOptions,
  Violation,
} from '@/types';

export function validate(
  config: SelectedOptions,
  groups: Group[],
  rules: CrossGroupRule[]
): Violation[] {
  const violations: Violation[] = [];

  // 1. Identify active override rules triggered by currently selected options
  const activeOverrides: Array<{
    ruleId: string;
    targetGroupId: string;
    limits: Partial<GroupLimits>;
    message?: string;
  }> = [];

  for (const rule of rules) {
    if (rule.type === 'overrideLimit') {
      const isTriggerSelected = (config[rule.optionId] || 0) > 0;
      if (isTriggerSelected) {
        activeOverrides.push({
          ruleId: rule.id,
          targetGroupId: rule.targetGroupId,
          limits: rule.limits,
          message: rule.message,
        });
      }
    }
  }

  // 2. Validate group limits
  for (const group of groups) {
    const override = activeOverrides.find((o) => o.targetGroupId === group.id);
    const effectiveLimits: GroupLimits = {
      ...group.limits,
      ...(override?.limits || {}),
    };

    let totalUnits = 0;
    let distinctCount = 0;

    for (const opt of group.options) {
      const qty = config[opt.id] || 0;
      if (qty > 0) {
        totalUnits += qty;
        distinctCount += 1;

        // Check maxPerOption
        if (
          effectiveLimits.maxPerOption !== undefined &&
          qty > effectiveLimits.maxPerOption
        ) {
          violations.push({
            id: group.id,
            message: `${opt.name} cannot exceed ${effectiveLimits.maxPerOption} per item`,
          });
        }
      }
    }

    const { min, max, step, maxDistinct } = effectiveLimits;

    // Combined bounds and step check (e.g. Eggs: min 2, max 6, step 2)
    if (min !== undefined && max !== undefined && step !== undefined) {
      if (totalUnits < min || totalUnits > max || totalUnits % step !== 0) {
        violations.push({
          id: group.id,
          message: `${group.name.toLowerCase()} total must be ${min}-${max} in steps of ${step}`,
        });
      }
    } else {
      // Individual min check
      if (min !== undefined && totalUnits < min) {
        violations.push({
          id: group.id,
          message: `${group.name} requires at least ${min} item(s)`,
        });
      }

      // Individual max check
      if (max !== undefined && totalUnits > max) {
        if (override && override.limits.max !== undefined && override.limits.max === max) {
          violations.push({
            id: override.ruleId,
            message:
              override.message ||
              `${group.name} max is ${max} when override is active`,
          });
        } else {
          violations.push({
            id: group.id,
            message: `${group.name} allows at most ${max} item(s)`,
          });
        }
      }

      // Individual step check
      if (step !== undefined && totalUnits > 0 && totalUnits % step !== 0) {
        violations.push({
          id: group.id,
          message: `${group.name} total must be a multiple of ${step}`,
        });
      }
    }

    // Check maxDistinct
    if (maxDistinct !== undefined && distinctCount > maxDistinct) {
      violations.push({
        id: group.id,
        message: `${group.name} allows at most ${maxDistinct} distinct option(s)`,
      });
    }
  }

  // 3. Evaluate cross-group rules: requires & excludes
  for (const rule of rules) {
    if (rule.type === 'requires') {
      const isSourceSelected = (config[rule.optionId] || 0) > 0;
      if (isSourceSelected) {
        const hasRequired = rule.requiredAnyOf.some(
          (reqId) => (config[reqId] || 0) > 0
        );
        if (!hasRequired) {
          violations.push({
            id: rule.id,
            message:
              rule.message ||
              `Option ${rule.optionId} requires at least one of [${rule.requiredAnyOf.join(', ')}]`,
          });
        }
      }
    } else if (rule.type === 'excludes') {
      const isSourceSelected = (config[rule.optionId] || 0) > 0;
      if (isSourceSelected) {
        const hasExcluded = rule.excludedOptions.some(
          (exId) => (config[exId] || 0) > 0
        );
        if (hasExcluded) {
          violations.push({
            id: rule.id,
            message:
              rule.message ||
              `Option ${rule.optionId} cannot be combined with [${rule.excludedOptions.join(', ')}]`,
          });
        }
      }
    }
  }

  return violations;
}
