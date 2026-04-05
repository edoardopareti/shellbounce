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
  x: number;  // The current x-coordinate of the player's tank, used for calculating the shield's position and interactions.
  y: number; // The current y-coordinate of the player's tank, used for calculating the shield's position and interactions.
  turretAngle: number; // The current angle of the player's turret, which determines the orientation of the shield and its interaction with incoming bullets.
  isShieldActive: boolean; // A boolean indicating whether the player's shield is currently active, which affects whether it can block or deflect incoming bullets.
  shieldHoldMs: number; // A timer that tracks how long the shield has been continuously held active, used to determine if the shield should overcharge and deactivate.
  shieldCooldownMs: number; // A timer that tracks the remaining cooldown time before the shield can be activated again.
  shieldCooldownBlocked: boolean; // A boolean indicating whether the shield activation is currently blocked due to cooldown or other conditions.
  spawnProtectionMs: number; // A timer that tracks the remaining spawn protection time, during which the shield behaves differently.
}

export function updateShieldState(player: ShieldState, shieldHeld: boolean): void {
  
  // Update the state of the player's shield based on whether the shield input is currently held,
  // the current cooldown timers, and any overcharge conditions.

  const deltaMs = FIXED_TIMESTEP_SECONDS * 1000;
  const wasShieldActive = player.isShieldActive;
  
  // Decrease the shield cooldown timer if it's above zero
  player.shieldCooldownMs = Math.max(0, player.shieldCooldownMs - deltaMs);

  // Determine if shield activation should be blocked based on whether the shield input is held and if the shield is currently in cooldown.
  player.shieldCooldownBlocked = shieldHeld && player.shieldCooldownMs > 0;
  
  // Compute shield state
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
