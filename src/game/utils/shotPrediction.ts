import Phaser from 'phaser';
import type { Wall } from '../map/types';

interface HitResult {
  collisionX: number;
  collisionY: number;
  axis: 'x' | 'y';
}

export interface PredictedSegment {
  start: Phaser.Math.Vector2;
  end: Phaser.Math.Vector2;
}

export interface PredictedTrajectory {
  segments: PredictedSegment[];
}

export function predictBulletTrajectory(
  origin: Phaser.Math.Vector2,
  angle: number,
  walls: readonly Wall[],
  bulletRadius: number,
  maxReflections: number,
  maxDistance: number,
): PredictedTrajectory {
  const segments: PredictedSegment[] = [];
  const direction = new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle));
  const current = origin.clone();

  let remainingDistance = maxDistance;
  let reflectionsUsed = 0;

  while (remainingDistance > 0.001) {
    const proposed = current.clone().add(direction.clone().scale(remainingDistance));
    const hit = findFirstCollision(current, proposed, walls, bulletRadius);

    if (hit === undefined) {
      segments.push({ start: current.clone(), end: proposed });
      break;
    }

    const hitPoint = new Phaser.Math.Vector2(hit.collisionX, hit.collisionY);
    segments.push({ start: current.clone(), end: hitPoint.clone() });

    const traveledDistance = Phaser.Math.Distance.Between(current.x, current.y, hit.collisionX, hit.collisionY);
    remainingDistance -= traveledDistance;

    if (reflectionsUsed >= maxReflections || remainingDistance <= 0.001) {
      break;
    }

    if (hit.axis === 'x') {
      direction.x *= -1;
    } else {
      direction.y *= -1;
    }

    const nudge = direction.clone().scale(0.5);
    current.copy(hitPoint).add(nudge);
    reflectionsUsed += 1;
  }

  return { segments };
}

export function getClosestDistanceToTrajectory(
  point: Phaser.Math.Vector2,
  trajectory: PredictedTrajectory,
): number {
  let bestDistanceSquared = Number.POSITIVE_INFINITY;

  for (const segment of trajectory.segments) {
    const distanceSquared = distanceSquaredToSegment(point, segment.start, segment.end);
    if (distanceSquared < bestDistanceSquared) {
      bestDistanceSquared = distanceSquared;
    }
  }

  return Math.sqrt(bestDistanceSquared);
}

function distanceSquaredToSegment(
  point: Phaser.Math.Vector2,
  segmentStart: Phaser.Math.Vector2,
  segmentEnd: Phaser.Math.Vector2,
): number {
  const segment = segmentEnd.clone().subtract(segmentStart);
  const pointOffset = point.clone().subtract(segmentStart);
  const segmentLengthSquared = segment.lengthSq();

  if (segmentLengthSquared <= Number.EPSILON) {
    return Phaser.Math.Distance.Squared(point.x, point.y, segmentStart.x, segmentStart.y);
  }

  const t = Phaser.Math.Clamp(pointOffset.dot(segment) / segmentLengthSquared, 0, 1);
  const closestX = segmentStart.x + segment.x * t;
  const closestY = segmentStart.y + segment.y * t;

  return Phaser.Math.Distance.Squared(point.x, point.y, closestX, closestY);
}

function findFirstCollision(
  start: Phaser.Math.Vector2,
  end: Phaser.Math.Vector2,
  walls: readonly Wall[],
  bulletRadius: number,
): HitResult | undefined {
  let bestHit: HitResult | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const wall of walls) {
    const expandedRect = new Phaser.Geom.Rectangle(
      wall.x - bulletRadius,
      wall.y - bulletRadius,
      wall.width + bulletRadius * 2,
      wall.height + bulletRadius * 2,
    );

    const hit = intersectSegmentWithRectangle(start, end, expandedRect);
    if (hit === undefined) {
      continue;
    }

    const distance = Phaser.Math.Distance.Between(start.x, start.y, hit.collisionX, hit.collisionY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestHit = hit;
    }
  }

  return bestHit;
}

function intersectSegmentWithRectangle(
  start: Phaser.Math.Vector2,
  end: Phaser.Math.Vector2,
  rect: Phaser.Geom.Rectangle,
): HitResult | undefined {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  let tMin = 0;
  let tMax = 1;
  let enterAxis: 'x' | 'y' = 'x';

  const xResult = clipAxis(start.x, dx, rect.left, rect.right, tMin, tMax);
  if (xResult === undefined) {
    return undefined;
  }
  tMin = xResult.tMin;
  tMax = xResult.tMax;
  if (xResult.entered) {
    enterAxis = 'x';
  }

  const yResult = clipAxis(start.y, dy, rect.top, rect.bottom, tMin, tMax);
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

  const collisionX = start.x + dx * tMin;
  const collisionY = start.y + dy * tMin;

  return { collisionX, collisionY, axis: enterAxis };
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

  const inverseDelta = 1 / delta;
  let t1 = (min - start) * inverseDelta;
  let t2 = (max - start) * inverseDelta;

  if (t1 > t2) {
    [t1, t2] = [t2, t1];
  }

  const nextTMin = Math.max(currentTMin, t1);
  const nextTMax = Math.min(currentTMax, t2);

  if (nextTMin > nextTMax) {
    return undefined;
  }

  return {
    tMin: nextTMin,
    tMax: nextTMax,
    entered: nextTMin !== currentTMin,
  };
}
