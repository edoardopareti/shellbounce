import type { PlayerEntity } from './player.js';
import type { BulletEntity, MitosisBulletEntity } from './bullet.js';
import {
  DEFAULT_BULLET_RADIUS,
  createMitosisBulletFromBase,
} from './bullet.js';

const MITOSIS_SPLIT_ANGLE_RADIANS = Math.PI / 4;
const MITOSIS_SPLIT_RADIUS_MULTIPLIER = 0.72;
const MITOSIS_SPLIT_EXPLOSION_RADIUS_MULTIPLIER = 0.8;
const MITOSIS_BULLET_BASE_SPEED = 420;
const MITOSIS_BULLET_BASE_EXPLOSION_RADIUS = 84;
const MITOSIS_BULLET_BASE_MAX_BOUNCES = 3;
const MITOSIS_BULLET_BASE_RADIUS = 0.55;

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
): MitosisBulletEntity {
  return createMitosisBulletFromBase(id, player, {
    speed: config.speed ?? MITOSIS_BULLET_BASE_SPEED,
    explosionRadius: config.explosionRadius ?? MITOSIS_BULLET_BASE_EXPLOSION_RADIUS,
    maxBounces: config.maxBounces ?? MITOSIS_BULLET_BASE_MAX_BOUNCES,
    explodeOnWallImpact: config.explodeOnWallImpact ?? false,
    isCharged: config.isCharged ?? false,
    mitosisGeneration: 0,
  });
}

export function splitMitosisBulletEntity(
  bullet: BulletEntity,
  leftId: string,
  rightId: string,
): MitosisBulletEntity[] {
  if (bullet.kind !== 'mitosis' || bullet.mitosisGeneration > 0) {
    return [];
  }

  const speed = Math.hypot(bullet.vx, bullet.vy);
  const baseAngle = Math.atan2(bullet.vy, bullet.vx);
  const splitRadius = Math.max(DEFAULT_BULLET_RADIUS * MITOSIS_BULLET_BASE_RADIUS,
    bullet.radius * MITOSIS_SPLIT_RADIUS_MULTIPLIER);
  const splitExplosionRadius = bullet.explosionRadius * MITOSIS_SPLIT_EXPLOSION_RADIUS_MULTIPLIER;

  const createSplitChild = (id: string, angleDelta: number): MitosisBulletEntity => {
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
