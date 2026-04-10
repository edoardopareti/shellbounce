// Laser whip gun - close combat control and mobility

import type { BulletEntity } from '../bullets/bullet.js';
import { createLaserBulletEntity } from '../bullets/laserBullet.js';
import type { PlayerEntity } from '../player/player.js';
import { type LaserWhipWeaponSetupInput } from '../../../shared/types.js';
import { Weapon, type WeaponRuntime } from './weapon.js';
import { DEFAULT_WEAPON_SETUP_BY_WEAPON } from '../../../shared/constants.js';

export const LASER_WHIP_CONFIG: LaserWhipWeaponSetupInput = DEFAULT_WEAPON_SETUP_BY_WEAPON.LaserWhipGun;

export interface LaserWhipGunRuntime extends Pick<WeaponRuntime,
  'nextBulletId' | 'pullPlayerToOwnedLaserTip'
> {}

export class LaserWhipGun extends Weapon {
  public constructor(
    private readonly runtime: LaserWhipGunRuntime,
    private readonly config: LaserWhipWeaponSetupInput = LASER_WHIP_CONFIG,
  ) {
    super();
  }

  public getMaxActiveBullets(): number {
    return this.config.maxActiveBullets;
  }

  protected createNormalShot(player: PlayerEntity): BulletEntity {
    const { normalShot } = this.config;
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
    const { normalShot, chargedShot } = this.config;
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

    this.runtime.pullPlayerToOwnedLaserTip(player.id, this.config.whip.pullStepDistance);
  }

  protected getNormalShotCooldownMs(): number {
    return this.config.normalShotCooldownMs;
  }

  protected getChargedShotCooldownMs(): number {
    return this.config.chargedShotCooldownMs;
  }
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
