import type { WeaponType } from '../../shared/types.js';
import type { Weapon } from './weapon.js';
import { Tank, type TankConfig } from './tank.js';

export const SSUGAR_TANK_CONFIG: Readonly<TankConfig> = {
  radius: 17,
  moveSpeed: 215,
  reverseSpeed: 165,
  rotationSpeed: Math.PI * 2.8,
  muzzleOffset: 25,
  boostMultiplier: 2.3,
  boostDurationMs: 1750,
  boostCooldownMs: 2050,
};

export class SSugarTank extends Tank {
  public constructor(
    weaponType: WeaponType,
    weapon: Weapon,
    isBot: boolean,
    spawn: { x: number; y: number },
    tankConfig: TankConfig = SSUGAR_TANK_CONFIG,
  ) {
    super('SSugar', weaponType, weapon, 0xf8fafc, isBot, spawn, tankConfig);
  }
}
