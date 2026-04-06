import type { BulletSpawnConfig } from './bullet.js';

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
}

export interface MachineGunWeaponConfig extends WeaponConfigBase {
  bullet: BulletSpawnConfig;
  holdToRapidFireMs: number;
}
