import type { PlayerEntity } from './player.js';
import type { VolleyWeaponConfig } from './weaponConfig.js';
import {
  type GrappleBulletEntity,
  type GrappleBulletSpawnConfig,
  createGrappleBulletFromBase,
} from './bullet.js';

// Fallback values for grapple bullet properties if not specified in weapon config
const GRAPPLE_BULLET_BASE_SPEED = 420;
const GRAPPLE_BULLET_BASE_EXPLOSION_RADIUS = 84;
const GRAPPLE_BULLET_BASE_MAX_BOUNCES = 3;
const GRAPPLE_BULLET_ARMED_DETONATION_DELAY_MS = 1200;

export interface GrappleBulletConfig {
  speed?: number;
  explosionRadius?: number;
  maxBounces?: number;
  explodeOnWallImpact?: boolean;
  isCharged?: boolean;
  armedDetonationDelayMs?: number;
  manualDetonationMinDelayMs?: number;
}

export function createGrappleBulletEntity(
  id: string,
  player: Pick<PlayerEntity, 'id' | 'bulletColor' | 'x' | 'y' | 'turretAngle'>,
  config: GrappleBulletConfig = {},
): GrappleBulletEntity {
  const spawnConfig: GrappleBulletSpawnConfig = {
    speed: config.speed ?? GRAPPLE_BULLET_BASE_SPEED,
    explosionRadius: config.explosionRadius ?? GRAPPLE_BULLET_BASE_EXPLOSION_RADIUS,
    maxBounces: config.maxBounces ?? GRAPPLE_BULLET_BASE_MAX_BOUNCES,
    explodeOnWallImpact: config.explodeOnWallImpact ?? false,
    isCharged: config.isCharged ?? false,
    armedDetonationDelayMs: config.armedDetonationDelayMs ?? GRAPPLE_BULLET_ARMED_DETONATION_DELAY_MS,
    manualDetonationMinDelayMs: config.manualDetonationMinDelayMs ?? 0,
  };

  return createGrappleBulletFromBase(id, player, spawnConfig);
}

/**
 * Creates a volley of GrappleBullets at angle offsets from the player's turret.
 * Used by GrappleGun for both normal and charged shots.
 */
export function createGrappleVolley(
  player: PlayerEntity,
  config: {
    speed: number;
    explosionRadius: number;
    maxBounces: number;
    explodeOnWallImpact: boolean;
    isCharged: boolean;
  },
  volleyConfig: Pick<
    VolleyWeaponConfig,
    'volleyAngleOffsetsRadians' | 'grappleArmedDetonationDelayMs' | 'grappleManualDetonationMinDelayMs'
  >,
  nextBulletId: () => string,
): GrappleBulletEntity[] {
  const angles = volleyConfig.volleyAngleOffsetsRadians.map(
    (offset) => player.turretAngle + offset,
  );

  return angles.map((turretAngle) => createGrappleBulletEntity(
    nextBulletId(),
    { ...player, turretAngle },
    {
      ...config,
      armedDetonationDelayMs: volleyConfig.grappleArmedDetonationDelayMs,
      manualDetonationMinDelayMs: volleyConfig.grappleManualDetonationMinDelayMs,
    },
  ));
}
