import { ALL_TANK_TYPES, type TankType } from '../../shared/types';

export function isTankType(value: string): value is TankType {
  return ALL_TANK_TYPES.some((tankType) => tankType === value);
}
