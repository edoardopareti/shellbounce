import { MINE_RADIUS } from '../../shared/constants.js';
import type { PlayerEntity } from './player.js';

export interface MineEntity {
  id: string;
  ownerPlayerId: string;
  color: number;
  x: number;
  y: number;
  radius: number;
  lifetimeMs: number;
  ownerHasClearedMine: boolean;
}

export function createMineEntity(id: string, player: Pick<PlayerEntity, 'id' | 'bulletColor' | 'x' | 'y'>): MineEntity {
  return {
    id,
    ownerPlayerId: player.id,
    color: player.bulletColor,
    x: player.x,
    y: player.y,
    radius: MINE_RADIUS,
    lifetimeMs: 0,
    ownerHasClearedMine: false,
  };
}
