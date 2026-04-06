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

const MACHINE_GUN_CONFIG: MachineGunWeaponConfig = {
  maxActiveBullets: 4,
  normalShotCooldownMs: 110,
  chargedShotCooldownMs: 40,
  holdToRapidFireMs: 180,
  bullet: {
    speed: 520,
    explosionRadius: 56,
    maxBounces: 0,
    explodeOnWallImpact: false,
    isCharged: false,
    radius: 3.5,
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
}
