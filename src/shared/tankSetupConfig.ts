import type { TankSetupInput } from './types';

import {
  MOVE_SPEED_LIMITS,
  ROTATION_SPEED_PI_FACTOR_LIMITS,
  BOOST_MULTIPLIER_LIMITS,
  BOOST_DURATION_MS_LIMITS,
} from './constants.js';

export interface TankSetupRange {
  min: number;
  max: number;
}

export const TANK_SETUP_LIMITS: Record<keyof TankSetupInput, TankSetupRange> = {
  moveSpeed: MOVE_SPEED_LIMITS,
  rotationSpeedPiFactor: ROTATION_SPEED_PI_FACTOR_LIMITS,
  boostMultiplier: BOOST_MULTIPLIER_LIMITS,
  boostDurationMs: BOOST_DURATION_MS_LIMITS,
};
