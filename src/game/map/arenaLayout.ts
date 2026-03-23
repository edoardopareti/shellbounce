import type { Wall } from './types';

export const BASE_ARENA_WIDTH = 960;
export const BASE_ARENA_HEIGHT = 640;

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
  const scaleX = width / BASE_ARENA_WIDTH;
  const scaleY = height / BASE_ARENA_HEIGHT;

  return BASE_ARENA_WALLS.map((wall) => ({
    x: wall.x * scaleX,
    y: wall.y * scaleY,
    width: wall.width * scaleX,
    height: wall.height * scaleY,
  }));
}
