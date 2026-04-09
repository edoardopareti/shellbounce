// Laser whip gun - close combat control and mobility

import type { BulletEntity } from '../bullets/bullet.js';
import { createLaserBulletEntity } from '../bullets/laserBullet.js';
import type { PlayerEntity } from '../player/player.js';
import { Weapon, type WeaponRuntime } from './weapon.js';
import type { LaserWhipWeaponConfig } from './weaponConfig.js';

const MAX_ACTIVE_BULLETS = 1;
const NORMAL_SHOT_COOLDOWN_MS = 130;
const CHARGED_SHOT_COOLDOWN_MS = 250;
const NORMAL_SHOT_SPEED = 1200;
const NORMAL_SHOT_EXPLOSION_RADIUS = 70;
const NORMAL_SHOT_MAX_BOUNCES = 1;
const NORMAL_SHOT_LASER_LENGTH = 90;
const NORMAL_SHOT_RADIUS = 4;
const NORMAL_SHOT_MAX_LIFETIME_MS = 2300;
const CHARGED_SHOT_SPEED_MULTIPLIER = 2.2;
const CHARGED_SHOT_MAX_BOUNCES = 0;
const CHARGED_SHOT_IS_CHARGED = true;
const WHIP_PULL_STEP_DISTANCE = 28;

const LASER_WHIP_CONFIG: LaserWhipWeaponConfig = {
  maxActiveBullets: MAX_ACTIVE_BULLETS,
  normalShotCooldownMs: NORMAL_SHOT_COOLDOWN_MS,
  chargedShotCooldownMs: CHARGED_SHOT_COOLDOWN_MS,
  normalShot: {
    speed: NORMAL_SHOT_SPEED,
    explosionRadius: NORMAL_SHOT_EXPLOSION_RADIUS,
    maxBounces: NORMAL_SHOT_MAX_BOUNCES,
    laserLength: NORMAL_SHOT_LASER_LENGTH,
    radius: NORMAL_SHOT_RADIUS,
    maxLifetimeMs: NORMAL_SHOT_MAX_LIFETIME_MS,
  },
  chargedShot: {
    speedMultiplier: CHARGED_SHOT_SPEED_MULTIPLIER,
    maxBounces: CHARGED_SHOT_MAX_BOUNCES,
    isCharged: CHARGED_SHOT_IS_CHARGED,
  },
  whip: {
    pullStepDistance: WHIP_PULL_STEP_DISTANCE,
  },
};

export interface LaserWhipGunRuntime extends Pick<WeaponRuntime,
  'nextBulletId' | 'pullPlayerToOwnedLaserTip'
> {}

export class LaserWhipGun extends Weapon {
  public constructor(private readonly runtime: LaserWhipGunRuntime) {
    super();
  }

  public getMaxActiveBullets(): number {
    return LASER_WHIP_CONFIG.maxActiveBullets;
  }

  protected createNormalShot(player: PlayerEntity): BulletEntity {
    const { normalShot } = LASER_WHIP_CONFIG;
    return createLaserBulletEntity(this.runtime.nextBulletId(), player, {
      speed: normalShot.speed,
      explosionRadius: normalShot.explosionRadius,
      maxBounces: normalShot.maxBounces,
      laserLength: normalShot.laserLength,
      radius: normalShot.radius,
      maxLifetimeMs: normalShot.maxLifetimeMs,
      isCharged: false,
      explodeOnWallImpact: false,
    });
  }

  protected createChargedShot(player: PlayerEntity, chargeRatio: number): BulletEntity {
    const { normalShot, chargedShot } = LASER_WHIP_CONFIG;
    const speed = lerp(
      normalShot.speed,
      normalShot.speed * chargedShot.speedMultiplier,
      chargeRatio,
    );

    return createLaserBulletEntity(this.runtime.nextBulletId(), player, {
      speed,
      explosionRadius: normalShot.explosionRadius,
      maxBounces: chargedShot.maxBounces,
      laserLength: normalShot.laserLength,
      radius: normalShot.radius,
      maxLifetimeMs: normalShot.maxLifetimeMs,
      isCharged: chargedShot.isCharged,
      explodeOnWallImpact: false,
    });
  }

  protected handleSurprise(player: PlayerEntity, triggered: boolean): void {
    if (!triggered) {
      return;
    }

    this.runtime.pullPlayerToOwnedLaserTip(player.id, LASER_WHIP_CONFIG.whip.pullStepDistance);
  }

  protected getNormalShotCooldownMs(): number {
    return LASER_WHIP_CONFIG.normalShotCooldownMs;
  }

  protected getChargedShotCooldownMs(): number {
    return LASER_WHIP_CONFIG.chargedShotCooldownMs;
  }
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
