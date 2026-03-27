import Phaser from 'phaser';
import { BULLET_LIFETIME_MS, BULLET_MAX_BOUNCES, BULLET_RADIUS, BULLET_SPEED } from '../constants';
import type { Wall } from '../maps/types';

interface HitResult {
  collisionX: number;
  collisionY: number;
  axis: 'x' | 'y';
}

export class Bullet {
  public readonly ownerTankId: string;
  public readonly sprite: Phaser.GameObjects.Arc;
  public readonly radius = BULLET_RADIUS;
  public bouncesRemaining = BULLET_MAX_BOUNCES;
  public isAlive = true;

  private readonly velocity = new Phaser.Math.Vector2();
  private lifetimeMs = 0;
  private position: Phaser.Math.Vector2;

  public constructor(
    private readonly scene: Phaser.Scene,
    ownerTankId: string,
    x: number,
    y: number,
    angle: number,
    color = 0xfbbf24,
  ) {
    this.ownerTankId = ownerTankId;  // Keep track of which tank fired this bullet.
    this.position = new Phaser.Math.Vector2(x, y);  // Initialize the bullet's position based on the provided x and y coordinates.
    this.velocity.setToPolar(angle, BULLET_SPEED);  // Set the bullet's velocity based on the provided angle and speed.
    this.sprite = this.scene.add.circle(x, y, this.radius, color);  // Create the bullet's visual representation as a circle.
    this.sprite.setDepth(3);  // Set the rendering depth of the bullet to ensure it appears above other game elements.
  }

  public update(deltaSeconds: number, walls: readonly Wall[]): void {
    // Update the bullet's position based on its velocity and the elapsed time (deltaSeconds),
    // check for collisions with walls, and handle bouncing and lifetime expiration.

    // If the bullet is not alive (either it has expired or has been destroyed), skip the update logic.
    if (!this.isAlive) {
      return;
    }

    const previousPosition = this.position.clone();
    const displacement = this.velocity.clone().scale(deltaSeconds);
    const proposedPosition = previousPosition.clone().add(displacement);
    const hit = this.findFirstCollision(previousPosition, proposedPosition, walls);

    if (hit !== undefined) {
      this.position.set(hit.collisionX, hit.collisionY);
      this.reflect(hit.axis);
      this.bouncesRemaining -= 1;

      if (this.bouncesRemaining < 0) {
        this.destroy();
        return;
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
      return;
    }

    this.sprite.setPosition(this.position.x, this.position.y);
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
    this.sprite.destroy();
  }
}
