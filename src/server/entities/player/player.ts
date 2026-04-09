import { PLAYER_TANK_TYPE } from '../../../shared/config.js';
import {
  TANK_RESPAWN_DELAY_MS,
  TANK_RESPAWN_PROTECTION_MS,
} from '../../../shared/constants.js';
import {
  DEFAULT_SHIELD_BY_TANK,
  ALL_TANK_TYPES,
  type ShieldType,
  DEFAULT_WEAPON_BY_TANK,
  type TankType,
  type WeaponType,
} from '../../../shared/types.js';
import type { Mine } from '../mines/mine.js';
import type { Shield } from '../shields/shield.js';
import type { Weapon } from '../weapons/weapon.js';
import { createTankByType } from '../tanks/tankFactory.js';
import type { Tank } from '../tanks/tank.js';
import { FANTANYL_TANK_CONFIG } from '../tanks/fantanylTank.js';
import { HIGHTILLERY_TANK_CONFIG } from '../tanks/hightillerytank.js';
import { POLPOT_TANK_CONFIG } from '../tanks/polPotTank.js';
import { SSUGAR_TANK_CONFIG } from '../tanks/ssugarTank.js';

export interface PlayerEntity {
  id: string;
  kills: number;
  deaths: number;
  respawnAtMs: number;
  tank: Tank;
}

export function createPlayerEntity(
  playerId: string,
  isBot: boolean,
  spawn: { x: number; y: number },
  tankType: TankType,
  weaponType: WeaponType,
  shieldType: ShieldType,
  weapon: Weapon,
  mine: Mine,
  shield: Shield,
  respawnShield: Shield,
): PlayerEntity {
  return {
    id: playerId,
    kills: 0,
    deaths: 0,
    respawnAtMs: 0,
    tank: createTankByType(tankType, weaponType, shieldType, weapon, mine, shield, respawnShield, isBot, spawn),
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

export function resolveWeaponTypeForNewPlayer(
  isBot: boolean,
  playerJoinCounter: number,
  tankType: TankType,
  preferredWeaponType?: WeaponType,
): WeaponType {
  if (!isBot && preferredWeaponType !== undefined) {
    return preferredWeaponType;
  }

  if (isBot && preferredWeaponType === undefined) {
    const index = playerJoinCounter % ALL_TANK_TYPES.length;
    const botTankType = ALL_TANK_TYPES[index];
    return DEFAULT_WEAPON_BY_TANK[botTankType];
  }

  return preferredWeaponType ?? DEFAULT_WEAPON_BY_TANK[tankType];
}

export function resolveShieldTypeForNewPlayer(
  isBot: boolean,
  playerJoinCounter: number,
  tankType: TankType,
  preferredShieldType?: ShieldType,
): ShieldType {
  if (!isBot && preferredShieldType !== undefined) {
    return preferredShieldType;
  }

  if (isBot && preferredShieldType === undefined) {
    const index = playerJoinCounter % ALL_TANK_TYPES.length;
    const botTankType = ALL_TANK_TYPES[index];
    return DEFAULT_SHIELD_BY_TANK[botTankType];
  }

  return preferredShieldType ?? DEFAULT_SHIELD_BY_TANK[tankType];
}

export function getTankRadiusForType(tankType: TankType): number {
  switch (tankType) {
    case 'PolPot':
      return POLPOT_TANK_CONFIG.radius;
    case 'Hightillery':
      return HIGHTILLERY_TANK_CONFIG.radius;
    case 'SSugar':
      return SSUGAR_TANK_CONFIG.radius;
    case 'Fantanyl':
      return FANTANYL_TANK_CONFIG.radius;
    default:
      return POLPOT_TANK_CONFIG.radius;
  }
}

export function resetPlayerForRespawn(player: PlayerEntity, spawn: { x: number; y: number }): void {

  // Reset the player's state for respawn, including position, angles, timers, and status effects,
  // to ensure they re-enter the game in a consistent and expected state.

  player.tank.isAlive = true;
  player.tank.x = spawn.x;
  player.tank.y = spawn.y;
  player.tank.bodyAngle = -Math.PI / 2;
  player.tank.turretAngle = -Math.PI / 2;
  player.respawnAtMs = 0;
  player.tank.spawnProtectionMs = TANK_RESPAWN_PROTECTION_MS;
  player.tank.fireCooldownMs = 0;
  player.tank.boostRemainingMs = 0;
  player.tank.boostCooldownMs = 0;
  player.tank.shield.reset();
  player.tank.respawnShield.reset();
  player.tank.respawnShield.setForcedActive(true);
  player.tank.fireCooldownBlocked = false;
  player.tank.isChargingShot = false;
  player.tank.chargeMs = 0;
}

export function schedulePlayerRespawn(player: PlayerEntity, nowMs: number): void {
  // Schedule the player's respawn by setting their respawn timer and resetting relevant state.
  player.tank.isAlive = false;
  player.respawnAtMs = nowMs + TANK_RESPAWN_DELAY_MS;
  player.tank.spawnProtectionMs = 0;
  player.tank.shield.deactivate();
  player.tank.respawnShield.setForcedActive(false);
  player.tank.respawnShield.deactivate();
  player.tank.fireCooldownBlocked = false;
  player.tank.isChargingShot = false;
  player.tank.chargeMs = 0;
}
