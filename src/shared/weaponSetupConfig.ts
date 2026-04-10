import type { WeaponType } from './types';
import {
    WEAPON_COMMON_LIMITS, 
    CHARGED_BULLET_LIMITS, 
    MACHINE_GUN_SPECIFIC_LIMITS,
    GRAPPLE_SPECIFIC_LIMITS,
    LASER_WHIP_SPECIFIC_LIMITS} from './constants.js';

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
