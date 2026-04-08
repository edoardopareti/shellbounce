import type { ShieldType, WeaponType } from '../../shared/types.js';
import type { Mine } from './mine.js';
import type { Shield } from './shield.js';
import type { Weapon } from './weapon.js';
import { Tank, type TankConfig } from './tank.js';

export const POLPOT_TANK_CONFIG: Readonly<TankConfig> = {
  radius: 18,
  moveSpeed: 205,
  reverseSpeed: 145,
  rotationSpeed: Math.PI * 2.55,
  muzzleOffset: 26,
  boostMultiplier: 2.35,
  boostDurationMs: 1900,
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
