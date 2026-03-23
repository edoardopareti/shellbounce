// src/game/map/arenaLayout.ts
// This file defines the layout of the arena,
// including the base dimensions and the walls that make up the arena.
// It also includes a function to scale the walls based on the actual dimensions of the scene,
// ensuring that the arena maintains its proportions regardless of the screen size.

import type { Wall } from './types';

export const BASE_ARENA_WIDTH = 960; // The base width of the arena, used as a reference for scaling the walls to fit different screen sizes
export const BASE_ARENA_HEIGHT = 640;  // The base height of the arena, used as a reference for scaling the walls to fit
// 
// TODO Define more base arena layouts (or generate them procedurally according to some rules) and allow switching between them, either randomly or based on player choice

// The base layout of the arena, defined as an array of walls with their positions and dimensions.
// Each wall is represented as an object with x and y coordinates, width, and height.
// These coordinates are relative to the base arena dimensions
// and will be scaled accordingly to fit the actual scene dimensions.
const BASE_ARENA_WALLS: Wall[] = [
  { x: 0, y: 0, width: 960, height: 24 },
  { x: 0, y: 616, width: 960, height: 24 },
  { x: 0, y: 0, width: 24, height: 640 },
  { x: 936, y: 0, width: 24, height: 640 },

  { x: 180, y: 120, width: 24, height: 220 },
  { x: 204, y: 120, width: 160, height: 24 },
  { x: 520, y: 120, width: 200, height: 24 },
  { x: 696, y: 120, width: 24, height: 180 },

  { x: 300, y: 270, width: 360, height: 24 },
  { x: 150, y: 430, width: 24, height: 120 },
  { x: 230, y: 500, width: 220, height: 24 },
  { x: 580, y: 420, width: 24, height: 130 },
  { x: 620, y: 470, width: 160, height: 24 },
];

export function getScaledArenaWalls(width: number, height: number): Wall[] {
  
  // Calculate the scaling factors for width and height based on the base arena dimensions
  const scaleX = width / BASE_ARENA_WIDTH;
  const scaleY = height / BASE_ARENA_HEIGHT;
  
  // Scale each wall's position and dimensions according to the calculated scaling factors,
  // ensuring that the walls maintain their relative positions and sizes
  // within the arena regardless of the actual dimensions of the scene
  return BASE_ARENA_WALLS.map((wall) => ({
    x: wall.x * scaleX,
    y: wall.y * scaleY,
    width: wall.width * scaleX,
    height: wall.height * scaleY,
  }));
}
