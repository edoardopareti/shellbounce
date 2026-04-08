import {
  type ShieldType,
  type TankType,
  type WeaponType,
} from '../../shared/types.js';
import type { Mine } from './mine.js';
import type { Shield } from './shield.js';
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
  public readonly shieldType: ShieldType;
  public readonly weapon: Weapon;
  public readonly mine: Mine;
  public readonly shield: Shield;
  public readonly respawnShield: Shield;
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
  public fireCooldownBlocked: boolean;
  public isChargingShot: boolean;
  public chargeMs: number;

  protected constructor(
    tankType: TankType,
    weaponType: WeaponType,
    shieldType: ShieldType,
    weapon: Weapon,
    mine: Mine,
    shield: Shield,
    respawnShield: Shield,
    bulletColor: number,
    isBot: boolean,
    spawn: { x: number; y: number },
    tankConfig: TankConfig,
  ) {
    this.tankType = tankType;
    this.weaponType = weaponType;
    this.shieldType = shieldType;
    this.weapon = weapon;
    this.mine = mine;
    this.shield = shield;
    this.respawnShield = respawnShield;
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
    this.fireCooldownBlocked = false;
    this.isChargingShot = false;
    this.chargeMs = 0;
  }

  public get radius(): number {
    return this.tankConfig.radius;
  }

  public get shieldHoldMs(): number {
    return this.shield.holdDurationMs;
  }

  public get shieldCooldownMs(): number {
    return this.shield.cooldownDurationMs;
  }

  public get isShieldActive(): boolean {
    return this.shield.isActive;
  }

  public get shieldCooldownBlocked(): boolean {
    return this.shield.isCooldownBlocked;
  }
}




