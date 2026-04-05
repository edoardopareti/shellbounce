import {
  BULLET_EXPLOSION_RADIUS,
  BULLET_MAX_BOUNCES,
  BULLET_RADIUS,
  BULLET_SPEED,
} from '../../shared/constants.js';
import type { PlayerEntity } from './player.js';
import type { BulletEntity } from './bullet.js';
import { createBulletEntity } from './bullet.js';

const MITOSIS_SPLIT_ANGLE_RADIANS = Math.PI / 4;
const MITOSIS_SPLIT_RADIUS_MULTIPLIER = 0.72;
const MITOSIS_SPLIT_EXPLOSION_RADIUS_MULTIPLIER = 0.8;

export interface MitosisBulletSpawnConfig {
  speed?: number;
  explosionRadius?: number;
  maxBounces?: number;
  explodeOnWallImpact?: boolean;
  isCharged?: boolean;
}

export function createMitosisBulletEntity(
  id: string,
  player: Pick<PlayerEntity, 'id' | 'bulletColor' | 'x' | 'y' | 'turretAngle'>,
  config: MitosisBulletSpawnConfig = {},
): BulletEntity {
  return createBulletEntity(id, player, {
    speed: config.speed ?? BULLET_SPEED,
    explosionRadius: config.explosionRadius ?? BULLET_EXPLOSION_RADIUS,
    maxBounces: config.maxBounces ?? BULLET_MAX_BOUNCES,
    explodeOnWallImpact: config.explodeOnWallImpact ?? false,
    isCharged: config.isCharged ?? false,
    kind: 'mitosis',
    mitosisGeneration: 0,
  });
}

export function splitMitosisBulletEntity(
  bullet: BulletEntity,
  leftId: string,
  rightId: string,
): BulletEntity[] {
  if (bullet.kind !== 'mitosis' || bullet.mitosisGeneration > 0) {
    return [];
  }

  const speed = Math.hypot(bullet.vx, bullet.vy);
  const baseAngle = Math.atan2(bullet.vy, bullet.vx);
  const splitRadius = Math.max(BULLET_RADIUS * 0.55, bullet.radius * MITOSIS_SPLIT_RADIUS_MULTIPLIER);
  const splitExplosionRadius = bullet.explosionRadius * MITOSIS_SPLIT_EXPLOSION_RADIUS_MULTIPLIER;

  const createSplitChild = (id: string, angleDelta: number): BulletEntity => {
    const direction = baseAngle + angleDelta;
    return {
      ...bullet,
      id,
      x: bullet.x,
      y: bullet.y,
      vx: Math.cos(direction) * speed,
      vy: Math.sin(direction) * speed,
      radius: splitRadius,
      explosionRadius: splitExplosionRadius,
      bouncesRemaining: Math.max(0, bullet.bouncesRemaining),
      kind: 'mitosis',
      mitosisGeneration: 1,
    };
  };

  return [
    createSplitChild(leftId, MITOSIS_SPLIT_ANGLE_RADIANS),
    createSplitChild(rightId, -MITOSIS_SPLIT_ANGLE_RADIANS),
  ];
}
