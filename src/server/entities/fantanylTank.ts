import type { WeaponType } from '../../shared/types.js';
import type { Weapon } from './weapon.js';
import { Tank, type TankConfig } from './tank.js';

export const FANTANYL_TANK_CONFIG: Readonly<TankConfig> = {
  radius: 18,
  moveSpeed: 200,
  reverseSpeed: 155,
  rotationSpeed: Math.PI * 2.6,
  muzzleOffset: 26,
  boostMultiplier: 2.2,
  boostDurationMs: 1850,
  boostCooldownMs: 2100,
};

export class FantanylTank extends Tank {
  public constructor(
    weaponType: WeaponType,
    weapon: Weapon,
    isBot: boolean,
    spawn: { x: number; y: number },
    tankConfig: TankConfig = FANTANYL_TANK_CONFIG,
  ) {
    super('Fantanyl', weaponType, weapon, 0xfacc15, isBot, spawn, tankConfig);
  }
}
