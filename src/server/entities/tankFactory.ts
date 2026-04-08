import { type TankType, type WeaponType } from '../../shared/types.js';
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
  isBot: boolean,
  spawn: { x: number; y: number },
  tankConfig?: TankConfig,
): Tank {
  switch (tankType) {
    case 'PolPot':
      return new PolPotTank(weaponType, weapon, isBot, spawn, tankConfig);
    case 'Hightillery':
      return new HightilleryTank(weaponType, weapon, isBot, spawn, tankConfig);
    case 'SSugar':
      return new SSugarTank(weaponType, weapon, isBot, spawn, tankConfig);
    case 'Fantanyl':
      return new FantanylTank(weaponType, weapon, isBot, spawn, tankConfig);
    default:
      return new PolPotTank(weaponType, weapon, isBot, spawn, tankConfig);
  }
}