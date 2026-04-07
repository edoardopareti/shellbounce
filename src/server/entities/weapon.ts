import {
  FIXED_TIMESTEP_SECONDS,
} from '../../shared/constants.js';
import { clamp } from '../../shared/math.js';
import type { TankInput } from '../../shared/types.js';
import type { BulletEntity } from './bullet.js';
import type { PlayerEntity } from './player.js';

const DEFAULT_CHARGED_SHOT_MIN_HOLD_MS = 150;
const DEFAULT_CHARGED_SHOT_MAX_HOLD_MS = 1200;
const DEFAULT_CHARGED_SHOT_OVERCHARGE_MS = 2400;

// Base runtime contract used by weapon implementations.
// WeaponRuntime defines the methods that weapon classes can call to interact with the simulation.
export interface WeaponRuntime {
  nextBulletId: () => string;
  detonateOldestBulletForPlayer: (playerId: string) => void;
  detonateAllBulletsForPlayer: (playerId: string) => boolean;
  splitOldestMitosisBulletForPlayer: (playerId: string) => boolean;
  detonateSplitMitosisBulletsForPlayer: (playerId: string) => boolean;
  armOrDetonateGrappleBulletsForPlayer: (playerId: string) => {
    didArmOrDetonate: boolean;
    blockedByMinDetonationDelay: boolean;
  };
  pullPlayerToOwnedLaserTip: (playerId: string, stepDistance: number) => boolean;
}

export interface WeaponActionResult {
  firedBullets: BulletEntity[];  // The bullets fired as a result of the player's input. This will be empty if no shot was fired.
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
    activeBulletCount: number,
  ): WeaponActionResult {
    const canStartShot = this.canStartShot(activeBulletCount);

    if (!canStartShot && !player.isChargingShot) {
      this.handleSurprise(player, input.detonatePressed);
      return { firedBullets: [], selfDestructed: false };
    }
     
    if (player.isChargingShot && input.fireHeld) {
      player.chargeMs += FIXED_TIMESTEP_SECONDS * 1000;
      if (player.chargeMs >= DEFAULT_CHARGED_SHOT_OVERCHARGE_MS) {
        player.isChargingShot = false;
        player.chargeMs = 0;
        player.fireCooldownMs = this.getNormalShotCooldownMs();
        this.handleSurprise(player, input.detonatePressed);
        return { firedBullets: [], selfDestructed: true };
      }
    }

    if (input.firePressed && canStartShot && player.fireCooldownMs === 0 && !player.isChargingShot) {
      player.isChargingShot = true;
      player.chargeMs = 0;
    }

    if (!player.isChargingShot || !input.fireReleased) {
      this.handleSurprise(player, input.detonatePressed);
      return { firedBullets: [], selfDestructed: false };
    }

    if (!canStartShot || player.fireCooldownMs > 0) {
      player.isChargingShot = false;
      player.chargeMs = 0;
      this.handleSurprise(player, input.detonatePressed);
      return { firedBullets: [], selfDestructed: false };
    }

    const heldMs = player.chargeMs;
    const chargeRatio = this.getChargeRatio(player);
    const isChargedShot = heldMs >= DEFAULT_CHARGED_SHOT_MIN_HOLD_MS;

    player.isChargingShot = false;
    player.chargeMs = 0;

    const firedBullets = this.toBulletArray(isChargedShot
      ? this.createChargedShot(player, chargeRatio)
      : this.createNormalShot(player));

    player.fireCooldownMs = isChargedShot
      ? this.getChargedShotCooldownMs()
      : this.getNormalShotCooldownMs();

    this.handleSurprise(player, input.detonatePressed);
    return { firedBullets, selfDestructed: false };
  }

  // Each weapon type will implement its custom logic 
  // as concrete subclasses of the Weapon base class
  // providing specific implementations.

  protected canStartShot(activeBulletCount: number): boolean {
    // This method determines whether the weapon can start firing a new shot
    // based on the number of active bullets the player currently has.
    // By default, a weapon can start a shot if the player has 
    // fewer active bullets than the maximum allowed.
    return activeBulletCount < this.getMaxActiveBullets();
  }

  public getChargeRatio(player: Pick<PlayerEntity, 'isChargingShot' | 'chargeMs'>): number {
    if (!player.isChargingShot) {
      return 0;
    }

    const cappedChargeMs = Math.min(player.chargeMs, DEFAULT_CHARGED_SHOT_MAX_HOLD_MS);
    const normalized = (cappedChargeMs - DEFAULT_CHARGED_SHOT_MIN_HOLD_MS)
      / (DEFAULT_CHARGED_SHOT_MAX_HOLD_MS - DEFAULT_CHARGED_SHOT_MIN_HOLD_MS);
    return clamp(normalized, 0, 1);
  }
  
  /**
   * Returns the maximum number of active bullets this weapon allows per player.
   * Must be implemented by each weapon type.
   */
  public abstract getMaxActiveBullets(): number;

  protected abstract createNormalShot(player: PlayerEntity): BulletEntity | BulletEntity[];

  protected abstract createChargedShot(player: PlayerEntity, chargeRatio: number): BulletEntity | BulletEntity[];

  protected abstract handleSurprise(player: PlayerEntity, triggered: boolean): void;

  protected abstract getNormalShotCooldownMs(): number;

  protected abstract getChargedShotCooldownMs(): number;

  private toBulletArray(bullets: BulletEntity | BulletEntity[]): BulletEntity[] {
    return Array.isArray(bullets) ? bullets : [bullets];
  }
}
