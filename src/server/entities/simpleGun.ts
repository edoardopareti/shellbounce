// Simple gun - balanced solution

import type { BulletEntity } from './bullet.js';
import { createStandardBulletEntity } from './bullet.js';
import type { PlayerEntity } from './player.js';
import { Weapon, type WeaponRuntime } from './weapon.js';
import type { ChargedBulletWeaponConfig } from './weaponConfig.js';

const MAX_ACTIVE_BULLETS = 4;
const NORMAL_SHOT_COOLDOWN_MS = 100;
const CHARGED_SHOT_COOLDOWN_MS = 2400;
const NORMAL_SHOT_SPEED = 420;
const NORMAL_SHOT_EXPLOSION_RADIUS = 84;
const NORMAL_SHOT_MAX_BOUNCES = 3;
const NORMAL_SHOT_EXPLODE_ON_WALL_IMPACT = false;
const NORMAL_SHOT_IS_CHARGED = false;
const CHARGED_SHOT_SPEED_MULTIPLIER = 2.5;
const CHARGED_SHOT_EXPLOSION_RADIUS_MULTIPLIER = 1.5;
const CHARGED_SHOT_MAX_BOUNCES = 1;
const CHARGED_SHOT_EXPLODE_ON_WALL_IMPACT = false;
const CHARGED_SHOT_IS_CHARGED = true;

const SIMPLE_GUN_CONFIG: ChargedBulletWeaponConfig = {
  maxActiveBullets: MAX_ACTIVE_BULLETS,
  normalShotCooldownMs: NORMAL_SHOT_COOLDOWN_MS,
  chargedShotCooldownMs: CHARGED_SHOT_COOLDOWN_MS,
  normalShot: {
    speed: NORMAL_SHOT_SPEED,
    explosionRadius: NORMAL_SHOT_EXPLOSION_RADIUS,
    maxBounces: NORMAL_SHOT_MAX_BOUNCES,
    explodeOnWallImpact: NORMAL_SHOT_EXPLODE_ON_WALL_IMPACT,
    isCharged: NORMAL_SHOT_IS_CHARGED,
  },
  chargedShot: {
    speedMultiplier: CHARGED_SHOT_SPEED_MULTIPLIER,
    explosionRadiusMultiplier: CHARGED_SHOT_EXPLOSION_RADIUS_MULTIPLIER,
    maxBounces: CHARGED_SHOT_MAX_BOUNCES,
    explodeOnWallImpact: CHARGED_SHOT_EXPLODE_ON_WALL_IMPACT,
    isCharged: CHARGED_SHOT_IS_CHARGED,
  },
};

export interface SimpleGunRuntime extends Pick<WeaponRuntime,
  'nextBulletId' | 'detonateOldestBulletForPlayer'
> {}

export class SimpleGun extends Weapon {
  public constructor(private readonly runtime: SimpleGunRuntime) {
    super();
  }

  public getMaxActiveBullets(): number {
    return SIMPLE_GUN_CONFIG.maxActiveBullets;
  }

  protected createNormalShot(player: PlayerEntity): BulletEntity {
    return createStandardBulletEntity(this.runtime.nextBulletId(), player, SIMPLE_GUN_CONFIG.normalShot);
  }

  protected createChargedShot(player: PlayerEntity, chargeRatio: number): BulletEntity {
    const { normalShot, chargedShot } = SIMPLE_GUN_CONFIG;
    const speed = lerp(
      normalShot.speed,
      normalShot.speed * chargedShot.speedMultiplier,
      chargeRatio,
    );
    const explosionRadius = lerp(
      normalShot.explosionRadius,
      normalShot.explosionRadius * chargedShot.explosionRadiusMultiplier,
      chargeRatio,
    );

    return createStandardBulletEntity(this.runtime.nextBulletId(), player, {
      speed,
      explosionRadius,
      maxBounces: chargedShot.maxBounces,
      explodeOnWallImpact: chargedShot.explodeOnWallImpact,
      isCharged: chargedShot.isCharged,
    });
  }

  protected handleSurprise(player: PlayerEntity, triggered: boolean): void {
    if (!triggered) {
      return;
    }

    this.runtime.detonateOldestBulletForPlayer(player.id);
  }

  protected getNormalShotCooldownMs(): number {
    return SIMPLE_GUN_CONFIG.normalShotCooldownMs;
  }

  protected getChargedShotCooldownMs(): number {
    return SIMPLE_GUN_CONFIG.chargedShotCooldownMs;
  }
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
