// Grapple gun - Open spaces tactical dominance

import type { BulletEntity } from '../bullets/bullet.js';
import { createGrappleVolley } from '../bullets/grappleBullet.js';
import type { PlayerEntity } from '../player/player.js';
import { type VolleyWeaponSetupInput } from '../../../shared/types.js';
import { Weapon, type WeaponRuntime } from './weapon.js';
import { DEFAULT_WEAPON_SETUP_BY_WEAPON } from '../../../shared/constants.js';

export const GRAPPLE_GUN_CONFIG: VolleyWeaponSetupInput = DEFAULT_WEAPON_SETUP_BY_WEAPON.GrappleGun;

export interface GrappleGunRuntime extends Pick<WeaponRuntime,
  'nextBulletId' | 'armOrDetonateGrappleBulletsForPlayer'
> {}

export class GrappleGun extends Weapon {
  public constructor(
    private readonly runtime: GrappleGunRuntime,
    private readonly config: VolleyWeaponSetupInput = GRAPPLE_GUN_CONFIG,
  ) {
    super();
  }

  public getMaxActiveBullets(): number {
    return this.config.maxActiveBullets;
  }

  protected canStartShot(activeBulletCount: number): boolean {
    if (this.config.requiresEmptyChamberToShoot) {
      return activeBulletCount === 0;
    }

    return super.canStartShot(activeBulletCount);
  }


  protected createNormalShot(player: PlayerEntity): BulletEntity[] {
    return createGrappleVolley(
      player,
      this.config.normalShot,
      {
        volleyAngleOffsetsRadians: this.config.volleyAngleOffsetsRadians,
        grappleArmedDetonationDelayMs: this.config.grappleArmedDetonationDelayMs,
        grappleManualDetonationMinDelayMs: this.config.grappleManualDetonationMinDelayMs,
      },
      () => this.runtime.nextBulletId(),
    );
  }

  protected createChargedShot(player: PlayerEntity, chargeRatio: number): BulletEntity[] {
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
    return createGrappleVolley(
      player,
      {
        speed,
        explosionRadius,
        maxBounces: chargedShot.maxBounces,
        explodeOnWallImpact: chargedShot.explodeOnWallImpact,
        isCharged: chargedShot.isCharged,
      },
      {
        volleyAngleOffsetsRadians: this.config.volleyAngleOffsetsRadians,
        grappleArmedDetonationDelayMs: this.config.grappleArmedDetonationDelayMs,
        grappleManualDetonationMinDelayMs: this.config.grappleManualDetonationMinDelayMs,
      },
      () => this.runtime.nextBulletId(),
    );
  }

  protected handleSurprise(player: PlayerEntity, triggered: boolean): void {
    if (!triggered) {
      return;
    }

    const result = this.runtime.armOrDetonateGrappleBulletsForPlayer(player.id);
    if (result.blockedByMinDetonationDelay) {
      player.tank.fireCooldownBlocked = true;
    }
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
