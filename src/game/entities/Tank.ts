import Phaser from 'phaser';
import {
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
import type { Wall } from '../maps/types';
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

export class Tank {
  public readonly id: string;
  public readonly radius = TANK_RADIUS;
  public readonly container: Phaser.GameObjects.Container;

  private readonly bodySprite: Phaser.GameObjects.Image;
  private readonly turretSprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly position: Phaser.Math.Vector2;
  private readonly appearance: TankAppearance;
  private bodyAngleRadians = -Math.PI / 2;
  private turretAngleRadians = -Math.PI / 2;
  private fireCooldownMs = 0;
  private boostRemainingMs = 0;
  private boostCooldownMs = 0;

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
    this.bodySprite = this.scene.add.image(0, 0, this.appearance.bodyTextureKey);
    this.turretSprite = this.scene.add.image(0, 0, this.appearance.turretTextureKey);
    this.turretSprite.setOrigin(0.25, 0.5);

    this.container = this.scene.add.container(this.position.x, this.position.y, [
      this.shadow,
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
  ): Bullet | undefined {
    
    // Update the tank's state based on:
    // the player's input, the arena walls, and whether the tank can fire a new bullet.

    // This includes updating:
    // the tank's position, rotation, boost status, and turret angle based on the input,
    // as well as checking for collisions with walls and handling firing cooldowns.

    // If the tank fires a bullet as a result of the input, a new Bullet instance will be created and returned.
    // Otherwise, the method will return undefined.

    // The input parameter contains information about which movement keys are pressed(e.g., move forward, turn left),
    // action keys (e.g., fire, detonate, place mine, boost), as well as the current position of the mouse pointer in world coordinates,
    // which can be used for aiming the turret. The method uses this input to update the tank's state accordingly.
    // The walls parameter is used to check for collisions when updating the tank's position, ensuring that the tank cannot move through walls.
    // The canFire parameter is used to determine if the tank is allowed to fire a new bullet based on the number of active bullets it currently has.
    
    this.updateBoost(deltaSeconds, input);
    this.updateBodyRotation(deltaSeconds, input);

    this.updateMovement(deltaSeconds, input, walls);
    
    this.updateTurret(input);

    this.fireCooldownMs = Math.max(0, this.fireCooldownMs - deltaSeconds * 1000);

    this.syncGraphics();
    
    // If the fire button is pressed
    // and the tank is allowed to fire (canFire is true)
    // and the fire cooldown has expired (fireCooldownMs === 0),
    // create and return a new Bullet instance representing the fired bullet.
    if (canFire && input.firePressed && this.fireCooldownMs === 0) {
      this.fireCooldownMs = FIRE_COOLDOWN_MS;
      return this.createBullet();
    }

    return undefined;
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

  public getMuzzlePosition(): Phaser.Math.Vector2 {
    // Calculate and return the position of the tank's turret muzzle,
    // which is the point from which bullets are fired.
    // The muzzle position is calculated based on the tank's current position,
    // the turret angle, and a defined muzzle offset that determines
    // how far from the center of the tank the muzzle is located.
    // This allows bullets to be spawned at the correct location
    // corresponding to the end of the turret, regardless of the tank's orientation.
    return new Phaser.Math.Vector2(
      this.position.x + Math.cos(this.turretAngleRadians) * MUZZLE_OFFSET,
      this.position.y + Math.sin(this.turretAngleRadians) * MUZZLE_OFFSET,
    );
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
    
    // If there is no movement input, return early to avoid unnecessary calculations.
    if (movementDirection === 0) {
      return;
    }
    // Compute the velocity vector based on the tank's current body angle
    // and the desired movement distance.
    // This vector represents the proposed movement for the current update cycle. 
    const velocity = new Phaser.Math.Vector2(
      Math.cos(this.bodyAngleRadians) * distance,
      Math.sin(this.bodyAngleRadians) * distance,
    );
    // If there is no movement (velocity length is zero),
    // return early to avoid unnecessary calculations.
    if (velocity.lengthSq() === 0) {
      return;
    }
    // Calculate the proposed new X and Y positions by adding
    // the velocity vector to the current position.
    // If the proposed position does not collide with any walls,
    // update the tank's position to the proposed position.
    // If there is no collision, the tank moves freely.
    const candidateX = new Phaser.Math.Vector2(this.position.x + velocity.x, this.position.y);
    if (!this.intersectsAnyWall(candidateX, walls)) {
      this.position.x = candidateX.x;
    }
    const candidateY = new Phaser.Math.Vector2(this.position.x, this.position.y + velocity.y);
    if (!this.intersectsAnyWall(candidateY, walls)) {
      this.position.y = candidateY.y;
    }
  }

  private updateTurret(input: TankInput): void {
    // Update the tank's turret angle to point towards the current position 
    // of the mouse pointer in world coordinates.
    // The method calculates the angle between the tank's position and the mouse pointer position,
    // and then sets the turret angle to this target angle
    // allowing the turret to aim towards the mouse pointer.
    const targetAngle = Phaser.Math.Angle.Between(
      this.position.x,
      this.position.y,
      input.pointerWorldX,
      input.pointerWorldY,
    );

    this.turretAngleRadians = normalizeAngleRadians(targetAngle);
  }

  private intersectsAnyWall(position: Phaser.Math.Vector2, walls: readonly Wall[]): boolean {
    // Check if the given position intersects with any of the walls in the arena.
    // This method is used to determine if the tank can move to a proposed position
    // without colliding with walls. It checks each wall to see if the distance from the position
    // to the closest point on the wall is less than the tank's radius, which would indicate a collision.
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

  private createBullet(): Bullet {
    // Create and return a new Bullet instance representing a bullet fired from the tank's turret.
    // The bullet's initial position is calculated based on
    // the tank's current position and the turret angle,
    // using a defined muzzle offset to position the bullet at the end of the turret.
    // The bullet's velocity is determined by the turret angle,
    // allowing it to travel in the direction the turret is facing.
    const muzzle = this.getMuzzlePosition();

    return new Bullet(this.scene, this.id, muzzle.x, muzzle.y, this.turretAngleRadians, this.appearance.bulletColor);
  }

  private syncGraphics(): void {
    // Update the positions and rotations of the tank's graphical components (body and turret sprites, shadow)
    // to match the tank's current logical position and orientation.
    // This method should be called after updating the tank's state to ensure that the visuals are in sync with the underlying data.
    this.container.setPosition(this.position.x, this.position.y);
    this.bodySprite.setRotation(this.bodyAngleRadians);
    this.turretSprite.setRotation(this.turretAngleRadians);
  }

  public destroy(): void {
    // Clean up the tank's resources by destroying its container and all child game objects (body sprite, turret sprite, shadow).
    // This method should be called when the tank is removed from the game (e.g., when it is destroyed or when the player leaves the game)
    // to ensure that all associated resources are properly released and to prevent memory leaks.
    this.container.destroy(true);
  }
}
