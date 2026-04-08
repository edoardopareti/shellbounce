import {
  FIXED_TIMESTEP_SECONDS,
  MAX_ACTIVE_MINES_PER_TANK,
  MINE_ARMING_DELAY_MS,
  MINE_LIFETIME_MS,
} from '../../shared/constants.js';
import { distance } from '../../shared/math.js';
import { createMineEntity, type MineEntity } from '../entities/mine.js';
import type { PlayerEntity } from '../entities/player.js';

export interface MineSystemHandlers {
  explodeMine: (x: number, y: number, sourcePlayerId?: string) => void;
}

export class MineSystem {
  public updateMines(mines: MineEntity[], handlers: MineSystemHandlers): void {
    const deltaMs = FIXED_TIMESTEP_SECONDS * 1000;

    for (let index = mines.length - 1; index >= 0; index -= 1) {
      const mine = mines[index];
      if (mine === undefined) {
        continue;
      }
      mine.lifetimeMs += deltaMs;

      if (mine.lifetimeMs < MINE_LIFETIME_MS) {
        continue;
      }

      mines.splice(index, 1);
      handlers.explodeMine(mine.x, mine.y, mine.ownerPlayerId);
    }
  }

  public resolveMineTriggers(
    mines: MineEntity[],
    players: ReadonlyMap<string, PlayerEntity>,
    handlers: MineSystemHandlers,
  ): void {
    for (let mineIndex = mines.length - 1; mineIndex >= 0; mineIndex -= 1) {
      const mine = mines[mineIndex];
      if (mine === undefined) {
        continue;
      }
      if (mine.lifetimeMs < MINE_ARMING_DELAY_MS) {
        continue;
      }

      const owner = players.get(mine.ownerPlayerId);
      if (owner !== undefined && owner.tank.isAlive) {
        const ownerOverlappingMine = distance(owner.tank.x, owner.tank.y, mine.x, mine.y)
          <= owner.tank.radius + mine.radius;
        if (!ownerOverlappingMine) {
          mine.ownerHasClearedMine = true;
        }
      } else {
        mine.ownerHasClearedMine = true;
      }

      for (const player of players.values()) {
        if (!player.tank.isAlive) {
          continue;
        }

        if (player.id === mine.ownerPlayerId && !mine.ownerHasClearedMine) {
          continue;
        }

        if (distance(player.tank.x, player.tank.y, mine.x, mine.y) > player.tank.radius + mine.radius) {
          continue;
        }

        mines.splice(mineIndex, 1);
        handlers.explodeMine(mine.x, mine.y, mine.ownerPlayerId);
        break;
      }
    }
  }

  public tryPlaceMine(player: PlayerEntity, mines: MineEntity[], nextMineId: string): MineEntity | undefined {
    const activeMineCount = mines.filter((mine) => mine.ownerPlayerId === player.id).length;
    if (activeMineCount >= MAX_ACTIVE_MINES_PER_TANK) {
      return undefined;
    }

    return createMineEntity(nextMineId, player);
  }
}
