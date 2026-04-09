import type { TankSetupInput } from './types';

export interface TankSetupRange {
  min: number;
  max: number;
}

export const MOVE_SPEED_LIMITS: TankSetupRange = { min: 200, max: 300 };
export const ROTATION_SPEED_PI_FACTOR_LIMITS: TankSetupRange = { min: 1.2, max: 3 };
export const BOOST_MULTIPLIER_LIMITS: TankSetupRange = { min: 1.75, max: 2.5 };
export const BOOST_DURATION_MS_LIMITS: TankSetupRange = { min: 1000, max: 1500 };

export const TANK_SETUP_LIMITS: Record<keyof TankSetupInput, TankSetupRange> = {
  moveSpeed: MOVE_SPEED_LIMITS,
  rotationSpeedPiFactor: ROTATION_SPEED_PI_FACTOR_LIMITS,
  boostMultiplier: BOOST_MULTIPLIER_LIMITS,
  boostDurationMs: BOOST_DURATION_MS_LIMITS,
};
