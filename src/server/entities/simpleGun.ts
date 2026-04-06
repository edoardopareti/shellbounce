// Simple gun - balanced solution

import type { BulletEntity } from './bullet.js';
import { createStandardBulletEntity } from './bullet.js';
import type { PlayerEntity } from './player.js';
import { Weapon, type WeaponRuntime } from './weapon.js';
import type { ChargedBulletWeaponConfig } from './weaponConfig.js';

const SIMPLE_GUN_CONFIG: ChargedBulletWeaponConfig = {
  maxActiveBullets: 4,
  normalShotCooldownMs: 100,
  chargedShotCooldownMs: 2400,
  normalShot: {
    speed: 420,
    explosionRadius: 84,
    maxBounces: 3,
    explodeOnWallImpact: false,
    isCharged: false,
  },
  chargedShot: {
    speedMultiplier: 2.5,
    explosionRadiusMultiplier: 1.5,
    maxBounces: 1,
    explodeOnWallImpact: false,
    isCharged: true,
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
