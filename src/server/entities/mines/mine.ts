import type { PlayerEntity } from '../player/player.js';

export interface MineConfig {
  radius: number;
  armingDelayMs: number;
  maxLifetimeMs: number;
  maxActiveMines: number;
}

export interface MineEntity {
  id: string;
  ownerPlayerId: string;
  color: number;
  x: number;
  y: number;
  radius: number;
  lifetimeMs: number;
  armingDelayMs: number;
  maxLifetimeMs: number;
  ownerHasClearedMine: boolean;
}

export abstract class Mine {
  public constructor(private readonly mineConfig: MineConfig) {}

  public createEntity(id: string, player: Pick<PlayerEntity, 'id' | 'tank'>): MineEntity {
    return {
      id,
      ownerPlayerId: player.id,
      color: player.tank.bulletColor,
      x: player.tank.x,
      y: player.tank.y,
      radius: this.mineConfig.radius,
      lifetimeMs: 0,
      armingDelayMs: this.mineConfig.armingDelayMs,
      maxLifetimeMs: this.mineConfig.maxLifetimeMs,
      ownerHasClearedMine: false,
    };
  }

  public getMaxActiveMines(): number {
    return this.mineConfig.maxActiveMines;
  }
}
