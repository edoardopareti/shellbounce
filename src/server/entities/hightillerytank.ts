import type { WeaponType } from '../../shared/types.js';
import type { Mine } from './mine.js';
import type { Shield } from './shield.js';
import type { Weapon } from './weapon.js';
import { Tank, type TankConfig } from './tank.js';

export const HIGHTILLERY_TANK_CONFIG: Readonly<TankConfig> = {
  radius: 19,
  moveSpeed: 190,
  reverseSpeed: 140,
  rotationSpeed: Math.PI * 2.2,
  muzzleOffset: 27,
  boostMultiplier: 2.0,
  boostDurationMs: 1700,
  boostCooldownMs: 2300,
};

export class HightilleryTank extends Tank {
  public constructor(
    weaponType: WeaponType,
    weapon: Weapon,
    mine: Mine,
    shield: Shield,
    isBot: boolean,
    spawn: { x: number; y: number },
    tankConfig: TankConfig = HIGHTILLERY_TANK_CONFIG,
  ) {
    super('Hightillery', weaponType, weapon, mine, shield, 0xdc2626, isBot, spawn, tankConfig);
  }
}
