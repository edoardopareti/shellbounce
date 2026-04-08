import { type TankType, type WeaponType } from '../../shared/types.js';
import type { Mine } from './mine.js';
import type { Shield } from './shield.js';
import type { Weapon } from './weapon.js';
import { PolPotTank } from './polPotTank.js';
import { HightilleryTank } from './hightillerytank.js';
import { SSugarTank } from './ssugarTank.js';
import { FantanylTank } from './fantanylTank.js';
import type { Tank, TankConfig } from './tank.js';

export function createTankByType(
  tankType: TankType,
  weaponType: WeaponType,
  weapon: Weapon,
  mine: Mine,
  shield: Shield,
  isBot: boolean,
  spawn: { x: number; y: number },
  tankConfig?: TankConfig,
): Tank {
  switch (tankType) {
    case 'PolPot':
      return new PolPotTank(weaponType, weapon, mine, shield, isBot, spawn, tankConfig);
    case 'Hightillery':
      return new HightilleryTank(weaponType, weapon, mine, shield, isBot, spawn, tankConfig);
    case 'SSugar':
      return new SSugarTank(weaponType, weapon, mine, shield, isBot, spawn, tankConfig);
    case 'Fantanyl':
      return new FantanylTank(weaponType, weapon, mine, shield, isBot, spawn, tankConfig);
    default:
      return new PolPotTank(weaponType, weapon, mine, shield, isBot, spawn, tankConfig);
  }
}