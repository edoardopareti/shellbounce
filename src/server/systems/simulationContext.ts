import type { BulletEntity } from '../entities/bullets/bullet.js';

// SimulationContext provides read-only access to the current state of the simulation
// and utility functions for bots during their input computation.
export interface SimulationContext {
  world: { width: number; height: number; walls: ReadonlyArray<{ x: number; y: number; width: number; height: number }> };
  bullets: ReadonlyArray<BulletEntity>;
  nowMs: number;
  getActiveBulletCountForPlayer: (playerId: string) => number;
  getMaxActiveBulletsForPlayer: (playerId: string) => number;
  intersectsAnyWall: (x: number, y: number, radius: number) => boolean;
  isExplosionBlockedByWall: (startX: number, startY: number, endX: number, endY: number) => boolean;
}
