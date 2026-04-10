// Simple gun - balanced solution

import type { BulletEntity } from '../bullets/bullet.js';
import { createStandardBulletEntity } from '../bullets/bullet.js';
import type { PlayerEntity } from '../player/player.js';
import {type ChargedBulletWeaponSetupInput } from '../../../shared/types.js';
import { Weapon, type WeaponRuntime } from './weapon.js';
import { DEFAULT_WEAPON_SETUP_BY_WEAPON } from '../../../shared/constants.js';

export const SIMPLE_GUN_CONFIG: ChargedBulletWeaponSetupInput = DEFAULT_WEAPON_SETUP_BY_WEAPON.SimpleGun;

export interface SimpleGunRuntime extends Pick<WeaponRuntime,
  'nextBulletId' | 'detonateOldestBulletForPlayer'
> {}

export class SimpleGun extends Weapon {
  public constructor(
    private readonly runtime: SimpleGunRuntime,
    private readonly config: ChargedBulletWeaponSetupInput = SIMPLE_GUN_CONFIG,
  ) {
    super();
  }

  public getMaxActiveBullets(): number {
    return this.config.maxActiveBullets;
  }

  protected createNormalShot(player: PlayerEntity): BulletEntity {
    return createStandardBulletEntity(this.runtime.nextBulletId(), player, this.config.normalShot);
  }

  protected createChargedShot(player: PlayerEntity, chargeRatio: number): BulletEntity {
    const { normalShot, chargedShot } = this.config;
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
    return this.config.normalShotCooldownMs;
  }

  protected getChargedShotCooldownMs(): number {
    return this.config.chargedShotCooldownMs;
  }
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
