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
  firedBullet: BulletEntity | undefined;  // The bullet that was fired as a result of the player's input, if any. This will be undefined if no bullet was fired (e.g., if the player is still charging a shot or if the input was for a surprise action).
  selfDestructed: boolean; // A boolean indicating whether the player's own weapon was self-destructed as a result of overcharging a shot. This is true if the player held the charge for too long and triggered the overcharge condition, resulting in the weapon being disabled temporarily.
}

export abstract class Weapon {
  // The Weapon class defines the interface and common logic for handling player firing actions,
  // including normal shots, charged shots, and any special "surprise" actions (e.g., detonating bullets).
  // Specific weapon types will extend this class
  // and implement the abstract methods to define their unique behavior.
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
