import { distance } from '../../shared/math.js';
import type { BulletEntity } from '../entities/bullet.js';
import type { MineEntity } from '../entities/mine.js';
import type { PlayerEntity } from '../entities/player.js';
import { segmentIntersectsRectangle } from '../utils/collision.js';

export interface ExplosionEnvironment {
  walls: ReadonlyArray<{ x: number; y: number; width: number; height: number }>;
}

export interface ExplosionHandlers {
  destroyPlayer: (player: PlayerEntity, sourcePlayerId?: string) => void;
  explodeMine: (x: number, y: number, sourcePlayerId?: string) => void;
}

export class ExplosionService {
  public isBlockedByWall(
    walls: ReadonlyArray<{ x: number; y: number; width: number; height: number }>,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
  ): boolean {
    for (const wall of walls) {
      if (segmentIntersectsRectangle(startX, startY, endX, endY, wall)) {
        return true;
      }
    }

    return false;
  }

  public applyAreaExplosion(
    centerX: number,
    centerY: number,
    radius: number,
    sourcePlayerId: string | undefined,
    players: ReadonlyMap<string, PlayerEntity>,
    bullets: BulletEntity[],
    mines: MineEntity[],
    environment: ExplosionEnvironment,
    handlers: ExplosionHandlers,
  ): void {
    for (const player of players.values()) {
      if (!player.tank.isAlive || player.tank.shield.isActive) {
        continue;
      }

      const withinRadius = distance(player.tank.x, player.tank.y, centerX, centerY) <= radius + player.tank.radius;
      if (!withinRadius) {
        continue;
      }

      const blockedByWall = this.isBlockedByWall(environment.walls, centerX, centerY, player.tank.x, player.tank.y);
      if (!blockedByWall) {
        handlers.destroyPlayer(player, sourcePlayerId);
      }
    }

    for (let mineIndex = mines.length - 1; mineIndex >= 0; mineIndex -= 1) {
      const mine = mines[mineIndex];
      if (mine === undefined) {
        continue;
      }

      const withinRadius = distance(mine.x, mine.y, centerX, centerY) <= radius + mine.radius;
      if (!withinRadius) {
        continue;
      }

      const blockedByWall = this.isBlockedByWall(environment.walls, centerX, centerY, mine.x, mine.y);
      if (blockedByWall) {
        continue;
      }

      mines.splice(mineIndex, 1);
      handlers.explodeMine(mine.x, mine.y, mine.ownerPlayerId);
    }

    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = bullets[bulletIndex];
      if (bullet === undefined) {
        continue;
      }

      if (distance(bullet.x, bullet.y, centerX, centerY) <= radius + bullet.radius) {
        bullets.splice(bulletIndex, 1);
      }
    }
  }
}
