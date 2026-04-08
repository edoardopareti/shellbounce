// Machine gun - quick close combat

import { FIXED_TIMESTEP_SECONDS } from '../../shared/constants.js';
import type { TankInput } from '../../shared/types.js';
import type { BulletEntity } from './bullet.js';
import { createStandardBulletEntity } from './bullet.js';
import type { PlayerEntity } from './player.js';
import {
  Weapon,
  type WeaponActionResult,
  type WeaponRuntime,
} from './weapon.js';
import type { MachineGunWeaponConfig } from './weaponConfig.js';

const MAX_ACTIVE_BULLETS = 6;
const NORMAL_SHOT_COOLDOWN_MS = 130;
const CHARGED_SHOT_COOLDOWN_MS = 40;
const HOLD_TO_RAPID_FIRE_MS = 180;
const NORMAL_SHOT_SPEED = 520;
const NORMAL_SHOT_EXPLOSION_RADIUS = 56;
const NORMAL_SHOT_MAX_BOUNCES = 1;
const NORMAL_SHOT_EXPLODE_ON_WALL_IMPACT = false;
const NORMAL_SHOT_IS_CHARGED = true;
const NORMAL_SHOT_RADIUS = 3;
const NORMAL_SHOT_MAX_LIFETIME_MS = 550;

const MACHINE_GUN_CONFIG: MachineGunWeaponConfig = {
  maxActiveBullets: MAX_ACTIVE_BULLETS,
  normalShotCooldownMs: NORMAL_SHOT_COOLDOWN_MS,
  chargedShotCooldownMs: CHARGED_SHOT_COOLDOWN_MS,
  holdToRapidFireMs: HOLD_TO_RAPID_FIRE_MS,
  bullet: {
    speed: NORMAL_SHOT_SPEED,
    explosionRadius: NORMAL_SHOT_EXPLOSION_RADIUS,
    maxBounces: NORMAL_SHOT_MAX_BOUNCES,
    explodeOnWallImpact: NORMAL_SHOT_EXPLODE_ON_WALL_IMPACT,
    isCharged: NORMAL_SHOT_IS_CHARGED,
    radius: NORMAL_SHOT_RADIUS,
    maxLifetimeMs: NORMAL_SHOT_MAX_LIFETIME_MS,
  },
};

export interface MachineGunRuntime extends Pick<WeaponRuntime,
  'nextBulletId' | 'detonateAllBulletsForPlayer'
> {}

export class MachineGun extends Weapon {
  public constructor(private readonly runtime: MachineGunRuntime) {
    super();
  }

  public getMaxActiveBullets(): number {
    return MACHINE_GUN_CONFIG.maxActiveBullets;
  }

  protected createNormalShot(player: PlayerEntity): BulletEntity {
    return createStandardBulletEntity(this.runtime.nextBulletId(), player, MACHINE_GUN_CONFIG.bullet);
  }

  protected createChargedShot(player: PlayerEntity, _chargeRatio: number): BulletEntity {
    return createStandardBulletEntity(this.runtime.nextBulletId(), player, MACHINE_GUN_CONFIG.bullet);
  }

  protected handleSurprise(player: PlayerEntity, triggered: boolean): void {
    if (!triggered) {
      return;
    }

    this.runtime.detonateAllBulletsForPlayer(player.id);
  }

  protected getNormalShotCooldownMs(): number {
    return MACHINE_GUN_CONFIG.normalShotCooldownMs;
  }

  protected getChargedShotCooldownMs(): number {
    return MACHINE_GUN_CONFIG.chargedShotCooldownMs;
  }

  public handleInput(
    player: PlayerEntity,
    input: Pick<TankInput, 'firePressed' | 'fireHeld' | 'fireReleased' | 'detonatePressed'>,
    activeBulletCount: number,
  ): WeaponActionResult {
    this.handleSurprise(player, input.detonatePressed);

    const canShoot = this.canStartShot(activeBulletCount);

    if (input.fireReleased && !input.firePressed) {
      player.isChargingShot = false;
      player.chargeMs = 0;
      return { firedBullets: [], selfDestructed: false };
    }

    if (input.firePressed) {
      player.isChargingShot = true;
      player.chargeMs = 0;

      if (!canShoot || player.fireCooldownMs > 0) {
        return { firedBullets: [], selfDestructed: false };
      }

      const bullet = this.createNormalShot(player);
      player.fireCooldownMs = this.getNormalShotCooldownMs();
      return { firedBullets: [bullet], selfDestructed: false };
    }

    if (!player.isChargingShot || !input.fireHeld) {
      return { firedBullets: [], selfDestructed: false };
    }

    player.chargeMs += FIXED_TIMESTEP_SECONDS * 1000;
    const rapidModeActive = player.chargeMs >= MACHINE_GUN_CONFIG.holdToRapidFireMs;

    if (!rapidModeActive || !canShoot || player.fireCooldownMs > 0) {
      return { firedBullets: [], selfDestructed: false };
    }

    const bullet = this.createChargedShot(player, 1);
    player.fireCooldownMs = this.getChargedShotCooldownMs();
    return { firedBullets: [bullet], selfDestructed: false };
  }
}
