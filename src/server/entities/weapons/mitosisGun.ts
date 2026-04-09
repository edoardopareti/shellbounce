// Mitosis gun - Strategic field control

import type { BulletEntity } from '../bullets/bullet.js';
import { createMitosisBulletEntity } from '../bullets/mitosisBullet.js';
import type { PlayerEntity } from '../player/player.js';
import { Weapon, type WeaponRuntime } from './weapon.js';
import type { ChargedBulletWeaponConfig } from './weaponConfig.js';

const MAX_ACTIVE_BULLETS = 3;
const NORMAL_SHOT_COOLDOWN_MS = 100;
const CHARGED_SHOT_COOLDOWN_MS = 2400;
const NORMAL_SHOT_SPEED = 420;
const NORMAL_SHOT_EXPLOSION_RADIUS = 84;
const NORMAL_SHOT_MAX_BOUNCES = 3;
const NORMAL_SHOT_EXPLODE_ON_WALL_IMPACT = false;
const NORMAL_SHOT_IS_CHARGED = false;
const NORMAL_SHOT_MAX_LIFETIME_MS = 4000;
const CHARGED_SHOT_SPEED_MULTIPLIER = 2.5;
const CHARGED_SHOT_EXPLOSION_RADIUS_MULTIPLIER = 1.5;
const CHARGED_SHOT_MAX_BOUNCES = 0;
const CHARGED_SHOT_EXPLODE_ON_WALL_IMPACT = true;
const CHARGED_SHOT_IS_CHARGED = true;

const MITOSIS_GUN_CONFIG: ChargedBulletWeaponConfig = {
  maxActiveBullets: MAX_ACTIVE_BULLETS,
  normalShotCooldownMs: NORMAL_SHOT_COOLDOWN_MS,
  chargedShotCooldownMs: CHARGED_SHOT_COOLDOWN_MS,
  normalShot: {
    speed: NORMAL_SHOT_SPEED,
    explosionRadius: NORMAL_SHOT_EXPLOSION_RADIUS,
    maxBounces: NORMAL_SHOT_MAX_BOUNCES,
    explodeOnWallImpact: NORMAL_SHOT_EXPLODE_ON_WALL_IMPACT,
    isCharged: NORMAL_SHOT_IS_CHARGED,
    maxLifetimeMs: NORMAL_SHOT_MAX_LIFETIME_MS,
  },
  chargedShot: {
    speedMultiplier: CHARGED_SHOT_SPEED_MULTIPLIER,
    explosionRadiusMultiplier: CHARGED_SHOT_EXPLOSION_RADIUS_MULTIPLIER,
    maxBounces: CHARGED_SHOT_MAX_BOUNCES,
    explodeOnWallImpact: CHARGED_SHOT_EXPLODE_ON_WALL_IMPACT,
    isCharged: CHARGED_SHOT_IS_CHARGED,
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
