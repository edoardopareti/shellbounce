import type { WeaponType } from './types';

export interface WeaponSetupRange {
  min: number;
  max: number;
}

export interface WeaponCommonLimits {
  maxActiveBullets: WeaponSetupRange;
  normalShotCooldownMs: WeaponSetupRange;
  chargedShotCooldownMs: WeaponSetupRange;
}

export interface ChargedBulletLimits {
  normalShotSpeed: WeaponSetupRange;
  normalShotExplosionRadius: WeaponSetupRange;
  normalShotMaxBounces: WeaponSetupRange;
  normalShotRadius: WeaponSetupRange;
  normalShotMaxLifetimeMs: WeaponSetupRange;
  chargedSpeedMultiplier: WeaponSetupRange;
  chargedExplosionRadiusMultiplier: WeaponSetupRange;
  chargedMaxBounces: WeaponSetupRange;
}

export const WEAPON_COMMON_LIMITS: Record<WeaponType, WeaponCommonLimits> = {
  SimpleGun: {
    maxActiveBullets: { min: 1, max: 3 },
    normalShotCooldownMs: { min: 40, max: 1500 },
    chargedShotCooldownMs: { min: 200, max: 5000 },
  },
  MitosisGun: {
    maxActiveBullets: { min: 1, max: 3 },
    normalShotCooldownMs: { min: 40, max: 1800 },
    chargedShotCooldownMs: { min: 300, max: 5000 },
  },
  MachineGun: {
    maxActiveBullets: { min: 1, max: 6 },
    normalShotCooldownMs: { min: 20, max: 800 },
    chargedShotCooldownMs: { min: 20, max: 800 },
  },
  GrappleGun: {
    maxActiveBullets: { min: 1, max: 6 },
    normalShotCooldownMs: { min: 60, max: 2200 },
    chargedShotCooldownMs: { min: 300, max: 6000 },
  },
  LaserWhipGun: {
    maxActiveBullets: { min: 1, max: 1 },
    normalShotCooldownMs: { min: 20, max: 1200 },
    chargedShotCooldownMs: { min: 20, max: 1800 },
  },
};

export const CHARGED_BULLET_LIMITS: Record<WeaponType, ChargedBulletLimits> = {
  SimpleGun: {
    normalShotSpeed: { min: 180, max: 1200 },
    normalShotExplosionRadius: { min: 20, max: 180 },
    normalShotMaxBounces: { min: 0, max: 8 },
    normalShotRadius: { min: 1, max: 12 },
    normalShotMaxLifetimeMs: { min: 120, max: 8000 },
    chargedSpeedMultiplier: { min: 1, max: 4 },
    chargedExplosionRadiusMultiplier: { min: 1, max: 4 },
    chargedMaxBounces: { min: 0, max: 8 },
  },
  MitosisGun: {
    normalShotSpeed: { min: 140, max: 1000 },
    normalShotExplosionRadius: { min: 20, max: 220 },
    normalShotMaxBounces: { min: 0, max: 8 },
    normalShotRadius: { min: 1, max: 12 },
    normalShotMaxLifetimeMs: { min: 120, max: 10000 },
    chargedSpeedMultiplier: { min: 1, max: 3.5 },
    chargedExplosionRadiusMultiplier: { min: 1, max: 4 },
    chargedMaxBounces: { min: 0, max: 8 },
  },
  MachineGun: {
    normalShotSpeed: { min: 200, max: 1800 },
    normalShotExplosionRadius: { min: 20, max: 120 },
    normalShotMaxBounces: { min: 0, max: 4 },
    normalShotRadius: { min: 1, max: 10 },
    normalShotMaxLifetimeMs: { min: 80, max: 3000 },
    chargedSpeedMultiplier: { min: 1, max: 2.5 },
    chargedExplosionRadiusMultiplier: { min: 1, max: 2.5 },
    chargedMaxBounces: { min: 0, max: 4 },
  },
  GrappleGun: {
    normalShotSpeed: { min: 120, max: 1200 },
    normalShotExplosionRadius: { min: 20, max: 180 },
    normalShotMaxBounces: { min: 0, max: 8 },
    normalShotRadius: { min: 1, max: 12 },
    normalShotMaxLifetimeMs: { min: 120, max: 10000 },
    chargedSpeedMultiplier: { min: 1, max: 4 },
    chargedExplosionRadiusMultiplier: { min: 1, max: 4 },
    chargedMaxBounces: { min: 0, max: 8 },
  },
  LaserWhipGun: {
    normalShotSpeed: { min: 220, max: 2200 },
    normalShotExplosionRadius: { min: 20, max: 180 },
    normalShotMaxBounces: { min: 0, max: 5 },
    normalShotRadius: { min: 1, max: 12 },
    normalShotMaxLifetimeMs: { min: 80, max: 6000 },
    chargedSpeedMultiplier: { min: 1, max: 4 },
    chargedExplosionRadiusMultiplier: { min: 1, max: 4 },
    chargedMaxBounces: { min: 0, max: 5 },
  },
};

