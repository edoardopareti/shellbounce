import { type ShieldType, type TankType, type WeaponType } from '../../../shared/types.js';
import type { Mine } from '../mines/mine.js';
import type { Shield } from '../shields/shield.js';
import type { Weapon } from '../weapons/weapon.js';
import { PolPotTank, POLPOT_TANK_CONFIG } from './polPotTank.js';
import { HightilleryTank, HIGHTILLERY_TANK_CONFIG } from './hightilleryTank.js';
import { SSugarTank, SSUGAR_TANK_CONFIG } from './ssugarTank.js';
import { FantanylTank, FANTANYL_TANK_CONFIG } from './fantanylTank.js';
import type { Tank, TankConfig } from './tank.js';

export function getDefaultTankConfigByType(tankType: TankType): TankConfig {
  switch (tankType) {
    case 'PolPot':
      return { ...POLPOT_TANK_CONFIG };
    case 'Hightillery':
      return { ...HIGHTILLERY_TANK_CONFIG };
    case 'SSugar':
      return { ...SSUGAR_TANK_CONFIG };
    case 'Fantanyl':
      return { ...FANTANYL_TANK_CONFIG };
    default:
      return { ...POLPOT_TANK_CONFIG };
  }
}

export function createTankByType(
  tankType: TankType,
  weaponType: WeaponType,
  shieldType: ShieldType,
  weapon: Weapon,
  mine: Mine,
  shield: Shield,
  respawnShield: Shield,
  isBot: boolean,
  spawn: { x: number; y: number },
  tankConfig?: TankConfig,
): Tank {
  switch (tankType) {
    case 'PolPot':
      return new PolPotTank(weaponType, shieldType, weapon, mine, shield, respawnShield, isBot, spawn, tankConfig);
    case 'Hightillery':
      return new HightilleryTank(weaponType, shieldType, weapon, mine, shield, respawnShield, isBot, spawn, tankConfig);
    case 'SSugar':
      return new SSugarTank(weaponType, shieldType, weapon, mine, shield, respawnShield, isBot, spawn, tankConfig);
    case 'Fantanyl':
      return new FantanylTank(weaponType, shieldType, weapon, mine, shield, respawnShield, isBot, spawn, tankConfig);
    default:
      return new PolPotTank(weaponType, shieldType, weapon, mine, shield, respawnShield, isBot, spawn, tankConfig);
  }
}