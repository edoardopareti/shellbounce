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
    const points = getCornerSpawnPoints(this.bounds);

    const startIndex = tick % points.length;
    for (let offset = 0; offset < points.length; offset += 1) {
      const spawn = points[(startIndex + offset) % points.length];
      const alivePlayers = Array.from(players.values())
        .filter((player) => player.isAlive)
        .map((player) => ({ id: player.id, x: player.x, y: player.y, radius: player.radius }));
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
    for (const player of players.values()) {
      if (player.isAlive || nowMs < player.respawnAtMs) {
        continue;
      }

      const spawn = this.pickAvailableSpawnPoint(players, walls, player.id, tick);
      if (spawn === undefined) {
        player.respawnAtMs = nowMs + RESPAWN_RETRY_DELAY_MS;
        continue;
      }

      resetPlayerForRespawn(player, spawn);
    }
  }
}