export const MACHINE_GUN_SPECIFIC_LIMITS = {
  holdToRapidFireMs: { min: 40, max: 2000 },
} as const satisfies Record<string, WeaponSetupRange>;

export const LASER_WHIP_SPECIFIC_LIMITS = {
  normalShotLaserLength: { min: 20, max: 240 },
  whipPullStepDistance: { min: 5, max: 80 },
} as const satisfies Record<string, WeaponSetupRange>;

export const GRAPPLE_SPECIFIC_LIMITS = {
  grappleArmedDetonationDelayMs: { min: 0, max: 6000 },
  grappleManualDetonationMinDelayMs: { min: 0, max: 6000 },
  volleyAngleOffsetRadians: { min: -1.2, max: 1.2 },
  volleyAngleOffsetsCount: { min: 1, max: 7 },
} as const satisfies Record<string, WeaponSetupRange>;

export const WEAPON_SETUP_NUMERIC_LIMITS_BY_WEAPON = {
  SimpleGun: {
    ...WEAPON_COMMON_LIMITS.SimpleGun,
    ...CHARGED_BULLET_LIMITS.SimpleGun,
  },
  MitosisGun: {
    ...WEAPON_COMMON_LIMITS.MitosisGun,
    ...CHARGED_BULLET_LIMITS.MitosisGun,
  },
  MachineGun: {
    ...WEAPON_COMMON_LIMITS.MachineGun,
    normalShotSpeed: CHARGED_BULLET_LIMITS.MachineGun.normalShotSpeed,
    normalShotExplosionRadius: CHARGED_BULLET_LIMITS.MachineGun.normalShotExplosionRadius,
    normalShotMaxBounces: CHARGED_BULLET_LIMITS.MachineGun.normalShotMaxBounces,
    normalShotRadius: CHARGED_BULLET_LIMITS.MachineGun.normalShotRadius,
    normalShotMaxLifetimeMs: CHARGED_BULLET_LIMITS.MachineGun.normalShotMaxLifetimeMs,
    ...MACHINE_GUN_SPECIFIC_LIMITS,
  },
  GrappleGun: {
    ...WEAPON_COMMON_LIMITS.GrappleGun,
    ...CHARGED_BULLET_LIMITS.GrappleGun,
    ...GRAPPLE_SPECIFIC_LIMITS,
  },
  LaserWhipGun: {
    ...WEAPON_COMMON_LIMITS.LaserWhipGun,
    normalShotSpeed: CHARGED_BULLET_LIMITS.LaserWhipGun.normalShotSpeed,
    normalShotExplosionRadius: CHARGED_BULLET_LIMITS.LaserWhipGun.normalShotExplosionRadius,
    normalShotMaxBounces: CHARGED_BULLET_LIMITS.LaserWhipGun.normalShotMaxBounces,
    normalShotRadius: CHARGED_BULLET_LIMITS.LaserWhipGun.normalShotRadius,
    normalShotMaxLifetimeMs: CHARGED_BULLET_LIMITS.LaserWhipGun.normalShotMaxLifetimeMs,
    chargedSpeedMultiplier: CHARGED_BULLET_LIMITS.LaserWhipGun.chargedSpeedMultiplier,
    chargedMaxBounces: CHARGED_BULLET_LIMITS.LaserWhipGun.chargedMaxBounces,
    normalShotLaserLength: LASER_WHIP_SPECIFIC_LIMITS.normalShotLaserLength,
    whipPullStepDistance: LASER_WHIP_SPECIFIC_LIMITS.whipPullStepDistance,
  },
} as const satisfies Record<WeaponType, Record<string, WeaponSetupRange>>;
