import Phaser from 'phaser';
import {
  BULLET_EXPLOSION_RADIUS,
  BULLET_LIFETIME_MS,
  BULLET_MAX_BOUNCES,
  BULLET_RADIUS,
  BULLET_SPEED,
} from '../constants';
import type { Wall } from '../map/types';

export interface BulletConfig {
  color?: number;
  speed?: number;
  maxBounces?: number;
  explosionRadius?: number;
  explodeOnWallImpact?: boolean;
  isCharged?: boolean;
}

interface HitResult {
  collisionX: number;
  collisionY: number;
  axis: 'x' | 'y';
}

export class Bullet {
  public readonly ownerTankId: string;
  public readonly sprite: Phaser.GameObjects.Arc;
  public readonly radius: number;
  public readonly explosionRadius: number;
  public readonly explodeOnWallImpact: boolean;
  public readonly isCharged: boolean;
  public bouncesRemaining: number;
  public isAlive = true;

  private readonly velocity = new Phaser.Math.Vector2();
  private lifetimeMs = 0;
  private position: Phaser.Math.Vector2;
  private chargedAura: Phaser.GameObjects.Arc | undefined;

  public constructor(
    private readonly scene: Phaser.Scene,
    ownerTankId: string,
    x: number,
    y: number,
    angle: number,
    config?: BulletConfig,
  ) {
    const speed = config?.speed ?? BULLET_SPEED;
    const color = config?.color ?? 0xfbbf24;

    this.ownerTankId = ownerTankId;
    this.radius = BULLET_RADIUS;
    this.explosionRadius = config?.explosionRadius ?? BULLET_EXPLOSION_RADIUS;
    this.explodeOnWallImpact = config?.explodeOnWallImpact ?? false;
    this.isCharged = config?.isCharged ?? false;
    this.bouncesRemaining = config?.maxBounces ?? BULLET_MAX_BOUNCES;
    this.position = new Phaser.Math.Vector2(x, y);
    this.velocity.setToPolar(angle, speed);
    this.sprite = this.scene.add.circle(x, y, this.radius, color);
    this.sprite.setDepth(3);

    if (this.isCharged) {
      this.sprite.setStrokeStyle(2, 0xfef08a, 0.75);
      this.chargedAura = this.scene.add.circle(x, y, this.radius + 4, 0xf97316, 0.3);
      this.chargedAura.setDepth(2.9);
      this.chargedAura.setBlendMode(Phaser.BlendModes.ADD);
    }
  }

  public update(deltaSeconds: number, walls: readonly Wall[]): boolean {
    if (!this.isAlive) {
      return false;
    }

    const previousPosition = this.position.clone();
    const displacement = this.velocity.clone().scale(deltaSeconds);
    const proposedPosition = previousPosition.clone().add(displacement);
    const hit = this.findFirstCollision(previousPosition, proposedPosition, walls);

    if (hit !== undefined) {
      this.position.set(hit.collisionX, hit.collisionY);

      if (this.explodeOnWallImpact) {
        this.sprite.setPosition(this.position.x, this.position.y);
        return true;
      }

      this.reflect(hit.axis);
      this.bouncesRemaining -= 1;

      if (this.bouncesRemaining < 0) {
        this.destroy();
        return false;
      }

      const remainingMovement = previousPosition.distance(proposedPosition) - previousPosition.distance(this.position);
      if (remainingMovement > 0) {
        const direction = this.velocity.clone().normalize();
        this.position.add(direction.scale(remainingMovement * 0.95));
      }
    } else {
      this.position.copy(proposedPosition);
    }

    this.lifetimeMs += deltaSeconds * 1000;
    if (this.lifetimeMs >= BULLET_LIFETIME_MS) {
      this.destroy();
      return false;
    }

    this.sprite.setPosition(this.position.x, this.position.y);
    if (this.chargedAura !== undefined) {
      const pulse = 1 + Math.sin(this.lifetimeMs * 0.02) * 0.22;
      this.chargedAura.setPosition(this.position.x, this.position.y);
      this.chargedAura.setScale(pulse);
      this.chargedAura.setAlpha(0.18 + (pulse - 0.78) * 0.25);
    }

    return false;
  }

  public get x(): number {
    return this.position.x;
  }

  public get y(): number {
    return this.position.y;
  }

  public get velocityX(): number {
    return this.velocity.x;
  }

  public get velocityY(): number {
    return this.velocity.y;
  }

  public get speed(): number {
    return this.velocity.length();
  }

  private reflect(axis: 'x' | 'y'): void {
    if (axis === 'x') {
      this.velocity.x *= -1;
    } else {
      this.velocity.y *= -1;
    }
  }

  private findFirstCollision(
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    walls: readonly Wall[],
  ): HitResult | undefined {
    let bestHit: HitResult | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const wall of walls) {
      const expandedRect = new Phaser.Geom.Rectangle(
        wall.x - this.radius,
        wall.y - this.radius,
        wall.width + this.radius * 2,
        wall.height + this.radius * 2,
      );

      const hit = this.intersectSegmentWithRectangle(start, end, expandedRect);
      if (hit === undefined) {
        continue;
      }

      const distance = Phaser.Math.Distance.Between(start.x, start.y, hit.collisionX, hit.collisionY);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestHit = hit;
      }
    }

    return bestHit;
  }

  private intersectSegmentWithRectangle(
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    rect: Phaser.Geom.Rectangle,
  ): HitResult | undefined {
    const dx = end.x - start.x;
    const dy = end.y - start.y;

    let tMin = 0;
    let tMax = 1;
    let enterAxis: 'x' | 'y' = 'x';

    const xResult = this.clipAxis(start.x, dx, rect.left, rect.right, tMin, tMax);
    if (xResult === undefined) {
      return undefined;
    }
    tMin = xResult.tMin;
    tMax = xResult.tMax;
    if (xResult.entered) {
      enterAxis = 'x';
    }

    const yResult = this.clipAxis(start.y, dy, rect.top, rect.bottom, tMin, tMax);
    if (yResult === undefined) {
      return undefined;
    }
    if (yResult.entered) {
      enterAxis = 'y';
    }
    tMin = yResult.tMin;
    tMax = yResult.tMax;

    if (tMin < 0 || tMin > 1) {
      return undefined;
    }

    const collisionX = start.x + dx * tMin;
    const collisionY = start.y + dy * tMin;

    return { collisionX, collisionY, axis: enterAxis };
  }

  private clipAxis(
    start: number,
    delta: number,
    min: number,
    max: number,
    currentTMin: number,
    currentTMax: number,
  ): { tMin: number; tMax: number; entered: boolean } | undefined {
    if (Math.abs(delta) < Number.EPSILON) {
      if (start < min || start > max) {
        return undefined;
      }

      return { tMin: currentTMin, tMax: currentTMax, entered: false };
    }

    const inverseDelta = 1 / delta;
    let t1 = (min - start) * inverseDelta;
    let t2 = (max - start) * inverseDelta;

    if (t1 > t2) {
      [t1, t2] = [t2, t1];
    }

    const nextTMin = Math.max(currentTMin, t1);
    const nextTMax = Math.min(currentTMax, t2);

    if (nextTMin > nextTMax) {
      return undefined;
    }

    return {
      tMin: nextTMin,
      tMax: nextTMax,
      entered: nextTMin !== currentTMin,
    };
  }

  public destroy(): void {
    // Remove the bullet from the game by marking it as no longer alive
    // and destroying its visual representation (sprite).
    if (!this.isAlive) {
      return;
    }

    this.isAlive = false;
    this.chargedAura?.destroy();
    this.sprite.destroy();
  }
}
