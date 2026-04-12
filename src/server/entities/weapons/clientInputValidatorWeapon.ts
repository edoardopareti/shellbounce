import {
  type ChargedBulletWeaponSetupInput,
  type LaserWhipWeaponSetupInput,
  type MachineGunWeaponSetupInput,
  type VolleyWeaponSetupInput,
  type WeaponSetupInput,
  type WeaponType,
} from '../../../shared/types.js';
import {
  DEFAULT_WEAPON_SETUP_BY_WEAPON,
  WEAPON_LIMITS,
} from '../../../shared/constants.js';

export interface WeaponConfigValidationResult {
  weaponSetup?: WeaponSetupInput;
  error?: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function checkRange(label: string, value: number, min: number, max: number): string | undefined {
  if (!Number.isFinite(value)) {
    return `Invalid weapon setup: ${label} must be a finite number.`;
  }

  if (value < min || value > max) {
    return `Invalid weapon setup: ${label} must be between ${min} and ${max}.`;
  }

  return undefined;
}

function isCommonSchema(candidate: Record<string, unknown>): boolean {
  return (
    isNumber(candidate.maxActiveBullets)
    && isNumber(candidate.normalShotCooldownMs)
    && isNumber(candidate.chargedShotCooldownMs)
  );
}

function validateCommonRangesForWeapon(
  weaponType: WeaponType,
  candidate: { maxActiveBullets: number; normalShotCooldownMs: number; chargedShotCooldownMs: number },
): string | undefined {
  const limits = WEAPON_LIMITS[weaponType];
  return (
    checkRange('maxActiveBullets', candidate.maxActiveBullets, limits.maxActiveBullets.min, limits.maxActiveBullets.max)
    ?? checkRange('normalShotCooldownMs', candidate.normalShotCooldownMs, limits.normalShotCooldownMs.min, limits.normalShotCooldownMs.max)
    ?? checkRange('chargedShotCooldownMs', candidate.chargedShotCooldownMs, limits.chargedShotCooldownMs.min, limits.chargedShotCooldownMs.max)
  );
}

function isNormalShotSchema(candidate: Record<string, unknown>): boolean {
  return (
    isNumber(candidate.speed)
    && isNumber(candidate.explosionRadius)
    && isNumber(candidate.maxBounces)
    && isBoolean(candidate.explodeOnWallImpact)
    && isBoolean(candidate.isCharged)
    && (candidate.radius === undefined || isNumber(candidate.radius))
    && (candidate.maxLifetimeMs === undefined || isNumber(candidate.maxLifetimeMs))
  );
}

function validateNormalShotRangesForWeapon(
  weaponType: WeaponType,
  candidate: {
    speed: number;
    explosionRadius: number;
    maxBounces: number;
    radius?: number;
    maxLifetimeMs?: number;
  },
): string | undefined {
  const limits = WEAPON_LIMITS[weaponType];
  return (
    checkRange('normalShot.speed', candidate.speed, limits.normalShotSpeed.min, limits.normalShotSpeed.max)
    ?? checkRange('normalShot.explosionRadius', candidate.explosionRadius, limits.normalShotExplosionRadius.min, limits.normalShotExplosionRadius.max)
    ?? checkRange('normalShot.maxBounces', candidate.maxBounces, limits.normalShotMaxBounces.min, limits.normalShotMaxBounces.max)
    ?? (candidate.radius === undefined
      ? undefined
      : checkRange('normalShot.radius', candidate.radius, limits.normalShotRadius.min, limits.normalShotRadius.max))
    ?? (candidate.maxLifetimeMs === undefined
      ? undefined
      : checkRange('normalShot.maxLifetimeMs', candidate.maxLifetimeMs, limits.normalShotMaxLifetimeMs.min, limits.normalShotMaxLifetimeMs.max))
  );
}

function isChargedShotSchema(candidate: Record<string, unknown>): boolean {
  return (
    isNumber(candidate.speedMultiplier)
    && isNumber(candidate.explosionRadiusMultiplier)
    && isNumber(candidate.maxBounces)
    && isBoolean(candidate.explodeOnWallImpact)
    && isBoolean(candidate.isCharged)
  );
}

function validateChargedShotRangesForWeapon(
  weaponType: WeaponType,
  candidate: { speedMultiplier: number; explosionRadiusMultiplier: number; maxBounces: number },
): string | undefined {
  const limits = WEAPON_LIMITS[weaponType];
  return (
    checkRange('chargedShot.speedMultiplier', candidate.speedMultiplier, limits.chargedSpeedMultiplier.min, limits.chargedSpeedMultiplier.max)
    ?? checkRange('chargedShot.explosionRadiusMultiplier', candidate.explosionRadiusMultiplier, limits.chargedExplosionRadiusMultiplier.min, limits.chargedExplosionRadiusMultiplier.max)
    ?? checkRange('chargedShot.maxBounces', candidate.maxBounces, limits.chargedMaxBounces.min, limits.chargedMaxBounces.max)
  );
}

export function isWeaponSetupSchema(weaponType: WeaponType, value: unknown): value is WeaponSetupInput {
  if (!isObject(value) || !isCommonSchema(value)) {
    return false;
  }

  if (weaponType === 'SimpleGun' || weaponType === 'MitosisGun') {
    const normalShot = value.normalShot;
    const chargedShot = value.chargedShot;
    return isObject(normalShot) && isNormalShotSchema(normalShot) && isObject(chargedShot) && isChargedShotSchema(chargedShot);
  }

  if (weaponType === 'MachineGun') {
    const bullet = value.bullet;
    return isObject(bullet) && isNormalShotSchema(bullet) && isNumber(value.holdToRapidFireMs);
  }

  if (weaponType === 'LaserWhipGun') {
    const normalShot = value.normalShot;
    const chargedShot = value.chargedShot;
    const whip = value.whip;
    return (
      isObject(normalShot)
      && isNumber(normalShot.speed)
      && isNumber(normalShot.explosionRadius)
      && isNumber(normalShot.maxBounces)
      && isNumber(normalShot.laserLength)
      && isNumber(normalShot.radius)
      && isNumber(normalShot.maxLifetimeMs)
      && isObject(chargedShot)
      && isNumber(chargedShot.speedMultiplier)
      && isNumber(chargedShot.maxBounces)
      && isBoolean(chargedShot.isCharged)
      && isObject(whip)
      && isNumber(whip.pullStepDistance)
    );
  }

  const normalShot = value.normalShot;
  const chargedShot = value.chargedShot;
  return (
    isObject(normalShot)
    && isNormalShotSchema(normalShot)
    && isObject(chargedShot)
    && isChargedShotSchema(chargedShot)
    && Array.isArray(value.volleyAngleOffsetsRadians)
    && value.volleyAngleOffsetsRadians.every((entry) => isNumber(entry))
    && isBoolean(value.requiresEmptyChamberToShoot)
    && (value.grappleArmedDetonationDelayMs === undefined || isNumber(value.grappleArmedDetonationDelayMs))
    && (value.grappleManualDetonationMinDelayMs === undefined || isNumber(value.grappleManualDetonationMinDelayMs))
  );
}

function validateChargedBulletRanges(weaponType: WeaponType, setup: ChargedBulletWeaponSetupInput): string | undefined {
  return (
    validateCommonRangesForWeapon(weaponType, setup)
    ?? validateNormalShotRangesForWeapon(weaponType, setup.normalShot)
    ?? validateChargedShotRangesForWeapon(weaponType, setup.chargedShot)
  );
}

function validateMachineGunRanges(weaponType: WeaponType, setup: MachineGunWeaponSetupInput): string | undefined {
  const limits = WEAPON_LIMITS.MachineGun;
  return (
    validateCommonRangesForWeapon(weaponType, setup)
    ?? validateNormalShotRangesForWeapon(weaponType, setup.bullet)
    ?? checkRange(
      'holdToRapidFireMs',
      setup.holdToRapidFireMs,
      limits.holdToRapidFireMs.min,
      limits.holdToRapidFireMs.max,
    )
  );
}

function validateLaserWhipRanges(weaponType: WeaponType, setup: LaserWhipWeaponSetupInput): string | undefined {
  const limits = WEAPON_LIMITS.LaserWhipGun;
  return (
    validateCommonRangesForWeapon(weaponType, setup)
    ?? checkRange('normalShot.speed', setup.normalShot.speed, limits.normalShotSpeed.min, limits.normalShotSpeed.max)
    ?? checkRange('normalShot.explosionRadius', setup.normalShot.explosionRadius, limits.normalShotExplosionRadius.min, limits.normalShotExplosionRadius.max)
    ?? checkRange('normalShot.maxBounces', setup.normalShot.maxBounces, limits.normalShotMaxBounces.min, limits.normalShotMaxBounces.max)
    ?? checkRange('normalShot.radius', setup.normalShot.radius, limits.normalShotRadius.min, limits.normalShotRadius.max)
    ?? checkRange('normalShot.maxLifetimeMs', setup.normalShot.maxLifetimeMs, limits.normalShotMaxLifetimeMs.min, limits.normalShotMaxLifetimeMs.max)
    ?? checkRange('chargedShot.speedMultiplier', setup.chargedShot.speedMultiplier, limits.chargedSpeedMultiplier.min, limits.chargedSpeedMultiplier.max)
    ?? checkRange('chargedShot.maxBounces', setup.chargedShot.maxBounces, limits.chargedMaxBounces.min, limits.chargedMaxBounces.max)
    ?? checkRange('normalShot.laserLength', setup.normalShot.laserLength, limits.normalShotLaserLength.min, limits.normalShotLaserLength.max)
    ?? checkRange('whip.pullStepDistance', setup.whip.pullStepDistance, limits.whipPullStepDistance.min, limits.whipPullStepDistance.max)
  );
}

function validateGrappleRanges(weaponType: WeaponType, setup: VolleyWeaponSetupInput): string | undefined {
  const limits = WEAPON_LIMITS.GrappleGun;
  const arrayLength = setup.volleyAngleOffsetsRadians.length;
  if (arrayLength < limits.volleyAngleOffsetsCount.min || arrayLength > limits.volleyAngleOffsetsCount.max) {
    return `Invalid weapon setup: volleyAngleOffsetsRadians must have between ${limits.volleyAngleOffsetsCount.min} and ${limits.volleyAngleOffsetsCount.max} entries.`;
  }

  for (const angleOffset of setup.volleyAngleOffsetsRadians) {
    const angleError = checkRange(
      'volleyAngleOffsetsRadians entry',
      angleOffset,
      limits.volleyAngleOffsetRadians.min,
      limits.volleyAngleOffsetRadians.max,
    );
    if (angleError !== undefined) {
      return angleError;
    }
  }

  return (
    validateChargedBulletRanges(weaponType, setup)
    ?? (setup.grappleArmedDetonationDelayMs === undefined
      ? undefined
      : checkRange(
        'grappleArmedDetonationDelayMs',
        setup.grappleArmedDetonationDelayMs,
        limits.grappleArmedDetonationDelayMs.min,
        limits.grappleArmedDetonationDelayMs.max,
      ))
    ?? (setup.grappleManualDetonationMinDelayMs === undefined
      ? undefined
      : checkRange(
        'grappleManualDetonationMinDelayMs',
        setup.grappleManualDetonationMinDelayMs,
        limits.grappleManualDetonationMinDelayMs.min,
        limits.grappleManualDetonationMinDelayMs.max,
      ))
  );
}

function cloneDefaultSetup(weaponType: WeaponType): WeaponSetupInput {
  if (weaponType === 'GrappleGun') {
    const defaults = DEFAULT_WEAPON_SETUP_BY_WEAPON.GrappleGun;
    return {
      ...defaults,
      normalShot: { ...defaults.normalShot },
      chargedShot: { ...defaults.chargedShot },
      volleyAngleOffsetsRadians: [...defaults.volleyAngleOffsetsRadians],
    };
  }

  if (weaponType === 'MachineGun') {
    const defaults = DEFAULT_WEAPON_SETUP_BY_WEAPON.MachineGun;
    return {
      ...defaults,
      bullet: { ...defaults.bullet },
    };
  }

  if (weaponType === 'LaserWhipGun') {
    const defaults = DEFAULT_WEAPON_SETUP_BY_WEAPON.LaserWhipGun;
    return {
      ...defaults,
      normalShot: { ...defaults.normalShot },
      chargedShot: { ...defaults.chargedShot },
      whip: { ...defaults.whip },
    };
  }

  if (weaponType === 'SimpleGun') {
    const defaults = DEFAULT_WEAPON_SETUP_BY_WEAPON.SimpleGun;
    return {
      ...defaults,
      normalShot: { ...defaults.normalShot },
      chargedShot: { ...defaults.chargedShot },
    };
  }

  const defaults = DEFAULT_WEAPON_SETUP_BY_WEAPON.MitosisGun;
  return {
    ...defaults,
    normalShot: { ...defaults.normalShot },
    chargedShot: { ...defaults.chargedShot },
  };
}

export function getValidatedWeaponSetupForJoin(
  weaponType: WeaponType,
  weaponSetup?: unknown,
): WeaponConfigValidationResult {
  if (weaponSetup === undefined) {
    return { weaponSetup: cloneDefaultSetup(weaponType) };
  }

  if (!isWeaponSetupSchema(weaponType, weaponSetup)) {
    return { error: `Invalid weapon setup schema for weapon type ${weaponType}.` };
  }

  if (weaponType === 'SimpleGun' || weaponType === 'MitosisGun') {
    const candidate = weaponSetup as ChargedBulletWeaponSetupInput;
    const error = validateChargedBulletRanges(weaponType, candidate);
    if (error !== undefined) {
      return { error };
    }

    return {
      weaponSetup: {
        ...candidate,
        normalShot: { ...candidate.normalShot },
        chargedShot: { ...candidate.chargedShot },
      },
    };
  }

  if (weaponType === 'MachineGun') {
    const candidate = weaponSetup as MachineGunWeaponSetupInput;
    const error = validateMachineGunRanges(weaponType, candidate);
    if (error !== undefined) {
      return { error };
    }

    return {
      weaponSetup: {
        ...candidate,
        bullet: { ...candidate.bullet },
      },
    };
  }

  if (weaponType === 'LaserWhipGun') {
    const candidate = weaponSetup as LaserWhipWeaponSetupInput;
    const error = validateLaserWhipRanges(weaponType, candidate);
    if (error !== undefined) {
      return { error };
    }

    return {
      weaponSetup: {
        ...candidate,
        normalShot: { ...candidate.normalShot },
        chargedShot: { ...candidate.chargedShot },
        whip: { ...candidate.whip },
      },
    };
  }

  const candidate = weaponSetup as VolleyWeaponSetupInput;
  const normalized: VolleyWeaponSetupInput = {
    ...candidate,
    normalShot: { ...candidate.normalShot },
    chargedShot: { ...candidate.chargedShot },
    volleyAngleOffsetsRadians: [...candidate.volleyAngleOffsetsRadians],
    grappleArmedDetonationDelayMs:
      candidate.grappleArmedDetonationDelayMs
      ?? DEFAULT_WEAPON_SETUP_BY_WEAPON.GrappleGun.grappleArmedDetonationDelayMs,
    grappleManualDetonationMinDelayMs:
      candidate.grappleManualDetonationMinDelayMs
      ?? DEFAULT_WEAPON_SETUP_BY_WEAPON.GrappleGun.grappleManualDetonationMinDelayMs,
  };

  const error = validateGrappleRanges(weaponType, normalized);
  if (error !== undefined) {
    return { error };
  }

  return { weaponSetup: normalized };
}
