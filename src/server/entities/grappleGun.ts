// grapple gun - Small spaces dominance

import type { BulletEntity } from './bullet.js';
import { createStandardBulletEntity } from './bullet.js';
import type { PlayerEntity } from './player.js';
import { Weapon, type WeaponRuntime } from './weapon.js';
import type { BulletSpawnConfig } from './bullet.js';
import type { VolleyWeaponConfig } from './weaponConfig.js';

const GRAPPLE_GUN_CONFIG: VolleyWeaponConfig = {
  maxActiveBullets: 6,
  normalShotCooldownMs: 200,
  chargedShotCooldownMs: 2500,
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
  volleyAngleOffsetsRadians: [-(Math.PI / 15), 0, Math.PI / 15],
  requiresEmptyChamberToShoot: false,
};

export interface GrappleGunRuntime extends Pick<WeaponRuntime,
  'nextBulletId' | 'detonateAllBulletsForPlayer'
> {}

export class GrappleGun extends Weapon {
  public constructor(private readonly runtime: GrappleGunRuntime) {
    super();
  }

  public getMaxActiveBullets(): number {
    return GRAPPLE_GUN_CONFIG.maxActiveBullets;
  }

  protected canStartShot(activeBulletCount: number): boolean {
    if (GRAPPLE_GUN_CONFIG.requiresEmptyChamberToShoot) {
      return activeBulletCount === 0;
    }

    return super.canStartShot(activeBulletCount);
  }

  protected createNormalShot(player: PlayerEntity): BulletEntity[] {
    return this.createVolley(player, GRAPPLE_GUN_CONFIG.normalShot);
  }

  protected createChargedShot(player: PlayerEntity, chargeRatio: number): BulletEntity[] {
    const { normalShot, chargedShot } = GRAPPLE_GUN_CONFIG;
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

    return this.createVolley(player, {
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

    this.runtime.detonateAllBulletsForPlayer(player.id);
  }

  protected getNormalShotCooldownMs(): number {
    return GRAPPLE_GUN_CONFIG.normalShotCooldownMs;
  }

  protected getChargedShotCooldownMs(): number {
    return GRAPPLE_GUN_CONFIG.chargedShotCooldownMs;
  }

  private createVolley(
    player: PlayerEntity,
    config: BulletSpawnConfig,
  ): BulletEntity[] {
    const angles = GRAPPLE_GUN_CONFIG.volleyAngleOffsetsRadians.map(
      (offset) => player.turretAngle + offset,
    );

    return angles.map((turretAngle) => createStandardBulletEntity(
      this.runtime.nextBulletId(),
      { ...player, turretAngle },
      config,
    ));
  }
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
