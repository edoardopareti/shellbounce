import { ALL_TANK_TYPES, ALL_WEAPON_TYPES, type TankType, type WeaponType } from '../../shared/types';

export function isTankType(value: string): value is TankType {
  return ALL_TANK_TYPES.some((tankType) => tankType === value);
}

export function isWeaponType(value: string): value is WeaponType {
  return ALL_WEAPON_TYPES.some((weaponType) => weaponType === value);
}
