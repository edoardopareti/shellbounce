import { PLAYER_TANK_TYPE } from '../../shared/config.js';
import {
  TANK_RADIUS,
  TANK_RESPAWN_DELAY_MS,
  TANK_RESPAWN_PROTECTION_MS,
} from '../../shared/constants.js';
import { ALL_TANK_TYPES, type TankType } from '../../shared/types.js';

export interface PlayerEntity {
  id: string;
  tankType: TankType;
  kills: number;
  deaths: number;
  bulletColor: number;
  x: number;
  y: number;
  bodyAngle: number;
  turretAngle: number;
  radius: number;
  isAlive: boolean;
  isBot: boolean;
  fireCooldownMs: number;
  boostRemainingMs: number;
  boostCooldownMs: number;
  respawnAtMs: number;
  spawnProtectionMs: number;
  shieldHoldMs: number;
  shieldCooldownMs: number;
  isShieldActive: boolean;
  shieldCooldownBlocked: boolean;
  fireCooldownBlocked: boolean;
  isChargingShot: boolean;
  chargeMs: number;
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
