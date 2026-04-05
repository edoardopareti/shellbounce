import {
  BULLET_RADIUS,
  MUZZLE_OFFSET,
} from '../../shared/constants.js';
import type { PlayerEntity } from './player.js';

export type BulletKind = 'standard' | 'mitosis';

export interface BulletEntity {
  id: string;
  ownerPlayerId: string;
  color: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  lifetimeMs: number;
  bouncesRemaining: number;
  explosionRadius: number;
  explodeOnWallImpact: boolean;
  isCharged: boolean;
  kind: BulletKind;
  mitosisGeneration: number;
}

export interface BulletSpawnConfig {
  speed: number;
  explosionRadius: number;
  maxBounces: number;
  explodeOnWallImpact: boolean;
  isCharged: boolean;
  kind?: BulletKind;
  mitosisGeneration?: number;
}

export function createBulletEntity(
  id: string,
  player: Pick<PlayerEntity, 'id' | 'bulletColor' | 'x' | 'y' | 'turretAngle'>,
  config: BulletSpawnConfig,
): BulletEntity {
  const spawnX = player.x + Math.cos(player.turretAngle) * MUZZLE_OFFSET;
  const spawnY = player.y + Math.sin(player.turretAngle) * MUZZLE_OFFSET;

  return {
    id,
    ownerPlayerId: player.id,
    color: player.bulletColor,
    x: spawnX,
    y: spawnY,
    vx: Math.cos(player.turretAngle) * config.speed,
    vy: Math.sin(player.turretAngle) * config.speed,
    radius: BULLET_RADIUS,
    lifetimeMs: 0,
    bouncesRemaining: config.maxBounces,
    explosionRadius: config.explosionRadius,
    explodeOnWallImpact: config.explodeOnWallImpact,
    isCharged: config.isCharged,
    kind: config.kind ?? 'standard',
    mitosisGeneration: config.mitosisGeneration ?? 0,
  };
}
