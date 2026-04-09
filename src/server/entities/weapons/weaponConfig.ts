import type { BulletSpawnConfig } from '../bullets/bullet.js';

export interface WeaponConfigBase {
  maxActiveBullets: number;
  normalShotCooldownMs: number;
  chargedShotCooldownMs: number;
}

export interface ChargedShotScaling {
  speedMultiplier: number;
  explosionRadiusMultiplier: number;
  maxBounces: number;
  explodeOnWallImpact: boolean;
  isCharged: boolean;
}

export interface ChargedBulletWeaponConfig extends WeaponConfigBase {
  normalShot: BulletSpawnConfig;
  chargedShot: ChargedShotScaling;
}

export interface VolleyWeaponConfig extends ChargedBulletWeaponConfig {
  volleyAngleOffsetsRadians: number[];
  requiresEmptyChamberToShoot: boolean;
  grappleArmedDetonationDelayMs?: number;
  grappleManualDetonationMinDelayMs?: number;
}

export interface MachineGunWeaponConfig extends WeaponConfigBase {
  bullet: BulletSpawnConfig;
  holdToRapidFireMs: number;
}

export interface LaserWhipWeaponConfig extends WeaponConfigBase {
  normalShot: {
    speed: number;
    explosionRadius: number;
    maxBounces: number;
    laserLength: number;
    radius: number;
    maxLifetimeMs: number;
  };
  chargedShot: {
    speedMultiplier: number;
    maxBounces: number;
    isCharged: boolean;
  };
  whip: {
    pullStepDistance: number;
  };
}
