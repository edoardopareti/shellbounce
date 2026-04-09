import { FIXED_TIMESTEP_SECONDS } from '../../shared/constants.js';
import { distance, normalizeAngleRadians } from '../../shared/math.js';
import type { BulletEntity } from './bullet.js';

export interface ShieldConfig {
  radius: number;
  forwardOffset: number;
  sectorAngleRadians: number;
  cooldownMs: number;
  overchargeMs: number;
  mode: 'sector' | 'omnidirectional';
}

export interface ShieldOwnerPose {
  x: number;
  y: number;
  turretAngle: number;
}

export abstract class Shield {
  private holdMs = 0;
  private cooldownMs = 0;
  private active = false;
  private cooldownBlocked = false;
  private forcedActive = false;

  public constructor(private readonly shieldConfig: ShieldConfig) {}

  public get isActive(): boolean {
    return this.active || this.forcedActive;
  }

  public get holdDurationMs(): number {
    return this.holdMs;
  }

  public get cooldownDurationMs(): number {
    return this.cooldownMs;
  }

  public get isCooldownBlocked(): boolean {
    return this.cooldownBlocked;
  }

  public get radius(): number {
    return this.shieldConfig.radius;
  }

  public get forwardOffset(): number {
    return this.shieldConfig.forwardOffset;
  }

  public get sectorAngleRadians(): number {
    return this.shieldConfig.sectorAngleRadians;
  }

  public get mode(): ShieldConfig['mode'] {
    return this.shieldConfig.mode;
  }

  public reset(): void {
    this.holdMs = 0;
    this.cooldownMs = 0;
    this.active = false;
    this.cooldownBlocked = false;
  }

  public deactivate(): void {
    this.active = false;
    this.cooldownBlocked = false;
    this.holdMs = 0;
  }

  public setForcedActive(active: boolean): void {
    this.forcedActive = active;
  }

  public update(shieldHeld: boolean): void {
    const deltaMs = FIXED_TIMESTEP_SECONDS * 1000;
    const wasActive = this.active;

    this.cooldownMs = Math.max(0, this.cooldownMs - deltaMs);
    this.cooldownBlocked = shieldHeld && this.cooldownMs > 0;

    if (!shieldHeld || this.cooldownMs > 0) {
      if (wasActive) {
        this.cooldownMs = this.shieldConfig.cooldownMs;
      }

      this.active = false;
      this.holdMs = 0;
      return;
    }

    this.active = true;
    this.holdMs += deltaMs;

    if (this.holdMs < this.shieldConfig.overchargeMs) {
      return;
    }

    this.active = false;
    this.holdMs = 0;
    this.cooldownMs = this.shieldConfig.cooldownMs;
    this.cooldownBlocked = false;
  }

  public isBulletHitting(
    bullet: Pick<BulletEntity, 'x' | 'y' | 'radius'>,
    owner: ShieldOwnerPose,
  ): boolean {
    if (!this.isActive) {
      return false;
    }

    if (this.shieldConfig.mode === 'omnidirectional') {
      return distance(bullet.x, bullet.y, owner.x, owner.y) <= bullet.radius + this.shieldConfig.radius;
    }

    const shieldCenter = this.getCenter(owner);
    const distanceToShieldCenter = distance(bullet.x, bullet.y, shieldCenter.x, shieldCenter.y);
    if (distanceToShieldCenter > bullet.radius + this.shieldConfig.radius) {
      return false;
    }

    const angleToBullet = Math.atan2(bullet.y - shieldCenter.y, bullet.x - shieldCenter.x);
    const delta = normalizeAngleRadians(angleToBullet - owner.turretAngle);
    return Math.abs(delta) <= this.shieldConfig.sectorAngleRadians * 0.5;
  }

  public deflectBulletBySurfaceNormal(
    bullet: Pick<BulletEntity, 'x' | 'y' | 'vx' | 'vy' | 'radius'>,
    owner: ShieldOwnerPose,
  ): void {
    const shieldCenter = this.shieldConfig.mode === 'omnidirectional' ? { x: owner.x, y: owner.y } : this.getCenter(owner);
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

    const safeDistance = this.shieldConfig.radius + bullet.radius + 0.5;
    bullet.x = shieldCenter.x + nx * safeDistance;
    bullet.y = shieldCenter.y + ny * safeDistance;
  }

  private getCenter(owner: Pick<ShieldOwnerPose, 'x' | 'y' | 'turretAngle'>): { x: number; y: number } {
    return {
      x: owner.x + Math.cos(owner.turretAngle) * this.shieldConfig.forwardOffset,
      y: owner.y + Math.sin(owner.turretAngle) * this.shieldConfig.forwardOffset,
    };
  }
}
