import type { ShieldType, WeaponType } from '../../../shared/types.js';
import type { Mine } from '../mines/mine.js';
import type { Shield } from '../shields/shield.js';
import type { Weapon } from '../weapons/weapon.js';
import { Tank, type TankConfig } from './tank.js';

import { DEFAULT_TANK_SETUP_BY_TANK } from '../../../shared/constants.js';

const setup = DEFAULT_TANK_SETUP_BY_TANK.PolPot;
export const POLPOT_TANK_CONFIG: Readonly<TankConfig> = {
  radius: 18,
  moveSpeed: setup.moveSpeed,
  reverseSpeed: setup.moveSpeed * 0.75,
  rotationSpeed: Math.PI * setup.rotationSpeedPiFactor,
  muzzleOffset: 26,
  boostMultiplier: setup.boostMultiplier,
  boostDurationMs: setup.boostDurationMs,
  boostCooldownMs: 2000,
};

export class PolPotTank extends Tank {
  public constructor(
    weaponType: WeaponType,
    shieldType: ShieldType,
    weapon: Weapon,
    mine: Mine,
    shield: Shield,
    respawnShield: Shield,
    isBot: boolean,
    spawn: { x: number; y: number },
    tankConfig: TankConfig = POLPOT_TANK_CONFIG,
  ) {
    super('PolPot', weaponType, shieldType, weapon, mine, shield, respawnShield, 0x22c55e, isBot, spawn, tankConfig);
  }
}
