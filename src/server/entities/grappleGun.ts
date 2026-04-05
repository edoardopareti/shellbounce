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
import { Weapon, type WeaponRuntime } from './weapon.js';

const GRAPPLE_VOLLEY_ANGLE_OFFSET = Math.PI / 20;

export interface GrappleGunRuntime extends Pick<WeaponRuntime,
  'nextBulletId' | 'detonateAllBulletsForPlayer'
> {}

export class GrappleGun extends Weapon {
  public constructor(private readonly runtime: GrappleGunRuntime) {
    super();
  }

  public getMaxActiveBullets(): number {
    return 3;
  }

  protected canStartShot(activeBulletCount: number): boolean {
    // Grapple fires one volley at a time: all previous grapple bullets must be gone.
    return activeBulletCount === 0;
  }

  protected createNormalShot(player: PlayerEntity): BulletEntity[] {
    return this.createVolley(player, {
      speed: BULLET_SPEED,
      explosionRadius: BULLET_EXPLOSION_RADIUS,
      maxBounces: BULLET_MAX_BOUNCES,
      explodeOnWallImpact: false,
      isCharged: false,
    });
  }

  protected createChargedShot(player: PlayerEntity, chargeRatio: number): BulletEntity[] {
    const speed = lerp(BULLET_SPEED, BULLET_SPEED * CHARGED_SHOT_MAX_SPEED_MULTIPLIER, chargeRatio);
    const explosionRadius = lerp(
      BULLET_EXPLOSION_RADIUS,
      BULLET_EXPLOSION_RADIUS * CHARGED_SHOT_MAX_EXPLOSION_MULTIPLIER,
      chargeRatio,
    );

    return this.createVolley(player, {
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

    this.runtime.detonateAllBulletsForPlayer(player.id);
  }

  protected getNormalShotCooldownMs(): number {
    return FIRE_COOLDOWN_MS;
  }

  protected getChargedShotCooldownMs(): number {
    return CHARGED_SHOT_COOLDOWN_MS;
  }

  private createVolley(
    player: PlayerEntity,
    config: {
      speed: number;
      explosionRadius: number;
      maxBounces: number;
      explodeOnWallImpact: boolean;
      isCharged: boolean;
    },
  ): BulletEntity[] {
    const angles = [
      player.turretAngle - GRAPPLE_VOLLEY_ANGLE_OFFSET,
      player.turretAngle,
      player.turretAngle + GRAPPLE_VOLLEY_ANGLE_OFFSET,
    ];

    return angles.map((turretAngle) => createBulletEntity(
      this.runtime.nextBulletId(),
      { ...player, turretAngle },
      config,
    ));
  }
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
