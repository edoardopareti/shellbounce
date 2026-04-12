import { Shield } from './shield.js';
import { DEFAULT_SHIELD_SETUP_BY_SHIELD } from '../../../shared/constants.js';
import type { OmniDirShieldSetupInput } from '../../../shared/types.js';

export const OMNIDIR_SHIELD_SETUP_DEFAULT: OmniDirShieldSetupInput = DEFAULT_SHIELD_SETUP_BY_SHIELD.OmniDirShield;

export const OMNIDIR_SHIELD_CONFIG = {
  radius: OMNIDIR_SHIELD_SETUP_DEFAULT.radius,
  forwardOffset: 0,
  sectorAngleRadians: Math.PI * 2,
  cooldownMs: OMNIDIR_SHIELD_SETUP_DEFAULT.cooldownMs,
  overchargeMs: OMNIDIR_SHIELD_SETUP_DEFAULT.overchargeMs,
  mode: 'omnidirectional',
} as const;

export class OmniDirShield extends Shield {
  public constructor(setup: OmniDirShieldSetupInput = OMNIDIR_SHIELD_SETUP_DEFAULT) {
    super({
      radius: setup.radius,
      forwardOffset: 0,
      sectorAngleRadians: Math.PI * 2,
      cooldownMs: setup.cooldownMs,
      overchargeMs: setup.overchargeMs,
      mode: 'omnidirectional',
    });
  }
}
