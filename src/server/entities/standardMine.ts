import { Mine } from './mine.js';

const MINE_RADIUS = 10;
const MINE_LIFETIME_MS = 8000;
const MINE_ARMING_DELAY_MS = 380;
const MAX_ACTIVE_MINES_PER_TANK = 3;

export const STANDARD_MINE_CONFIG = {
  radius: MINE_RADIUS,
  armingDelayMs: MINE_ARMING_DELAY_MS,
  maxLifetimeMs: MINE_LIFETIME_MS,
  maxActiveMines: MAX_ACTIVE_MINES_PER_TANK,
} as const;

export class StandardMine extends Mine {
  public constructor() {
    super(STANDARD_MINE_CONFIG);
  }
}
