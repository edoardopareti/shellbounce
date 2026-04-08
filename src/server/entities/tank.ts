import {
  type TankType,
  type WeaponType,
} from '../../shared/types.js';
import type { Weapon } from './weapon.js';


export interface TankConfig {
  radius: number;
  moveSpeed: number;
  reverseSpeed: number;
  rotationSpeed: number;
  muzzleOffset: number;
  boostMultiplier: number;
  boostDurationMs: number;
  boostCooldownMs: number;
}

export interface TankState {
  x: number;
  y: number;
  bodyAngle: number;
  turretAngle: number;
  isAlive: boolean;
  isBot: boolean;
  fireCooldownMs: number;
  boostRemainingMs: number;
  boostCooldownMs: number;
  spawnProtectionMs: number;
  shieldHoldMs: number;
  shieldCooldownMs: number;
  isShieldActive: boolean;
  shieldCooldownBlocked: boolean;
  fireCooldownBlocked: boolean;
  isChargingShot: boolean;
  chargeMs: number;
}

export abstract class Tank implements TankState {
  public readonly tankType: TankType;
  public readonly weaponType: WeaponType;
  public readonly weapon: Weapon;
  public readonly tankConfig: TankConfig;
  public readonly bulletColor: number;

  public x: number;
  public y: number;
  public bodyAngle: number;
  public turretAngle: number;
  public isAlive: boolean;
  public readonly isBot: boolean;
  public fireCooldownMs: number;
  public boostRemainingMs: number;
  public boostCooldownMs: number;
  public spawnProtectionMs: number;
  public shieldHoldMs: number;
  public shieldCooldownMs: number;
  public isShieldActive: boolean;
  public shieldCooldownBlocked: boolean;
  public fireCooldownBlocked: boolean;
  public isChargingShot: boolean;
  public chargeMs: number;

  protected constructor(
    tankType: TankType,
    weaponType: WeaponType,
    weapon: Weapon,
    bulletColor: number,
    isBot: boolean,
    spawn: { x: number; y: number },
    tankConfig: TankConfig,
  ) {
    this.tankType = tankType;
    this.weaponType = weaponType;
    this.weapon = weapon;
    this.bulletColor = bulletColor;
    this.isBot = isBot;
    this.tankConfig = tankConfig;

    this.x = spawn.x;
    this.y = spawn.y;
    this.bodyAngle = -Math.PI / 2;
    this.turretAngle = -Math.PI / 2;
    this.isAlive = true;
    this.fireCooldownMs = 0;
    this.boostRemainingMs = 0;
    this.boostCooldownMs = 0;
    this.spawnProtectionMs = 0;
    this.shieldHoldMs = 0;
    this.shieldCooldownMs = 0;
    this.isShieldActive = false;
    this.shieldCooldownBlocked = false;
    this.fireCooldownBlocked = false;
    this.isChargingShot = false;
    this.chargeMs = 0;
  }

  public get radius(): number {
    return this.tankConfig.radius;
  }
}




