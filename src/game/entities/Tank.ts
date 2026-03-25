import Phaser from 'phaser';
import {
  BULLET_EXPLOSION_RADIUS,
  BULLET_SPEED,
  CHARGED_SHOT_COOLDOWN_MS,
  CHARGED_SHOT_MAX_EXPLOSION_MULTIPLIER,
  CHARGED_SHOT_MAX_HOLD_MS,
  CHARGED_SHOT_OVERCHARGE_MS,
  CHARGED_SHOT_MAX_SPEED_MULTIPLIER,
  CHARGED_SHOT_MIN_HOLD_MS,
  FIRE_COOLDOWN_MS,
  MUZZLE_OFFSET,
  TANK_BOOST_COOLDOWN_MS,
  TANK_BOOST_DURATION_MS,
  TANK_BOOST_MULTIPLIER,
  TANK_MOVE_SPEED,
  TANK_RADIUS,
  TANK_REVERSE_SPEED,
  TANK_ROTATION_SPEED,
} from '../constants';
import type { Wall } from '../map/types';
import type { TankInput } from '../systems/InputController';
import { clamp, normalizeAngleRadians } from '../utils/math';
import { Bullet } from './Bullet';

export interface TankAppearance {
  bodyTextureKey: string;
  turretTextureKey: string;
  bulletColor: number;
}

const DEFAULT_TANK_APPEARANCE: TankAppearance = {
  bodyTextureKey: 'tank-body',
  turretTextureKey: 'tank-turret',
  bulletColor: 0xfbbf24,
};

export interface TankUpdateResult {
  firedBullet: Bullet | undefined;
  selfDestructed: boolean;
}

export class Tank {
  public readonly id: string;
  public readonly radius = TANK_RADIUS;
  public readonly container: Phaser.GameObjects.Container;

  private readonly bodySprite: Phaser.GameObjects.Image;
  private readonly turretSprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly chargeRing: Phaser.GameObjects.Arc;
  private readonly position: Phaser.Math.Vector2;
  private readonly appearance: TankAppearance;
  private bodyAngleRadians = -Math.PI / 2;
  private turretAngleRadians = -Math.PI / 2;
  private fireCooldownMs = 0;
  private boostRemainingMs = 0;
  private boostCooldownMs = 0;
  private isCharging = false;
  private fireChargeMs = 0;
  private chargePulseMs = 0;

  public constructor(
    private readonly scene: Phaser.Scene,
    id: string,
    x: number,
    y: number,
    appearance?: TankAppearance,
  ) {
    this.id = id;
    this.appearance = appearance ?? DEFAULT_TANK_APPEARANCE;
    this.position = new Phaser.Math.Vector2(x, y);

    this.shadow = this.scene.add.ellipse(0, 6, 34, 20, 0x020617, 0.3);
    this.chargeRing = this.scene.add.circle(0, 0, this.radius + 8, 0xf59e0b, 0);
    this.chargeRing.setStrokeStyle(2, 0xfef08a, 0);
    this.bodySprite = this.scene.add.image(0, 0, this.appearance.bodyTextureKey);
    this.turretSprite = this.scene.add.image(0, 0, this.appearance.turretTextureKey);
    this.turretSprite.setOrigin(0.25, 0.5);

    this.container = this.scene.add.container(this.position.x, this.position.y, [
      this.shadow,
      this.chargeRing,
      this.bodySprite,
      this.turretSprite,
    ]);
    this.container.setDepth(2);
  }

  public update(
    deltaSeconds: number,
    input: TankInput,
    walls: readonly Wall[],
    canFire = true,
  ): TankUpdateResult {
    this.updateBoost(deltaSeconds, input);
    this.updateBodyRotation(deltaSeconds, input);

    this.updateMovement(deltaSeconds, input, walls);
    
    this.updateTurret(input);

    this.fireCooldownMs = Math.max(0, this.fireCooldownMs - deltaSeconds * 1000);
    const chargeState = this.updateChargeState(deltaSeconds, input, canFire);
    this.syncGraphics();

    if (chargeState.selfDestructed) {
      return {
        firedBullet: undefined,
        selfDestructed: true,
      };
    }

    return {
      firedBullet: chargeState.firedBullet,
      selfDestructed: false,
    };
  }

  public get x(): number {
    return this.position.x;
  }

  public get y(): number {
    return this.position.y;
  }

  public get bodyAngle(): number {
    return this.bodyAngleRadians;
  }

  public get turretAngle(): number {
    return this.turretAngleRadians;
  }

  public get isChargingShot(): boolean {
    return this.isCharging;
  }

  public get chargeLevel(): number {
    return this.getChargeRatio();
  }

