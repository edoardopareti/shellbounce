import type { MapName, TankType } from './types.js';

export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;
export const BACKGROUND_COLOR = '#111827';
export const ENEMY_AI_DIFFICULTY = 'medium' as const;
export const ENEMY_COUNT = 1;
export const PLAYER_TANK_TYPE: TankType = 'Fantanyl'; // Fallback tank type if localStorage value is invalid or not set
export const SELECTED_MAP: MapName = 'map1';

export type PlayerInputSource = 'human' | 'ai';
export const PLAYER_INPUT_SOURCE: PlayerInputSource = 'ai';
export const AI_INPUT_STREAM_URL = 'ws://127.0.0.1:8766';
