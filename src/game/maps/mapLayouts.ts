import type { MapName, Wall } from './types';

interface ArenaLayout {
  baseWidth: number;
  baseHeight: number;
  worldWidth: number;
  worldHeight: number;
  walls: Wall[];
}

interface ArenaWorld {
  width: number;
  height: number;
  walls: Wall[];
}

const MAP_LAYOUTS: Record<MapName, ArenaLayout> = {
  map1: {
    baseWidth: 960,
    baseHeight: 640,
    worldWidth: 1920,
    worldHeight: 1080,
    walls: [
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
    ],
  },
  map2: {
    baseWidth: 960,
    baseHeight: 640,
    worldWidth: 2560,
    worldHeight: 1706,
    walls: [
      { x: 0, y: 0, width: 960, height: 24 },
      { x: 0, y: 616, width: 960, height: 24 },
      { x: 0, y: 0, width: 24, height: 640 },
      { x: 936, y: 0, width: 24, height: 640 },
      { x: 200, y: 120, width: 560, height: 24 },
      { x: 200, y: 496, width: 560, height: 24 },
      { x: 200, y: 144, width: 24, height: 352 },
      { x: 736, y: 144, width: 24, height: 352 },
      { x: 460, y: 200, width: 40, height: 240 },
      { x: 330, y: 300, width: 120, height: 24 },
      { x: 510, y: 300, width: 120, height: 24 },
    ],
  },
  map3: {
    baseWidth: 960,
    baseHeight: 640,
    worldWidth: 3200,
    worldHeight: 2133,
    walls: [
      { x: 0, y: 0, width: 960, height: 24 },
      { x: 0, y: 616, width: 960, height: 24 },
      { x: 0, y: 0, width: 24, height: 640 },
      { x: 936, y: 0, width: 24, height: 640 },
      { x: 120, y: 160, width: 220, height: 24 },
      { x: 620, y: 160, width: 220, height: 24 },
      { x: 120, y: 456, width: 220, height: 24 },
      { x: 620, y: 456, width: 220, height: 24 },
      { x: 260, y: 250, width: 24, height: 140 },
      { x: 676, y: 250, width: 24, height: 140 },
      { x: 420, y: 250, width: 120, height: 24 },
      { x: 420, y: 366, width: 120, height: 24 },
    ],
  },
};

export function getArenaWorld(
  mapName: MapName,
): ArenaWorld {
  const selectedMap = MAP_LAYOUTS[mapName];
  const worldWidth = selectedMap.worldWidth;
  const worldHeight = selectedMap.worldHeight;
  const scaleX = worldWidth / selectedMap.baseWidth;
  const scaleY = worldHeight / selectedMap.baseHeight;

  return {
    width: worldWidth,
    height: worldHeight,
    walls: selectedMap.walls.map((wall) => ({
      x: wall.x * scaleX,
      y: wall.y * scaleY,
      width: wall.width * scaleX,
      height: wall.height * scaleY,
    })),
  };
}