  public getMuzzlePosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      this.position.x + Math.cos(this.turretAngleRadians) * MUZZLE_OFFSET,
      this.position.y + Math.sin(this.turretAngleRadians) * MUZZLE_OFFSET,
    );
  }

  private updateBodyRotation(deltaSeconds: number, input: TankInput): void {

    // Update the tank's body rotation based on the player's input for turning left or right.
    // The method calculates the rotation direction based on the input (e.g., turn left, turn right),
    // and then updates the body angle by applying the rotation speed
    // multiplied by the elapsed time (deltaSeconds).
    // The resulting angle is normalized to ensure it stays within a valid range
    // (e.g., 0 to 2π radians).

    let rotationDirection = 0;

    if (input.turnLeft) {
      rotationDirection -= 1;
    }
    if (input.turnRight) {
      rotationDirection += 1;
    }
    
    // If there is no rotation input, return early to avoid unnecessary calculations.
    if (rotationDirection === 0) {
      return;
    }

    // Update the body angle based on
    // the rotation direction, rotation speed, and elapsed time (deltaSeconds).
    // The normalizeAngleRadians function is used to ensure that the resulting angle
    // stays within a valid range (e.g., 0 to 2π radians).
    this.bodyAngleRadians = normalizeAngleRadians(
      this.bodyAngleRadians + rotationDirection * TANK_ROTATION_SPEED * deltaSeconds,
    );
  }

  private updateMovement(deltaSeconds: number, input: TankInput, walls: readonly Wall[]): void {
    
    // Update the tank's position based on the player's input for movement (forward/backward)
    // and the current boost status, while also checking for collisions
    // with the arena walls to prevent the tank from moving through them.

    // The method calculates the desired movement vector based on 
    // the input and the tank's current orientation,
    // applies a boost multiplier if the boost is active,
    // and then checks for potential collisions with walls before updating the tank's position.
    
    let movementDirection = 0;

    if (input.moveForward) {
      movementDirection += 1;
    }
    if (input.moveBackward) {
      movementDirection -= 1;
    }

    const speedBase = movementDirection >= 0 ? TANK_MOVE_SPEED : TANK_REVERSE_SPEED;
    const boostMultiplier = this.boostRemainingMs > 0 ? TANK_BOOST_MULTIPLIER : 1;
    const speed = speedBase * boostMultiplier;
    const distance = speed * movementDirection * deltaSeconds;

    const velocity = new Phaser.Math.Vector2(
      Math.cos(this.bodyAngleRadians) * distance,
      Math.sin(this.bodyAngleRadians) * distance,
    );

    if (velocity.lengthSq() === 0) {
      return;
    }

    const candidateX = new Phaser.Math.Vector2(this.position.x + velocity.x, this.position.y);
    if (!this.intersectsAnyWall(candidateX, walls)) {
      this.position.x = candidateX.x;
    }

    const candidateY = new Phaser.Math.Vector2(this.position.x, this.position.y + velocity.y);
    if (!this.intersectsAnyWall(candidateY, walls)) {
      this.position.y = candidateY.y;
    }
  }

  private updateBoost(deltaSeconds: number, input: TankInput): void {

    // Update the tank's boost status based on the player's input and the current boost state.
    // This includes managing the boost duration and cooldown timers,
    // and activating the boost when the player presses the boost button (spacebar),
    // as long as the boost is not currently active and not on cooldown.

    // When the boost is active, the tank's movement speed will be multiplied
    // by a defined boost multiplier, allowing the tank to move faster for a short duration.
    // After the boost duration expires, the boost will go on cooldown,
    // preventing it from being activated again until the cooldown period has passed.
    const deltaMs = deltaSeconds * 1000;
    
    // If the boost is currently active, decrease the remaining boost time by the elapsed time (deltaMs).
    // If the boost duration has expired (boostRemainingMs <= 0), reset the boost remaining time to 0 and start the cooldown timer.
    if (this.boostRemainingMs > 0) {
      this.boostRemainingMs = Math.max(0, this.boostRemainingMs - deltaMs);
      if (this.boostRemainingMs === 0) {
        this.boostCooldownMs = TANK_BOOST_COOLDOWN_MS;
      }
    } else if (this.boostCooldownMs > 0) {
      this.boostCooldownMs = Math.max(0, this.boostCooldownMs - deltaMs);
    }
    
    // If the boost button is pressed
    // and the boost is not currently active (boostRemainingMs === 0)
    // and not on cooldown (boostCooldownMs === 0),
    // activate the boost by setting the boost remaining time to the defined boost duration.
    if (input.boostPressed && this.boostRemainingMs === 0 && this.boostCooldownMs === 0) {
      this.boostRemainingMs = TANK_BOOST_DURATION_MS;
    }
  }

  private updateTurret(input: TankInput): void {
    const targetAngle = Phaser.Math.Angle.Between(
      this.position.x,
      this.position.y,
      input.pointerWorldX,
      input.pointerWorldY,
    );

    this.turretAngleRadians = normalizeAngleRadians(targetAngle);
  }

  private updateChargeState(
    deltaSeconds: number,
    input: TankInput,
    canFire: boolean,
  ): { firedBullet: Bullet | undefined; selfDestructed: boolean } {
    if (!canFire && !this.isCharging) {
      return { firedBullet: undefined, selfDestructed: false };
    }

    const deltaMs = deltaSeconds * 1000;
    if (this.isCharging && input.fireHeld) {
      this.fireChargeMs += deltaMs;

      if (this.fireChargeMs >= CHARGED_SHOT_OVERCHARGE_MS) {
        this.isCharging = false;
        this.fireChargeMs = 0;
        this.chargePulseMs = 0;
        this.fireCooldownMs = FIRE_COOLDOWN_MS;
        return { firedBullet: undefined, selfDestructed: true };
      }
    }

    if (input.firePressed && canFire && this.fireCooldownMs === 0 && !this.isCharging) {
      this.isCharging = true;
      this.fireChargeMs = 0;
      this.chargePulseMs = 0;
    }

    if (!this.isCharging) {
      return { firedBullet: undefined, selfDestructed: false };
    }

    if (input.fireHeld) {
      this.chargePulseMs += deltaMs;
    }

    if (!input.fireReleased) {
      return { firedBullet: undefined, selfDestructed: false };
    }

    if (!canFire || this.fireCooldownMs > 0) {
      this.isCharging = false;
      this.fireChargeMs = 0;
      this.chargePulseMs = 0;
      return { firedBullet: undefined, selfDestructed: false };
    }

    const heldMs = this.fireChargeMs;
    const chargeRatio = this.getChargeRatio();
    const isChargedShot = heldMs >= CHARGED_SHOT_MIN_HOLD_MS;

    this.isCharging = false;
    this.fireChargeMs = 0;
    this.chargePulseMs = 0;

    if (!isChargedShot) {
      this.fireCooldownMs = FIRE_COOLDOWN_MS;
      return {
        firedBullet: this.createBullet(),
        selfDestructed: false,
      };
    }

    const speed = Phaser.Math.Linear(BULLET_SPEED, BULLET_SPEED * CHARGED_SHOT_MAX_SPEED_MULTIPLIER, chargeRatio);
    const explosionRadius = Phaser.Math.Linear(
      BULLET_EXPLOSION_RADIUS,
      BULLET_EXPLOSION_RADIUS * CHARGED_SHOT_MAX_EXPLOSION_MULTIPLIER,
      chargeRatio,
    );

    this.fireCooldownMs = CHARGED_SHOT_COOLDOWN_MS;

    return {
      firedBullet: this.createBullet({
        speed,
        explosionRadius,
        maxBounces: 0,
        explodeOnWallImpact: true,
        isCharged: true,
      }),
      selfDestructed: false,
    };
  }

  private intersectsAnyWall(position: Phaser.Math.Vector2, walls: readonly Wall[]): boolean {
    for (const wall of walls) {
      const closestX = clamp(position.x, wall.x, wall.x + wall.width);
      const closestY = clamp(position.y, wall.y, wall.y + wall.height);
      const distanceSquared = Phaser.Math.Distance.Squared(position.x, position.y, closestX, closestY);

      if (distanceSquared < this.radius * this.radius) {
        return true;
      }
    }

    return false;
  }

  private getChargeRatio(): number {
    if (!this.isCharging) {
      return 0;
    }

    const cappedChargeMs = Math.min(this.fireChargeMs, CHARGED_SHOT_MAX_HOLD_MS);
    const normalized = (cappedChargeMs - CHARGED_SHOT_MIN_HOLD_MS) / (CHARGED_SHOT_MAX_HOLD_MS - CHARGED_SHOT_MIN_HOLD_MS);
    return clamp(normalized, 0, 1);
  }

  private createBullet(config?: {
    speed?: number;
    explosionRadius?: number;
    maxBounces?: number;
    explodeOnWallImpact?: boolean;
    isCharged?: boolean;
  }): Bullet {
    const muzzle = this.getMuzzlePosition();

    return new Bullet(this.scene, this.id, muzzle.x, muzzle.y, this.turretAngleRadians, {
      color: this.appearance.bulletColor,
      speed: config?.speed,
      explosionRadius: config?.explosionRadius,
      maxBounces: config?.maxBounces,
      explodeOnWallImpact: config?.explodeOnWallImpact,
      isCharged: config?.isCharged,
    });
  }

  private syncGraphics(): void {
    // Update the positions and rotations of the tank's graphical components (body and turret sprites, shadow)
    // to match the tank's current logical position and orientation.
    // This method should be called after updating the tank's state to ensure that the visuals are in sync with the underlying data.
    this.container.setPosition(this.position.x, this.position.y);
    this.bodySprite.setRotation(this.bodyAngleRadians);
    this.turretSprite.setRotation(this.turretAngleRadians);

    const chargeLevel = this.getChargeRatio();
    if (!this.isCharging) {
      this.chargeRing.setAlpha(0);
      this.chargeRing.setScale(1);
      return;
    }

    const pulse = 0.94 + Math.sin(this.chargePulseMs * 0.016) * 0.08;
    this.chargeRing.setAlpha(0.2 + chargeLevel * 0.55);
    this.chargeRing.setScale(Phaser.Math.Linear(0.86, 1.14, chargeLevel) * pulse);
    this.chargeRing.setStrokeStyle(2 + chargeLevel * 2, 0xfef08a, 0.45 + chargeLevel * 0.4);
  }

  public destroy(): void {
    this.container.destroy(true);
  }
}
