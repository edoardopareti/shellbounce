import type { BulletEntity } from '../entities/bullet.js';

export interface SimulationContext {
  world: { width: number; height: number; walls: ReadonlyArray<{ x: number; y: number; width: number; height: number }> };
  bullets: ReadonlyArray<BulletEntity>;
  nowMs: number;
  getActiveBulletCountForPlayer: (playerId: string) => number;
  intersectsAnyWall: (x: number, y: number, radius: number) => boolean;
  isExplosionBlockedByWall: (startX: number, startY: number, endX: number, endY: number) => boolean;
}
