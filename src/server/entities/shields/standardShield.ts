import { Shield } from './shield.js';
import { DEFAULT_SHIELD_SETUP_BY_SHIELD } from '../../../shared/constants.js';
import type { StandardShieldSetupInput } from '../../../shared/types.js';

export const STANDARD_SHIELD_SETUP_DEFAULT: StandardShieldSetupInput = DEFAULT_SHIELD_SETUP_BY_SHIELD.StandardShield;

export const STANDARD_SHIELD_CONFIG = {
  radius: STANDARD_SHIELD_SETUP_DEFAULT.radius,
  forwardOffset: STANDARD_SHIELD_SETUP_DEFAULT.forwardOffset,
  sectorAngleRadians: STANDARD_SHIELD_SETUP_DEFAULT.sectorAngleRadians,
  cooldownMs: STANDARD_SHIELD_SETUP_DEFAULT.cooldownMs,
  overchargeMs: STANDARD_SHIELD_SETUP_DEFAULT.overchargeMs,
  mode: 'sector',
} as const;

export class StandardShield extends Shield {
  public constructor(setup: StandardShieldSetupInput = STANDARD_SHIELD_SETUP_DEFAULT) {
    super({
      radius: setup.radius,
      forwardOffset: setup.forwardOffset,
      sectorAngleRadians: setup.sectorAngleRadians,
      cooldownMs: setup.cooldownMs,
      overchargeMs: setup.overchargeMs,
      mode: 'sector',
    });
  }
}
