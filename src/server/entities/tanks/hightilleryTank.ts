import type { ShieldType, WeaponType } from '../../../shared/types.js';
import type { Mine } from '../mines/mine.js';
import type { Shield } from '../shields/shield.js';
import type { Weapon } from '../weapons/weapon.js';
import { Tank, type TankConfig } from './tank.js';

import { DEFAULT_TANK_SETUP_BY_TANK } from '../../../shared/constants.js';

const setup = DEFAULT_TANK_SETUP_BY_TANK.Hightillery;
export const HIGHTILLERY_TANK_CONFIG: Readonly<TankConfig> = {
  radius: 19,
  moveSpeed: setup.moveSpeed,
  reverseSpeed: setup.moveSpeed * 0.75,
  rotationSpeed: Math.PI * setup.rotationSpeedPiFactor,
  muzzleOffset: 27,
  boostMultiplier: setup.boostMultiplier,
  boostDurationMs: setup.boostDurationMs,
  boostCooldownMs: 2300,
};

export class HightilleryTank extends Tank {
  public constructor(
    weaponType: WeaponType,
    shieldType: ShieldType,
    weapon: Weapon,
    mine: Mine,
    shield: Shield,
    respawnShield: Shield,
    isBot: boolean,
    spawn: { x: number; y: number },
    tankConfig: TankConfig = HIGHTILLERY_TANK_CONFIG,
  ) {
    super('Hightillery', weaponType, shieldType, weapon, mine, shield, respawnShield, 0xdc2626, isBot, spawn, tankConfig);
  }
}
