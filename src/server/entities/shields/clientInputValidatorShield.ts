import { DEFAULT_SHIELD_SETUP_BY_SHIELD, SHIELD_LIMITS } from '../../../shared/constants.js';
import type {
  OmniDirShieldSetupInput,
  ShieldSetupInput,
  ShieldSetupInputByShieldType,
  ShieldType,
  StandardShieldSetupInput,
} from '../../../shared/types.js';

export interface ShieldSetupValidationResult {
  shieldSetup?: ShieldSetupInput;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function checkRange(name: string, value: number, min: number, max: number): string | undefined {
  if (value < min || value > max) {
    return `Invalid shield setup: ${name} must be between ${min} and ${max}.`;
  }

  return undefined;
}

export function isShieldSetupSchema(shieldType: ShieldType, value: unknown): value is ShieldSetupInput {
  if (!isRecord(value)) {
    return false;
  }

  if (!isFiniteNumber(value.radius) || !isFiniteNumber(value.cooldownMs) || !isFiniteNumber(value.overchargeMs)) {
    return false;
  }

  if (shieldType === 'StandardShield') {
    return isFiniteNumber(value.forwardOffset) && isFiniteNumber(value.sectorAngleRadians);
  }

  return true;
}

function cloneDefaultShieldSetup<T extends ShieldType>(shieldType: T): ShieldSetupInputByShieldType[T] {
  if (shieldType === 'StandardShield') {
    return { ...DEFAULT_SHIELD_SETUP_BY_SHIELD.StandardShield } as ShieldSetupInputByShieldType[T];
  }

  return { ...DEFAULT_SHIELD_SETUP_BY_SHIELD.OmniDirShield } as ShieldSetupInputByShieldType[T];
}

function validateStandardShieldSetup(setup: StandardShieldSetupInput): string | undefined {
  const limits = SHIELD_LIMITS.StandardShield;
  return (
    checkRange('radius', setup.radius, limits.radius.min, limits.radius.max)
    ?? checkRange('forwardOffset', setup.forwardOffset, limits.forwardOffset.min, limits.forwardOffset.max)
    ?? checkRange('sectorAngleRadians', setup.sectorAngleRadians, limits.sectorAngleRadians.min, limits.sectorAngleRadians.max)
    ?? checkRange('cooldownMs', setup.cooldownMs, limits.cooldownMs.min, limits.cooldownMs.max)
    ?? checkRange('overchargeMs', setup.overchargeMs, limits.overchargeMs.min, limits.overchargeMs.max)
  );
}

function validateOmniShieldSetup(setup: OmniDirShieldSetupInput): string | undefined {
  const limits = SHIELD_LIMITS.OmniDirShield;
  return (
    checkRange('radius', setup.radius, limits.radius.min, limits.radius.max)
    ?? checkRange('cooldownMs', setup.cooldownMs, limits.cooldownMs.min, limits.cooldownMs.max)
    ?? checkRange('overchargeMs', setup.overchargeMs, limits.overchargeMs.min, limits.overchargeMs.max)
  );
}

export function getValidatedShieldSetupForJoin(
  shieldType: ShieldType,
  shieldSetup?: ShieldSetupInput,
) : ShieldSetupValidationResult {
  const baseSetup = cloneDefaultShieldSetup(shieldType);
  const setup = (shieldSetup ?? baseSetup) as ShieldSetupInput;

  if (shieldType === 'StandardShield') {
    const candidate = setup as StandardShieldSetupInput;
    const error = validateStandardShieldSetup(candidate);
    if (error !== undefined) {
      return { error };
    }

    return { shieldSetup: candidate };
  }

  const candidate = setup as OmniDirShieldSetupInput;
  const error = validateOmniShieldSetup(candidate);
  if (error !== undefined) {
    return { error };
  }

  return { shieldSetup: candidate };
}
