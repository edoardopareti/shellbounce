// Grapple gun - Open spaces tactical dominance

import type { BulletEntity } from './bullet.js';
import { createGrappleVolley } from './grappleBullet.js';
import type { PlayerEntity } from './player.js';
import { Weapon, type WeaponRuntime } from './weapon.js';
import type { VolleyWeaponConfig } from './weaponConfig.js';

const MAX_ACTIVE_BULLETS = 6;
const NORMAL_SHOT_COOLDOWN_MS = 200;
const CHARGED_SHOT_COOLDOWN_MS = 2500;
const NORMAL_SHOT_SPEED = 420;
const NORMAL_SHOT_EXPLOSION_RADIUS = 45;
const NORMAL_SHOT_MAX_BOUNCES = 3;
const NORMAL_SHOT_EXPLODE_ON_WALL_IMPACT = false;
const NORMAL_SHOT_IS_CHARGED = false;
const NORMAL_SHOT_MAX_LIFETIME_MS = 4000;
const CHARGED_SHOT_SPEED_MULTIPLIER = 2.5;
const CHARGED_SHOT_EXPLOSION_RADIUS_MULTIPLIER = 1.5;
const CHARGED_SHOT_MAX_BOUNCES = 0;
const CHARGED_SHOT_EXPLODE_ON_WALL_IMPACT = true;
const CHARGED_SHOT_IS_CHARGED = true;
const VOLLEY_ANGLE_OFFSETS_RADIANS = [-(Math.PI / 15), 0, Math.PI / 15];
const REQUIRES_EMPTY_CHAMBER_TO_SHOOT = false;
const GRAPPLE_ARMED_DETONATION_DELAY_MS = 2500;
const GRAPPLE_MANUAL_DETONATION_MIN_DELAY_MS = 1000;

const GRAPPLE_GUN_CONFIG: VolleyWeaponConfig = {
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
  volleyAngleOffsetsRadians: VOLLEY_ANGLE_OFFSETS_RADIANS,
  requiresEmptyChamberToShoot: REQUIRES_EMPTY_CHAMBER_TO_SHOOT,
  grappleArmedDetonationDelayMs: GRAPPLE_ARMED_DETONATION_DELAY_MS,
  grappleManualDetonationMinDelayMs: GRAPPLE_MANUAL_DETONATION_MIN_DELAY_MS,
};

export interface GrappleGunRuntime extends Pick<WeaponRuntime,
  'nextBulletId' | 'armOrDetonateGrappleBulletsForPlayer'
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
    return createGrappleVolley(
      player,
      GRAPPLE_GUN_CONFIG.normalShot,
      {
        volleyAngleOffsetsRadians: GRAPPLE_GUN_CONFIG.volleyAngleOffsetsRadians,
        grappleArmedDetonationDelayMs: GRAPPLE_GUN_CONFIG.grappleArmedDetonationDelayMs,
        grappleManualDetonationMinDelayMs: GRAPPLE_GUN_CONFIG.grappleManualDetonationMinDelayMs,
      },
      () => this.runtime.nextBulletId(),
    );
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
        volleyAngleOffsetsRadians: GRAPPLE_GUN_CONFIG.volleyAngleOffsetsRadians,
        grappleArmedDetonationDelayMs: GRAPPLE_GUN_CONFIG.grappleArmedDetonationDelayMs,
        grappleManualDetonationMinDelayMs: GRAPPLE_GUN_CONFIG.grappleManualDetonationMinDelayMs,
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
    return GRAPPLE_GUN_CONFIG.normalShotCooldownMs;
  }

  protected getChargedShotCooldownMs(): number {
    return GRAPPLE_GUN_CONFIG.chargedShotCooldownMs;
  }

}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}
