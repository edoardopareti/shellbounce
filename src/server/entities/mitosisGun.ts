import {
  BULLET_EXPLOSION_RADIUS,
  BULLET_SPEED,
  CHARGED_SHOT_COOLDOWN_MS,
  CHARGED_SHOT_MAX_EXPLOSION_MULTIPLIER,
  CHARGED_SHOT_MAX_SPEED_MULTIPLIER,
  FIRE_COOLDOWN_MS,
} from '../../shared/constants.js';
import type { BulletEntity } from './bullet.js';
import { createMitosisBulletEntity } from './mitosisBullet.js';
import type { PlayerEntity } from './player.js';
import { Weapon, type WeaponRuntime } from './weapon.js';

export interface MitosisGunInterface extends Pick<WeaponRuntime,
  'nextBulletId' | 'splitOldestMitosisBulletForPlayer' | 'detonateSplitMitosisBulletsForPlayer'
> {}

export class MitosisGun extends Weapon {
  public constructor(private readonly runtime: MitosisGunInterface) {
    super();
  }

  public getMaxActiveBullets(): number {
    return 1;
  }

  protected createNormalShot(player: PlayerEntity): BulletEntity {
    return createMitosisBulletEntity(this.runtime.nextBulletId(), player, {
      speed: BULLET_SPEED,
      isCharged: false,
    });
  }

  protected createChargedShot(player: PlayerEntity, chargeRatio: number): BulletEntity {
    const speed = lerp(BULLET_SPEED, BULLET_SPEED * CHARGED_SHOT_MAX_SPEED_MULTIPLIER, chargeRatio);

    return createMitosisBulletEntity(this.runtime.nextBulletId(), player, {
      speed,
      explosionRadius: lerp(
        BULLET_EXPLOSION_RADIUS,
        BULLET_EXPLOSION_RADIUS * CHARGED_SHOT_MAX_EXPLOSION_MULTIPLIER,
        chargeRatio,
      ),
      maxBounces: 0,
      explodeOnWallImpact: true,
      isCharged: true,
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
    return FIRE_COOLDOWN_MS;
  }

  protected getChargedShotCooldownMs(): number {
    return CHARGED_SHOT_COOLDOWN_MS;
  }
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
