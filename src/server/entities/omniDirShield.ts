import { Shield } from './shield.js';

const OMNIDIR_SHIELD_RADIUS = 30;
const OMNIDIR_SHIELD_COOLDOWN_MS = 2500;
const OMNIDIR_SHIELD_OVERCHARGE_MS = 1200;

export const OMNIDIR_SHIELD_CONFIG = {
  radius: OMNIDIR_SHIELD_RADIUS,
  forwardOffset: 0,
  sectorAngleRadians: Math.PI * 2,
  cooldownMs: OMNIDIR_SHIELD_COOLDOWN_MS,
  overchargeMs: OMNIDIR_SHIELD_OVERCHARGE_MS,
  mode: 'omnidirectional',
} as const;

export class OmniDirShield extends Shield {
  public constructor() {
    super(OMNIDIR_SHIELD_CONFIG);
  }
}
