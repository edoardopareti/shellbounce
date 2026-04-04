import {
  BULLET_EXPLOSION_RADIUS,
  BULLET_MAX_BOUNCES,
  BULLET_SPEED,
  CHARGED_SHOT_COOLDOWN_MS,
  CHARGED_SHOT_MAX_EXPLOSION_MULTIPLIER,
  CHARGED_SHOT_MAX_SPEED_MULTIPLIER,
  FIRE_COOLDOWN_MS,
} from '../../shared/constants.js';
import type { BulletEntity } from './bullet.js';
import { createBulletEntity } from './bullet.js';
import type { PlayerEntity } from './player.js';
import { Weapon } from './weapon.js';

interface SimpleGunRuntime {
  nextBulletId: () => string;
  detonateOldestBulletForPlayer: (playerId: string) => void;
}

export class SimpleGun extends Weapon {
  public constructor(private readonly runtime: SimpleGunRuntime) {
    super();
  }

  protected createNormalShot(player: PlayerEntity): BulletEntity {
    return createBulletEntity(this.runtime.nextBulletId(), player, {
      speed: BULLET_SPEED,
      explosionRadius: BULLET_EXPLOSION_RADIUS,
      maxBounces: BULLET_MAX_BOUNCES,
      explodeOnWallImpact: false,
      isCharged: false,
    });
  }

  protected createChargedShot(player: PlayerEntity, chargeRatio: number): BulletEntity {
    const speed = lerp(BULLET_SPEED, BULLET_SPEED * CHARGED_SHOT_MAX_SPEED_MULTIPLIER, chargeRatio);
    const explosionRadius = lerp(
      BULLET_EXPLOSION_RADIUS,
      BULLET_EXPLOSION_RADIUS * CHARGED_SHOT_MAX_EXPLOSION_MULTIPLIER,
      chargeRatio,
    );

    return createBulletEntity(this.runtime.nextBulletId(), player, {
      speed,
      explosionRadius,
      maxBounces: 0,
      explodeOnWallImpact: true,
      isCharged: true,
    });
  }

  protected handleSurprise(player: PlayerEntity, triggered: boolean): void {
    if (!triggered) {
      return;
    }

    this.runtime.detonateOldestBulletForPlayer(player.id);
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
