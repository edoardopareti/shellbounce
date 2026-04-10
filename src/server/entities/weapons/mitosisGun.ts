// Mitosis gun - Strategic field control

import type { BulletEntity } from '../bullets/bullet.js';
import { createMitosisBulletEntity } from '../bullets/mitosisBullet.js';
import type { PlayerEntity } from '../player/player.js';
import { DEFAULT_WEAPON_SETUP_BY_WEAPON, type ChargedBulletWeaponSetupInput } from '../../../shared/types.js';
import { Weapon, type WeaponRuntime } from './weapon.js';

export const MITOSIS_GUN_CONFIG: ChargedBulletWeaponSetupInput = DEFAULT_WEAPON_SETUP_BY_WEAPON.MitosisGun;

export interface MitosisGunInterface extends Pick<WeaponRuntime,
  'nextBulletId' | 'splitOldestMitosisBulletForPlayer' | 'detonateSplitMitosisBulletsForPlayer'
> {}

export class MitosisGun extends Weapon {
  public constructor(
    private readonly runtime: MitosisGunInterface,
    private readonly config: ChargedBulletWeaponSetupInput = MITOSIS_GUN_CONFIG,
  ) {
    super();
  }

  public getMaxActiveBullets(): number {
    return this.config.maxActiveBullets;
  }

  protected createNormalShot(player: PlayerEntity): BulletEntity {
    const { normalShot } = this.config;
    return createMitosisBulletEntity(this.runtime.nextBulletId(), player, {
      speed: normalShot.speed,
      explosionRadius: normalShot.explosionRadius,
      maxBounces: normalShot.maxBounces,
      explodeOnWallImpact: normalShot.explodeOnWallImpact,
      isCharged: normalShot.isCharged,
    });
  }

  protected createChargedShot(player: PlayerEntity, chargeRatio: number): BulletEntity {
    const { normalShot, chargedShot } = this.config;
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
    return this.config.normalShotCooldownMs;
  }

  protected getChargedShotCooldownMs(): number {
    return this.config.chargedShotCooldownMs;
  }
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
