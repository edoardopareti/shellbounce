import type { PlayerEntity } from './player.js';
import {
  type LaserBulletEntity,
  type LaserBulletSpawnConfig,
  createLaserBulletFromBase,
} from './bullet.js';

// Fallback values for laser bullet properties if not specified in weapon config
const LASER_BULLET_BASE_SPEED = 760;
const LASER_BULLET_BASE_EXPLOSION_RADIUS = 70;
const LASER_BULLET_BASE_MAX_BOUNCES = 2;
const LASER_BULLET_BASE_LENGTH = 82;
const LASER_BULLET_BASE_RADIUS = 4;

export interface LaserBulletConfig {
  speed?: number;
  explosionRadius?: number;
  maxBounces?: number;
  explodeOnWallImpact?: boolean;
  isCharged?: boolean;
  laserLength?: number;
  radius?: number;
  maxLifetimeMs?: number;
}

export function createLaserBulletEntity(
  id: string,
  player: Pick<PlayerEntity, 'id' | 'bulletColor' | 'x' | 'y' | 'turretAngle'>,
  config: LaserBulletConfig = {},
): LaserBulletEntity {
  const spawnConfig: LaserBulletSpawnConfig = {
    speed: config.speed ?? LASER_BULLET_BASE_SPEED,
    explosionRadius: config.explosionRadius ?? LASER_BULLET_BASE_EXPLOSION_RADIUS,
    maxBounces: config.maxBounces ?? LASER_BULLET_BASE_MAX_BOUNCES,
    explodeOnWallImpact: config.explodeOnWallImpact ?? false,
    isCharged: config.isCharged ?? false,
    laserLength: config.laserLength ?? LASER_BULLET_BASE_LENGTH,
    radius: config.radius ?? LASER_BULLET_BASE_RADIUS,
    maxLifetimeMs: config.maxLifetimeMs,
  };

  return createLaserBulletFromBase(id, player, spawnConfig);
}
