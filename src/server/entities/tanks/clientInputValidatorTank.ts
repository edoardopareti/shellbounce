import type { TankSetupInput, TankType } from '../../../shared/types.js';
import { TANK_LIMITS } from '../../../shared/constants.js';
import { getDefaultTankConfigByType } from './tankFactory.js';
import type { TankConfig } from './tank.js';


// Type guard for TankSetupInput schema
export function isTankSetupSchema(value: unknown): value is TankSetupInput {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<TankSetupInput>;
  return (
    typeof candidate.moveSpeed === 'number'
    && typeof candidate.rotationSpeedPiFactor === 'number'
    && typeof candidate.boostMultiplier === 'number'
    && typeof candidate.boostDurationMs === 'number'
  );
}
interface RangeRule {
  min: number;
  max: number;
  label: string;
}

function getRangeRules(tankType: TankType): Record<keyof TankSetupInput, RangeRule> {
  const limits = TANK_LIMITS[tankType];
  return {
    moveSpeed: { ...limits.moveSpeed, label: 'moveSpeed' },
    rotationSpeedPiFactor: { ...limits.rotationSpeedPiFactor, label: 'rotationSpeedPiFactor' },
    boostMultiplier: { ...limits.boostMultiplier, label: 'boostMultiplier' },
    boostDurationMs: { ...limits.boostDurationMs, label: 'boostDurationMs' },
  };
}

export interface TankConfigValidationResult {
  tankConfig?: TankConfig;
  error?: string;
}

export function getValidatedTankConfigForJoin(
  tankType: TankType,
  tankSetup?: TankSetupInput,
): TankConfigValidationResult {
  const baseConfig = getDefaultTankConfigByType(tankType);
  const rangeRules = getRangeRules(tankType);
  if (tankSetup === undefined) {
    return { tankConfig: baseConfig };
  }

  for (const field of Object.keys(rangeRules) as Array<keyof TankSetupInput>) {
    const rule = rangeRules[field];
    const value = tankSetup[field];
    if (!Number.isFinite(value)) {
      return { error: `Invalid tank setup: ${rule.label} must be a finite number.` };
    }

    if (value < rule.min || value > rule.max) {
      return {
        error: `Invalid tank setup: ${rule.label} must be between ${rule.min} and ${rule.max}.`,
      };
    }
  }

  const moveSpeed = tankSetup.moveSpeed;
  const validatedTankConfig: TankConfig = {
    radius: baseConfig.radius,
    moveSpeed,
    reverseSpeed: moveSpeed * 0.75,
    rotationSpeed: Math.PI * tankSetup.rotationSpeedPiFactor,
    muzzleOffset: baseConfig.muzzleOffset,
    boostMultiplier: tankSetup.boostMultiplier,
    boostDurationMs: tankSetup.boostDurationMs,
    boostCooldownMs: baseConfig.boostCooldownMs,
  };

  return { tankConfig: validatedTankConfig };
}
