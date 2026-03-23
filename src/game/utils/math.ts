export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeAngleRadians(angle: number): number {
  while (angle <= -Math.PI) {
    angle += Math.PI * 2;
  }

  while (angle > Math.PI) {
    angle -= Math.PI * 2;
  }

  return angle;
}
