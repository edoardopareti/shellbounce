import { clamp } from '../../../shared/math.js';

export interface ShotPreviewSegment {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

interface HitResult {
  x: number;
  y: number;
  axis: 'x' | 'y';
}

export function buildShotPreview(
  origin: { x: number; y: number },
  angle: number,
  walls: ReadonlyArray<{ x: number; y: number; width: number; height: number }>,
  radius: number,
  maxReflections: number,
  maxDistance: number,
): ShotPreviewSegment[] {
  const segments: ShotPreviewSegment[] = [];
  const direction = { x: Math.cos(angle), y: Math.sin(angle) };
  const current = { ...origin };

  let remainingDistance = maxDistance;
  let reflectionsUsed = 0;

  while (remainingDistance > 0.001) {
    const proposed = {
      x: current.x + direction.x * remainingDistance,
      y: current.y + direction.y * remainingDistance,
    };

    const hit = findFirstCollision(current, proposed, walls, radius);
    if (hit === undefined) {
      segments.push({ fromX: current.x, fromY: current.y, toX: proposed.x, toY: proposed.y });
      break;
    }

    segments.push({ fromX: current.x, fromY: current.y, toX: hit.x, toY: hit.y });
    const traveled = Math.hypot(hit.x - current.x, hit.y - current.y);
    remainingDistance -= traveled;

    if (reflectionsUsed >= maxReflections || remainingDistance <= 0.001) {
      break;
    }

    if (hit.axis === 'x') {
      direction.x *= -1;
    } else {
      direction.y *= -1;
    }

    current.x = hit.x + direction.x * 0.5;
    current.y = hit.y + direction.y * 0.5;
    reflectionsUsed += 1;
  }

  return segments;
}

function findFirstCollision(
  start: { x: number; y: number },
  end: { x: number; y: number },
  walls: ReadonlyArray<{ x: number; y: number; width: number; height: number }>,
  radius: number,
): HitResult | undefined {
  let bestHit: HitResult | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const wall of walls) {
    const hit = intersectSegmentWithRectangle(start, end, {
      x: wall.x - radius,
      y: wall.y - radius,
      width: wall.width + radius * 2,
      height: wall.height + radius * 2,
    });

    if (hit === undefined) {
      continue;
    }

    const hitDistance = Math.hypot(hit.x - start.x, hit.y - start.y);
    if (hitDistance < bestDistance) {
      bestDistance = hitDistance;
      bestHit = hit;
    }
  }

  return bestHit;
}

function intersectSegmentWithRectangle(
  start: { x: number; y: number },
  end: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
): HitResult | undefined {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  let tMin = 0;
  let tMax = 1;
  let enterAxis: 'x' | 'y' = 'x';

  const xResult = clipAxis(start.x, dx, rect.x, rect.x + rect.width, tMin, tMax);
  if (xResult === undefined) {
    return undefined;
  }

  tMin = xResult.tMin;
  tMax = xResult.tMax;
  if (xResult.entered) {
    enterAxis = 'x';
  }

  const yResult = clipAxis(start.y, dy, rect.y, rect.y + rect.height, tMin, tMax);
  if (yResult === undefined) {
    return undefined;
  }

  if (yResult.entered) {
    enterAxis = 'y';
  }

  tMin = yResult.tMin;
  if (tMin < 0 || tMin > 1) {
    return undefined;
  }

  return {
    x: start.x + dx * tMin,
    y: start.y + dy * tMin,
    axis: enterAxis,
  };
}

function clipAxis(
  start: number,
  delta: number,
  min: number,
  max: number,
  currentTMin: number,
  currentTMax: number,
): { tMin: number; tMax: number; entered: boolean } | undefined {
  if (Math.abs(delta) < Number.EPSILON) {
    if (start < min || start > max) {
      return undefined;
    }

    return { tMin: currentTMin, tMax: currentTMax, entered: false };
  }

  let t1 = (min - start) / delta;
  let t2 = (max - start) / delta;

  if (t1 > t2) {
    const temp = t1;
    t1 = t2;
    t2 = temp;
  }

  const nextTMin = Math.max(currentTMin, t1);
  const nextTMax = Math.min(currentTMax, t2);
  if (nextTMin > nextTMax) {
    return undefined;
  }

  return {
    tMin: clamp(nextTMin, 0, 1),
    tMax: clamp(nextTMax, 0, 1),
    entered: nextTMin !== currentTMin,
  };
}
