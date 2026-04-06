import type { BulletEntity } from './bullet.js';
import { createLaserBulletEntity } from './laserBullet.js';
import type { PlayerEntity } from './player.js';
import { Weapon, type WeaponRuntime } from './weapon.js';
import type { LaserWhipWeaponConfig } from './weaponConfig.js';

const LASER_WHIP_CONFIG: LaserWhipWeaponConfig = {
  maxActiveBullets: 1,
  normalShotCooldownMs: 130,
  chargedShotCooldownMs: 250,
  normalShot: {
    speed: 1200,
    explosionRadius: 70,
    maxBounces: 1,
    laserLength: 90,
    radius: 4,
    maxLifetimeMs: 2300,
  },
  chargedShot: {
    speedMultiplier: 2.2,
    maxBounces: 0,
    isCharged: true,
  },
  whip: {
    pullStepDistance: 28,
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
