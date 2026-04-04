export function segmentIntersectsRectangle(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  rect: { x: number; y: number; width: number; height: number },
): boolean {
  const dx = endX - startX;
  const dy = endY - startY;

  let tMin = 0;
  let tMax = 1;

  const xResult = clipSegmentAxis(startX, dx, rect.x, rect.x + rect.width, tMin, tMax);
  if (xResult === undefined) {
    return false;
  }

  tMin = xResult.tMin;
  tMax = xResult.tMax;

  const yResult = clipSegmentAxis(startY, dy, rect.y, rect.y + rect.height, tMin, tMax);
  if (yResult === undefined) {
    return false;
  }

  tMin = yResult.tMin;
  tMax = yResult.tMax;
  return tMin <= tMax && tMax >= 0 && tMin <= 1;
}

function clipSegmentAxis(
  start: number,
  delta: number,
  min: number,
  max: number,
  currentTMin: number,
  currentTMax: number,
): { tMin: number; tMax: number } | undefined {
  if (Math.abs(delta) < Number.EPSILON) {
    if (start < min || start > max) {
      return undefined;
    }

    return { tMin: currentTMin, tMax: currentTMax };
  }

  let t1 = (min - start) / delta;
  let t2 = (max - start) / delta;

  if (t1 > t2) {
    const temp = t1;
    t1 = t2;
    t2 = temp;
  }

  const tMin = Math.max(currentTMin, t1);
  const tMax = Math.min(currentTMax, t2);

  if (tMin > tMax) {
    return undefined;
  }

  return { tMin, tMax };
}
