// Mitosis gun - Strategic field control

import type { BulletEntity } from './bullet.js';
import { createMitosisBulletEntity } from './mitosisBullet.js';
import type { PlayerEntity } from './player.js';
import { Weapon, type WeaponRuntime } from './weapon.js';
import type { ChargedBulletWeaponConfig } from './weaponConfig.js';

const MITOSIS_GUN_CONFIG: ChargedBulletWeaponConfig = {
  maxActiveBullets: 3,
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
    maxBounces: 0,
    explodeOnWallImpact: true,
    isCharged: true,
  },
};

export interface MitosisGunInterface extends Pick<WeaponRuntime,
  'nextBulletId' | 'splitOldestMitosisBulletForPlayer' | 'detonateSplitMitosisBulletsForPlayer'
> {}

export class MitosisGun extends Weapon {
  public constructor(private readonly runtime: MitosisGunInterface) {
    super();
  }

  public getMaxActiveBullets(): number {
    return MITOSIS_GUN_CONFIG.maxActiveBullets;
  }

  protected createNormalShot(player: PlayerEntity): BulletEntity {
    const { normalShot } = MITOSIS_GUN_CONFIG;
    return createMitosisBulletEntity(this.runtime.nextBulletId(), player, {
      speed: normalShot.speed,
      explosionRadius: normalShot.explosionRadius,
      maxBounces: normalShot.maxBounces,
      explodeOnWallImpact: normalShot.explodeOnWallImpact,
      isCharged: normalShot.isCharged,
    });
  }

  protected createChargedShot(player: PlayerEntity, chargeRatio: number): BulletEntity {
    const { normalShot, chargedShot } = MITOSIS_GUN_CONFIG;
    const speed = lerp(
      normalShot.speed,
      normalShot.speed * chargedShot.speedMultiplier,
      chargeRatio,
    );

    return createMitosisBulletEntity(this.runtime.nextBulletId(), player, {
      speed,
      explosionRadius: lerp(
        normalShot.explosionRadius,
        normalShot.explosionRadius * chargedShot.explosionRadiusMultiplier,
        chargeRatio,
      ),
      maxBounces: chargedShot.maxBounces,
      explodeOnWallImpact: chargedShot.explodeOnWallImpact,
      isCharged: chargedShot.isCharged,
    });
  }

  protected handleSurprise(player: PlayerEntity, triggered: boolean): void {
    if (!triggered) {
      return;
    }

    if (this.runtime.splitOldestMitosisBulletForPlayer(player.id)) {
      return;
    }

    this.runtime.detonateSplitMitosisBulletsForPlayer(player.id);
  }

  protected getNormalShotCooldownMs(): number {
    return MITOSIS_GUN_CONFIG.normalShotCooldownMs;
  }

  protected getChargedShotCooldownMs(): number {
    return MITOSIS_GUN_CONFIG.chargedShotCooldownMs;
  }
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
