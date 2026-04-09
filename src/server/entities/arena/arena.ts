import { SPAWN_CORNER_PADDING } from '../../../shared/constants.js';
import { clamp, distance } from '../../../shared/math.js';

export interface PlayableBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ArenaWall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computePlayableBounds(
  world: { width: number; height: number; walls: ReadonlyArray<ArenaWall> },
): PlayableBounds {
  const width = world.width;
  const height = world.height;
  const epsilon = 0.001;
  const fullWidthThreshold = width * 0.95;
  const fullHeightThreshold = height * 0.95;

  let leftInset = 0;
  let rightInset = 0;
  let topInset = 0;
  let bottomInset = 0;

  for (const wall of world.walls) {
    const touchesLeft = Math.abs(wall.x) <= epsilon;
    const touchesTop = Math.abs(wall.y) <= epsilon;
    const touchesRight = Math.abs(wall.x + wall.width - width) <= epsilon;
    const touchesBottom = Math.abs(wall.y + wall.height - height) <= epsilon;

    const isVerticalBorder = wall.height >= fullHeightThreshold;
    const isHorizontalBorder = wall.width >= fullWidthThreshold;

    if (touchesLeft && isVerticalBorder) {
      leftInset = Math.max(leftInset, wall.width);
    }
    if (touchesTop && isHorizontalBorder) {
      topInset = Math.max(topInset, wall.height);
    }
    if (touchesRight && isVerticalBorder) {
      rightInset = Math.max(rightInset, wall.width);
    }
    if (touchesBottom && isHorizontalBorder) {
      bottomInset = Math.max(bottomInset, wall.height);
    }
  }

  return {
    left: leftInset,
    top: topInset,
    right: width - rightInset,
    bottom: height - bottomInset,
  };
}

export function getCornerSpawnPoints(bounds: PlayableBounds): Array<{ x: number; y: number }> {
  const p = SPAWN_CORNER_PADDING;

  return [
    { x: bounds.left + p, y: bounds.top + p },
    { x: bounds.right - p, y: bounds.top + p },
    { x: bounds.left + p, y: bounds.bottom - p },
    { x: bounds.right - p, y: bounds.bottom - p },
  ];
}

export function isSpawnPointBlocked(
  x: number,
  y: number,
  spawnRadius: number,
  excludedPlayerId: string,
  walls: ReadonlyArray<ArenaWall>,
  alivePlayers: ReadonlyArray<{ id: string; x: number; y: number; radius: number }>,
): boolean {
  for (const wall of walls) {
    const closestX = clamp(x, wall.x, wall.x + wall.width);
    const closestY = clamp(y, wall.y, wall.y + wall.height);
    const distanceSquared = (x - closestX) * (x - closestX) + (y - closestY) * (y - closestY);
    if (distanceSquared < spawnRadius * spawnRadius) {
      return true;
    }
  }

  for (const player of alivePlayers) {
    if (player.id === excludedPlayerId) {
      continue;
    }

    const minDistance = spawnRadius + player.radius;
    if (distance(player.x, player.y, x, y) < minDistance) {
      return true;
    }
  }

  return false;
}
