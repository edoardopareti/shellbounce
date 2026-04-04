import {
  FIXED_TIMESTEP_SECONDS,
  SHIELD_COOLDOWN_MS,
  SHIELD_OVERCHARGE_MS,
  TANK_SHIELD_FORWARD_OFFSET,
  TANK_SHIELD_RADIUS,
  TANK_SHIELD_SECTOR_ANGLE_RADIANS,
} from '../../shared/constants.js';
import { distance, normalizeAngleRadians } from '../../shared/math.js';
import type { BulletEntity } from './bullet.js';

export interface ShieldState {
  x: number;
  y: number;
  turretAngle: number;
  isShieldActive: boolean;
  shieldHoldMs: number;
  shieldCooldownMs: number;
  shieldCooldownBlocked: boolean;
  spawnProtectionMs: number;
}

export function updateShieldState(player: ShieldState, shieldHeld: boolean): void {
  const deltaMs = FIXED_TIMESTEP_SECONDS * 1000;
  const wasShieldActive = player.isShieldActive;

  player.shieldCooldownMs = Math.max(0, player.shieldCooldownMs - deltaMs);
  player.shieldCooldownBlocked = shieldHeld && player.shieldCooldownMs > 0;

  if (!shieldHeld || player.shieldCooldownMs > 0) {
    if (wasShieldActive) {
      player.shieldCooldownMs = SHIELD_COOLDOWN_MS;
    }

    player.isShieldActive = false;
    player.shieldHoldMs = 0;
    return;
  }

  player.isShieldActive = true;
  player.shieldHoldMs += deltaMs;

  if (player.shieldHoldMs < SHIELD_OVERCHARGE_MS) {
    return;
  }

  player.isShieldActive = false;
  player.shieldHoldMs = 0;
  player.shieldCooldownMs = SHIELD_COOLDOWN_MS;
  player.shieldCooldownBlocked = false;
}

export function getShieldCenter(player: Pick<ShieldState, 'x' | 'y' | 'turretAngle'>): { x: number; y: number } {
  return {
    x: player.x + Math.cos(player.turretAngle) * TANK_SHIELD_FORWARD_OFFSET,
    y: player.y + Math.sin(player.turretAngle) * TANK_SHIELD_FORWARD_OFFSET,
  };
}

export function isBulletHittingShield(
  bullet: Pick<BulletEntity, 'x' | 'y' | 'radius'>,
  player: Pick<ShieldState, 'x' | 'y' | 'turretAngle' | 'isShieldActive' | 'spawnProtectionMs'>,
): boolean {
  if (!player.isShieldActive && player.spawnProtectionMs <= 0) {
    return false;
  }

  if (player.spawnProtectionMs > 0) {
    return distance(bullet.x, bullet.y, player.x, player.y) <= bullet.radius + TANK_SHIELD_RADIUS;
  }

  const shieldCenter = getShieldCenter(player);
  const distanceToShieldCenter = distance(bullet.x, bullet.y, shieldCenter.x, shieldCenter.y);
  if (distanceToShieldCenter > bullet.radius + TANK_SHIELD_RADIUS) {
    return false;
  }

  const angleToBullet = Math.atan2(bullet.y - shieldCenter.y, bullet.x - shieldCenter.x);
  const delta = normalizeAngleRadians(angleToBullet - player.turretAngle);
  return Math.abs(delta) <= TANK_SHIELD_SECTOR_ANGLE_RADIANS * 0.5;
}

export function deflectBulletByShieldSurfaceNormal(
  bullet: Pick<BulletEntity, 'x' | 'y' | 'vx' | 'vy' | 'radius'>,
  player: Pick<ShieldState, 'x' | 'y' | 'turretAngle' | 'spawnProtectionMs'>,
): void {
  const shieldCenter = player.spawnProtectionMs > 0 ? { x: player.x, y: player.y } : getShieldCenter(player);
  let nx = bullet.x - shieldCenter.x;
  let ny = bullet.y - shieldCenter.y;

  const length = Math.sqrt(nx * nx + ny * ny);
  if (length <= Number.EPSILON) {
    const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
    if (speed > Number.EPSILON) {
      nx = -bullet.vx / speed;
      ny = -bullet.vy / speed;
    } else {
      nx = 1;
      ny = 0;
    }
  } else {
    nx /= length;
    ny /= length;
  }

  const speed = Math.max(Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy), Number.EPSILON);
  bullet.vx = nx * speed;
  bullet.vy = ny * speed;

  const safeDistance = TANK_SHIELD_RADIUS + bullet.radius + 0.5;
  bullet.x = shieldCenter.x + nx * safeDistance;
  bullet.y = shieldCenter.y + ny * safeDistance;
}
