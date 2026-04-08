import { Shield } from './shield.js';

const TANK_SHIELD_RADIUS = 25;
const TANK_SHIELD_FORWARD_OFFSET = 15;
const TANK_SHIELD_SECTOR_ANGLE_RADIANS = Math.PI * 0.7;
const SHIELD_COOLDOWN_MS = 2400;
const SHIELD_OVERCHARGE_MS = 2400;

export const STANDARD_SHIELD_CONFIG = {
  radius: TANK_SHIELD_RADIUS,
  forwardOffset: TANK_SHIELD_FORWARD_OFFSET,
  sectorAngleRadians: TANK_SHIELD_SECTOR_ANGLE_RADIANS,
  cooldownMs: SHIELD_COOLDOWN_MS,
  overchargeMs: SHIELD_OVERCHARGE_MS,
} as const;

export class StandardShield extends Shield {
  public constructor() {
    super(STANDARD_SHIELD_CONFIG);
  }
}
