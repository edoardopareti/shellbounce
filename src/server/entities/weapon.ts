import {
  CHARGED_SHOT_MAX_HOLD_MS,
  CHARGED_SHOT_MIN_HOLD_MS,
  CHARGED_SHOT_OVERCHARGE_MS,
  FIXED_TIMESTEP_SECONDS,
} from '../../shared/constants.js';
import { clamp } from '../../shared/math.js';
import type { TankInput } from '../../shared/types.js';
import type { BulletEntity } from './bullet.js';
import type { PlayerEntity } from './player.js';

export interface WeaponActionResult {
  firedBullet: BulletEntity | undefined;
  selfDestructed: boolean;
}

export abstract class Weapon {
  public handleInput(
    player: PlayerEntity,
    input: Pick<TankInput, 'firePressed' | 'fireHeld' | 'fireReleased' | 'detonatePressed'>,
    canFire: boolean,
  ): WeaponActionResult {
    if (!canFire && !player.isChargingShot) {
      this.handleSurprise(player, input.detonatePressed);
      return { firedBullet: undefined, selfDestructed: false };
    }

    if (player.isChargingShot && input.fireHeld) {
      player.chargeMs += FIXED_TIMESTEP_SECONDS * 1000;
      if (player.chargeMs >= CHARGED_SHOT_OVERCHARGE_MS) {
        player.isChargingShot = false;
        player.chargeMs = 0;
        player.fireCooldownMs = this.getNormalShotCooldownMs();
        this.handleSurprise(player, input.detonatePressed);
        return { firedBullet: undefined, selfDestructed: true };
      }
    }

    if (input.firePressed && canFire && player.fireCooldownMs === 0 && !player.isChargingShot) {
      player.isChargingShot = true;
      player.chargeMs = 0;
    }

    if (!player.isChargingShot || !input.fireReleased) {
      this.handleSurprise(player, input.detonatePressed);
      return { firedBullet: undefined, selfDestructed: false };
    }

    if (!canFire || player.fireCooldownMs > 0) {
      player.isChargingShot = false;
      player.chargeMs = 0;
      this.handleSurprise(player, input.detonatePressed);
      return { firedBullet: undefined, selfDestructed: false };
    }

    const heldMs = player.chargeMs;
    const chargeRatio = this.getChargeRatio(player);
    const isChargedShot = heldMs >= CHARGED_SHOT_MIN_HOLD_MS;

    player.isChargingShot = false;
    player.chargeMs = 0;

    const firedBullet = isChargedShot
      ? this.createChargedShot(player, chargeRatio)
      : this.createNormalShot(player);

    player.fireCooldownMs = isChargedShot
      ? this.getChargedShotCooldownMs()
      : this.getNormalShotCooldownMs();

    this.handleSurprise(player, input.detonatePressed);
    return { firedBullet, selfDestructed: false };
  }

  public getChargeRatio(player: Pick<PlayerEntity, 'isChargingShot' | 'chargeMs'>): number {
    if (!player.isChargingShot) {
      return 0;
    }

    const cappedChargeMs = Math.min(player.chargeMs, CHARGED_SHOT_MAX_HOLD_MS);
    const normalized = (cappedChargeMs - CHARGED_SHOT_MIN_HOLD_MS) / (CHARGED_SHOT_MAX_HOLD_MS - CHARGED_SHOT_MIN_HOLD_MS);
    return clamp(normalized, 0, 1);
  }

  protected abstract createNormalShot(player: PlayerEntity): BulletEntity;

  protected abstract createChargedShot(player: PlayerEntity, chargeRatio: number): BulletEntity;

  protected abstract handleSurprise(player: PlayerEntity, triggered: boolean): void;

  protected abstract getNormalShotCooldownMs(): number;

  protected abstract getChargedShotCooldownMs(): number;
}
