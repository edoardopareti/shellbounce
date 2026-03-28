import type { MapName } from './maps/types';
import type { TankType } from './entities/Tank';

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const ENEMY_AI_DIFFICULTY = 'hard' as const;
export const ENEMY_COUNT = 2;
export const PLAYER_TANK_TYPE: TankType = 'PolPot';
export const SELECTED_MAP: MapName = 'map3';
