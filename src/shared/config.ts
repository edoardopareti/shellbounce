import type { MapName, TankType } from './types.js';

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const ENEMY_AI_DIFFICULTY = 'medium' as const;
export const ENEMY_COUNT = 1;
export const PLAYER_TANK_TYPE: TankType = 'Fantanyl'; // Fallback tank type if localStorage value is invalid or not set
export const SELECTED_MAP: MapName = 'map1';
