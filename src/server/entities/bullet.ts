import {
  MUZZLE_OFFSET,
} from '../../shared/constants.js';
import type { PlayerEntity } from './player.js';

// Fallback values for bullet properties if not specified in weapon config
export const DEFAULT_BULLET_RADIUS = 5;
export const DEFAULT_BULLET_MAX_LIFETIME_MS = 4000;

export type BulletKind = 'standard' | 'mitosis' | 'laser' | 'grapple';

export interface BaseBulletEntity {
  id: string;
  ownerPlayerId: string;
  color: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  lifetimeMs: number;
  maxLifetimeMs: number;
  bouncesRemaining: number;
  explosionRadius: number;
  explodeOnWallImpact: boolean;
  isCharged: boolean;
}

export interface StandardBulletEntity extends BaseBulletEntity {
  kind: 'standard';
}

export interface MitosisBulletEntity extends BaseBulletEntity {
  kind: 'mitosis';
  mitosisGeneration: number;
}

export interface LaserBulletEntity extends BaseBulletEntity {
  kind: 'laser';
  laserLength: number;
}

export interface GrappleBulletEntity extends BaseBulletEntity {
  kind: 'grapple';
  isArmed: boolean;
  armedAtMs: number | null;
  armedDetonationDelayMs: number;
  manualDetonationMinDelayMs: number;
}

export type BulletEntity = StandardBulletEntity | MitosisBulletEntity | LaserBulletEntity | GrappleBulletEntity;

export interface BaseBulletSpawnConfig {
  speed: number;
  explosionRadius: number;
  maxBounces: number;
  explodeOnWallImpact: boolean;
  isCharged: boolean;
  radius?: number;
  maxLifetimeMs?: number;
}

export interface BulletSpawnConfig extends BaseBulletSpawnConfig {
  kind?: 'standard';
}

export interface MitosisBulletSpawnConfig extends BaseBulletSpawnConfig {
  mitosisGeneration?: number;
}

export interface LaserBulletSpawnConfig extends BaseBulletSpawnConfig {
  laserLength: number;
}

export interface GrappleBulletSpawnConfig extends BaseBulletSpawnConfig {
  armedDetonationDelayMs: number;
  manualDetonationMinDelayMs: number;
}

function createBaseBulletEntity(
  id: string,
  player: Pick<PlayerEntity, 'id' | 'bulletColor' | 'x' | 'y' | 'turretAngle'>,
  config: BaseBulletSpawnConfig,
): BaseBulletEntity {
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
    radius: config.radius ?? DEFAULT_BULLET_RADIUS,
    lifetimeMs: 0,
    maxLifetimeMs: config.maxLifetimeMs ?? DEFAULT_BULLET_MAX_LIFETIME_MS,
    bouncesRemaining: config.maxBounces,
    explosionRadius: config.explosionRadius,
    explodeOnWallImpact: config.explodeOnWallImpact,
    isCharged: config.isCharged,
  };
}

export function createStandardBulletEntity(
  id: string,
  player: Pick<PlayerEntity, 'id' | 'bulletColor' | 'x' | 'y' | 'turretAngle'>,
  config: BulletSpawnConfig,
): StandardBulletEntity {
  return {
    ...createBaseBulletEntity(id, player, config),
    kind: 'standard',
  };
}

export function createMitosisBulletFromBase(
  id: string,
  player: Pick<PlayerEntity, 'id' | 'bulletColor' | 'x' | 'y' | 'turretAngle'>,
  config: MitosisBulletSpawnConfig,
): MitosisBulletEntity {
  return {
    ...createBaseBulletEntity(id, player, config),
    kind: 'mitosis',
    mitosisGeneration: config.mitosisGeneration ?? 0,
  };
}

export function createLaserBulletFromBase(
  id: string,
  player: Pick<PlayerEntity, 'id' | 'bulletColor' | 'x' | 'y' | 'turretAngle'>,
  config: LaserBulletSpawnConfig,
): LaserBulletEntity {
  return {
    ...createBaseBulletEntity(id, player, config),
    kind: 'laser',
    laserLength: config.laserLength,
  };
}

export function createGrappleBulletFromBase(
  id: string,
  player: Pick<PlayerEntity, 'id' | 'bulletColor' | 'x' | 'y' | 'turretAngle'>,
  config: GrappleBulletSpawnConfig,
): GrappleBulletEntity {
  return {
    ...createBaseBulletEntity(id, player, config),
    kind: 'grapple',
    isArmed: false,
    armedAtMs: null,
    armedDetonationDelayMs: config.armedDetonationDelayMs,
    manualDetonationMinDelayMs: config.manualDetonationMinDelayMs,
  };
}
