import { PLAYER_TANK_TYPE } from '../../shared/config.js';
import {
  TANK_RADIUS,
  TANK_RESPAWN_DELAY_MS,
  TANK_RESPAWN_PROTECTION_MS,
} from '../../shared/constants.js';
import { ALL_TANK_TYPES, type TankType } from '../../shared/types.js';

export interface PlayerEntity {
  id: string;  // Unique identifier for the player, used for tracking and referencing the player within the game.
  tankType: TankType; // The type of tank the player is using, which may affect their abilities, appearance, and gameplay style.
  kills: number; // The number of kills the player has achieved, used for scoring and ranking purposes.
  deaths: number; // The number of times the player has died, used for scoring and ranking purposes.
  bulletColor: number; // The color of the player's bullets, which may be determined by their tank type and used for visual differentiation in the game.
  x: number; // The current x-coordinate of the player's tank, used for positioning and movement within the game world.
  y: number; // The current y-coordinate of the player's tank, used for positioning and movement within the game world.
  bodyAngle: number; // The current angle of the player's tank body, which affects the direction of movement and interactions with the environment.
  turretAngle: number; // The current angle of the player's tank turret, which affects the direction of firing and interactions with the environment.
  radius: number; // The radius of the player's tank, used for collision detection and interactions with other entities in the game.
  isAlive: boolean; // A boolean indicating whether the player is currently alive in the game, which affects their ability to interact and be targeted by other entities.
  isBot: boolean; // A boolean indicating whether the player is controlled by the AI (bot) or a human player, which may affect their behavior and interactions in the game.
  fireCooldownMs: number; // A timer that tracks the remaining cooldown time before the player can fire their weapon again, used to regulate firing rate and prevent spamming.
  boostRemainingMs: number; // A timer that tracks the remaining duration of the player's boost, used to regulate boost usage and movement speed.
  boostCooldownMs: number; // A timer that tracks the remaining cooldown time before the player can use their boost again, used to prevent continuous boost usage.
  respawnAtMs: number; // The timestamp at which the player will respawn, used to manage respawn timing and delays.
  spawnProtectionMs: number; // A timer that tracks the remaining duration of the player's spawn protection, used to prevent immediate damage after respawning.
  shieldHoldMs: number; // A timer that tracks the remaining duration the player can hold their shield, used to regulate shield usage and defense.
  shieldCooldownMs: number; // A timer that tracks the remaining cooldown time before the player can activate their shield again, used to prevent continuous shield usage.
  isShieldActive: boolean; // A boolean indicating whether the player's shield is currently active, which affects their ability to block or deflect incoming attacks.
  shieldCooldownBlocked: boolean; // A boolean indicating whether the player's shield activation is currently blocked due to cooldown or other conditions, used to manage shield availability.
  fireCooldownBlocked: boolean; // A boolean indicating whether the player's ability to fire is currently blocked due to cooldown or other conditions, used to manage firing availability.
  isChargingShot: boolean; // A boolean indicating whether the player is currently charging a shot, which may affect the power and behavior of their next fired bullet.
  chargeMs: number; // A timer that tracks the duration of the player's current shot charge, used to determine the charge level and effects of their next fired bullet.
}

export function createPlayerEntity(
  playerId: string,
  isBot: boolean,
  spawn: { x: number; y: number },
  tankType: TankType,
): PlayerEntity {
  return {
    id: playerId,
    tankType,
    kills: 0,
    deaths: 0,
    bulletColor: getTankBulletColor(tankType),
    x: spawn.x,
    y: spawn.y,
    bodyAngle: -Math.PI / 2,
    turretAngle: -Math.PI / 2,
    radius: TANK_RADIUS,
    isAlive: true,
    isBot,
    fireCooldownMs: 0,
    boostRemainingMs: 0,
    boostCooldownMs: 0,
    respawnAtMs: 0,
    spawnProtectionMs: 0,
    shieldHoldMs: 0,
    shieldCooldownMs: 0,
    isShieldActive: false,
    shieldCooldownBlocked: false,
    fireCooldownBlocked: false,
    isChargingShot: false,
    chargeMs: 0,
  };
}

export function resolveTankTypeForNewPlayer(
  isBot: boolean,
  playerJoinCounter: number,
  preferredTankType?: TankType,
): TankType {
  if (!isBot) {
    if (preferredTankType !== undefined && ALL_TANK_TYPES.includes(preferredTankType)) {
      return preferredTankType;
    }

    return PLAYER_TANK_TYPE;
  }

  const index = playerJoinCounter % ALL_TANK_TYPES.length;
  return ALL_TANK_TYPES[index];
}

export function resetPlayerForRespawn(player: PlayerEntity, spawn: { x: number; y: number }): void {

  // Reset the player's state for respawn, including position, angles, timers, and status effects,
  // to ensure they re-enter the game in a consistent and expected state.

  player.isAlive = true;
  player.x = spawn.x;
  player.y = spawn.y;
  player.bodyAngle = -Math.PI / 2;
  player.turretAngle = -Math.PI / 2;
  player.respawnAtMs = 0;
  player.spawnProtectionMs = TANK_RESPAWN_PROTECTION_MS;
  player.fireCooldownMs = 0;
  player.boostRemainingMs = 0;
  player.boostCooldownMs = 0;
  player.shieldHoldMs = 0;
  player.shieldCooldownMs = 0;
  player.isShieldActive = false;
  player.shieldCooldownBlocked = false;
  player.fireCooldownBlocked = false;
  player.isChargingShot = false;
  player.chargeMs = 0;
}

export function schedulePlayerRespawn(player: PlayerEntity, nowMs: number): void {
  // Schedule the player's respawn by setting their respawn timer and resetting relevant state.
  player.isAlive = false;
  player.respawnAtMs = nowMs + TANK_RESPAWN_DELAY_MS;
  player.spawnProtectionMs = 0;
  player.isShieldActive = false;
  player.shieldCooldownBlocked = false;
  player.fireCooldownBlocked = false;
  player.shieldHoldMs = 0;
  player.isChargingShot = false;
  player.chargeMs = 0;
}

export function getTankBulletColor(tankType: TankType): number {
  switch (tankType) {
    case 'PolPot':
      return 0x22c55e;
    case 'Hightillery':
      return 0xdc2626;
    case 'SSugar':
      return 0xf8fafc;
    case 'Fantanyl':
      return 0xfacc15;
    default:
      return 0x22c55e;
  }
}
