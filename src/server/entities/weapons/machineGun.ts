// Machine gun - quick close combat

import { FIXED_TIMESTEP_SECONDS } from '../../../shared/constants.js';
import type { TankInput } from '../../../shared/types.js';
import { type MachineGunWeaponSetupInput } from '../../../shared/types.js';
import type { BulletEntity } from '../bullets/bullet.js';
import { createStandardBulletEntity } from '../bullets/bullet.js';
import type { PlayerEntity } from '../player/player.js';
import {
  Weapon,
  type WeaponActionResult,
  type WeaponRuntime,
} from './weapon.js';
import { DEFAULT_WEAPON_SETUP_BY_WEAPON } from '../../../shared/constants.js';

export const MACHINE_GUN_CONFIG: MachineGunWeaponSetupInput = DEFAULT_WEAPON_SETUP_BY_WEAPON.MachineGun;

export interface MachineGunRuntime extends Pick<WeaponRuntime,
  'nextBulletId' | 'detonateAllBulletsForPlayer'
> {}

export class MachineGun extends Weapon {
  public constructor(
    private readonly runtime: MachineGunRuntime,
    private readonly config: MachineGunWeaponSetupInput = MACHINE_GUN_CONFIG,
  ) {
    super();
  }

  public getMaxActiveBullets(): number {
    return this.config.maxActiveBullets;
  }

  protected createNormalShot(player: PlayerEntity): BulletEntity {
    return createStandardBulletEntity(this.runtime.nextBulletId(), player, this.config.bullet);
  }

  protected createChargedShot(player: PlayerEntity, _chargeRatio: number): BulletEntity {
    return createStandardBulletEntity(this.runtime.nextBulletId(), player, this.config.bullet);
  }

  protected handleSurprise(player: PlayerEntity, triggered: boolean): void {
    if (!triggered) {
      return;
    }

    this.runtime.detonateAllBulletsForPlayer(player.id);
  }

  protected getNormalShotCooldownMs(): number {
    return this.config.normalShotCooldownMs;
  }

  protected getChargedShotCooldownMs(): number {
    return this.config.chargedShotCooldownMs;
  }

  public handleInput(
    player: PlayerEntity,
    input: Pick<TankInput, 'firePressed' | 'fireHeld' | 'fireReleased' | 'detonatePressed'>,
    activeBulletCount: number,
  ): WeaponActionResult {
    this.handleSurprise(player, input.detonatePressed);

    const canShoot = this.canStartShot(activeBulletCount);

    if (input.fireReleased && !input.firePressed) {
      player.tank.isChargingShot = false;
      player.tank.chargeMs = 0;
      return { firedBullets: [], selfDestructed: false };
    }

    if (input.firePressed) {
      player.tank.isChargingShot = true;
      player.tank.chargeMs = 0;

      if (!canShoot || player.tank.fireCooldownMs > 0) {
        return { firedBullets: [], selfDestructed: false };
      }

      const bullet = this.createNormalShot(player);
      player.tank.fireCooldownMs = this.getNormalShotCooldownMs();
      return { firedBullets: [bullet], selfDestructed: false };
    }

    if (!player.tank.isChargingShot || !input.fireHeld) {
      return { firedBullets: [], selfDestructed: false };
    }

    player.tank.chargeMs += FIXED_TIMESTEP_SECONDS * 1000;
    const rapidModeActive = player.tank.chargeMs >= this.config.holdToRapidFireMs;

    if (!rapidModeActive || !canShoot || player.tank.fireCooldownMs > 0) {
      return { firedBullets: [], selfDestructed: false };
    }

    const bullet = this.createChargedShot(player, 1);
    player.tank.fireCooldownMs = this.getChargedShotCooldownMs();
    return { firedBullets: [bullet], selfDestructed: false };
  }
}
