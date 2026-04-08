import { computePlayableBounds, getCornerSpawnPoints, isSpawnPointBlocked } from '../entities/arena.js';
import { resetPlayerForRespawn, type PlayerEntity } from '../entities/player.js';

const RESPAWN_RETRY_DELAY_MS = 250;

export class PlayerLifecycleSystem {
  private readonly bounds: ReturnType<typeof computePlayableBounds>;

  public constructor(
    world: { width: number; height: number; walls: ReadonlyArray<{ x: number; y: number; width: number; height: number }> },
  ) {
    this.bounds = computePlayableBounds(world);
  }

  public getDefaultSpawnPoint(): { x: number; y: number } {
    return getCornerSpawnPoints(this.bounds)[0];
  }

  public pickAvailableSpawnPoint(
    players: ReadonlyMap<string, PlayerEntity>,
    walls: ReadonlyArray<{ x: number; y: number; width: number; height: number }>,
    excludedPlayerId: string,
    tick: number,
  ): { x: number; y: number } | undefined {
    
    // Attempt to find an available spawn point for a player
    // by iterating through predefined spawn points in a deterministic order.
    
    const points = getCornerSpawnPoints(this.bounds);

    const startIndex = tick % points.length;
    for (let offset = 0; offset < points.length; offset += 1) {
      const spawn = points[(startIndex + offset) % points.length];
      const alivePlayers = Array.from(players.values())
        .filter((player) => player.tank.isAlive)
        .map((player) => ({ id: player.id, x: player.tank.x, y: player.tank.y, radius: player.tank.radius }));
      if (!isSpawnPointBlocked(spawn.x, spawn.y, excludedPlayerId, walls, alivePlayers)) {
        return spawn;
      }
    }

    return undefined;
  }

  public processRespawns(
    players: ReadonlyMap<string, PlayerEntity>,
    walls: ReadonlyArray<{ x: number; y: number; width: number; height: number }>,
    nowMs: number,
    tick: number,
  ): void {
    // Iterate through all players to check if any are due for respawn based on their respawn timers.
    for (const player of players.values()) {
      if (player.tank.isAlive || nowMs < player.respawnAtMs) {
        continue;
      }
      
      // Attempt to find an available spawn point for the player. If no spawn point is currently available,
      // reschedule the respawn check for a short time later to try again.
      const spawn = this.pickAvailableSpawnPoint(players, walls, player.id, tick);

      if (spawn === undefined) {
        player.respawnAtMs = nowMs + RESPAWN_RETRY_DELAY_MS;
        continue;
      }
      
      // If a spawn point is available, reset the player's state
      // for respawn and place them at the spawn location.
      resetPlayerForRespawn(player, spawn);
    }
  }
}