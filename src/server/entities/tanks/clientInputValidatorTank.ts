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
import type { TankSetupInput, TankType } from '../../../shared/types.js';
import {
  BOOST_DURATION_MS_LIMITS,
  BOOST_MULTIPLIER_LIMITS,
  MOVE_SPEED_LIMITS,
  ROTATION_SPEED_PI_FACTOR_LIMITS,
} from '../../../shared/tankSetupConfig.js';
import { getDefaultTankConfigByType } from './tankFactory.js';
import type { TankConfig } from './tank.js';

interface RangeRule {
  min: number;
  max: number;
  label: string;
}

const RANGE_RULES: Record<keyof TankSetupInput, RangeRule> = {
  moveSpeed: { ...MOVE_SPEED_LIMITS, label: 'moveSpeed' },
  rotationSpeedPiFactor: { ...ROTATION_SPEED_PI_FACTOR_LIMITS, label: 'rotationSpeedPiFactor' },
  boostMultiplier: { ...BOOST_MULTIPLIER_LIMITS, label: 'boostMultiplier' },
  boostDurationMs: { ...BOOST_DURATION_MS_LIMITS, label: 'boostDurationMs' },
};

export interface TankConfigValidationResult {
  tankConfig?: TankConfig;
  error?: string;
}

export function getValidatedTankConfigForJoin(
  tankType: TankType,
  tankSetup?: TankSetupInput,
): TankConfigValidationResult {
  const baseConfig = getDefaultTankConfigByType(tankType);
  if (tankSetup === undefined) {
    return { tankConfig: baseConfig };
  }

  for (const field of Object.keys(RANGE_RULES) as Array<keyof TankSetupInput>) {
    const rule = RANGE_RULES[field];
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
