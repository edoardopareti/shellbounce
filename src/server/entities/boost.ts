import {
  FIXED_TIMESTEP_SECONDS,
  TANK_BOOST_COOLDOWN_MS,
  TANK_BOOST_DURATION_MS,
} from '../../shared/constants.js';

export interface BoostState {
  boostRemainingMs: number;
  boostCooldownMs: number;
}

export function updateBoostState(
  player: BoostState,
  boostPressed: boolean,
): boolean {
  const deltaMs = FIXED_TIMESTEP_SECONDS * 1000;

  if (player.boostRemainingMs > 0) {
    player.boostRemainingMs = Math.max(0, player.boostRemainingMs - deltaMs);
    if (player.boostRemainingMs === 0) {
      player.boostCooldownMs = TANK_BOOST_COOLDOWN_MS;
    }
  } else if (player.boostCooldownMs > 0) {
    player.boostCooldownMs = Math.max(0, player.boostCooldownMs - deltaMs);
  }

  if (boostPressed && player.boostRemainingMs === 0 && player.boostCooldownMs === 0) {
    player.boostRemainingMs = TANK_BOOST_DURATION_MS;
    return true;
  }

  return false;
}
