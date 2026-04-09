import {
  FIXED_TIMESTEP_SECONDS,
} from '../../../shared/constants.js';
import type { TankConfig } from '../tanks/tank.js';

export interface BoostState {
  boostRemainingMs: number;
  boostCooldownMs: number;
  tankConfig: Pick<TankConfig, 'boostCooldownMs' | 'boostDurationMs'>;
}

export function updateBoostState(
  player: BoostState,  // Not a PlayerEntity (structral typing). We mutate the original player object via this reference.
  boostPressed: boolean,
): boolean {

  // Update the player's boost state based on their input and apply any resulting visual effects.

  // deltaMs represents the fixed time step of the simulation in milliseconds.
  // Used to decrement the boost remaining time and cooldown time for the player on each simulation step. 
  const deltaMs = FIXED_TIMESTEP_SECONDS * 1000;
  
  if (player.boostRemainingMs > 0) {
    // If the player currently has boost time remaining, decrement it by deltaMs.
    player.boostRemainingMs = Math.max(0, player.boostRemainingMs - deltaMs);
    if (player.boostRemainingMs === 0) {
      // If the boost time runs out, start the cooldown.
      player.boostCooldownMs = player.tankConfig.boostCooldownMs;
    }
  } else if (player.boostCooldownMs > 0) {
    // If the player is currently in boost cooldown, decrement the cooldown time by deltaMs.
    player.boostCooldownMs = Math.max(0, player.boostCooldownMs - deltaMs);
  }
  
  // If the boost button is pressed and the player is not currently boosting or in cooldown,
  // start the boost by setting the boost remaining time to the defined boost duration 
  // and return true to indicate that the boost was activated.
  if (boostPressed && player.boostRemainingMs === 0 && player.boostCooldownMs === 0) {
    player.boostRemainingMs = player.tankConfig.boostDurationMs;
    return true;
  }

  return false;
}
