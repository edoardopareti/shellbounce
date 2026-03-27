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
import type { Wall } from '../maps/types';
import type { TankInput } from '../systems/InputController';
import { clamp, normalizeAngleRadians } from '../utils/math';
import { Bullet } from './Bullet';

export interface TankAppearance {
  bodyTextureKey: string;
  turretTextureKey: string;
  bulletColor: number;
}

export type TankType = 'PolPot' | 'Hightillery' | 'SSugar' | 'Fantanyl';

export const ALL_TANK_TYPES: readonly TankType[] = ['PolPot', 'Hightillery', 'SSugar', 'Fantanyl'];

export interface TankUpdateResult {
  firedBullet: Bullet | undefined;
  selfDestructed: boolean;
}

export abstract class Tank {
  public readonly id: string;
  public readonly radius = TANK_RADIUS;
  public readonly container: Phaser.GameObjects.Container;
  public abstract readonly tankType: TankType;

  private readonly bodySprite: Phaser.GameObjects.Image;
  private readonly turretSprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly chargeGlowOuter: Phaser.GameObjects.Arc;
  private readonly chargeGlowInner: Phaser.GameObjects.Arc;
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
    appearance: TankAppearance,
  ) {
    this.id = id;
    this.appearance = appearance;
    this.position = new Phaser.Math.Vector2(x, y);

    this.shadow = this.scene.add.ellipse(0, 6, 34, 20, 0x020617, 0.3);
    this.chargeGlowOuter = this.scene.add.circle(0, 0, 8, this.appearance.bulletColor, 0);
    this.chargeGlowOuter.setStrokeStyle(2, this.appearance.bulletColor, 0);
    this.chargeGlowOuter.setBlendMode(Phaser.BlendModes.ADD);
    this.chargeGlowInner = this.scene.add.circle(0, 0, 4, this.appearance.bulletColor, 0);
    this.chargeGlowInner.setBlendMode(Phaser.BlendModes.ADD);
    this.bodySprite = this.scene.add.image(0, 0, this.appearance.bodyTextureKey);
    this.turretSprite = this.scene.add.image(0, 0, this.appearance.turretTextureKey);
    this.turretSprite.setOrigin(0.25, 0.5);

    this.container = this.scene.add.container(this.position.x, this.position.y, [
      this.shadow,
      this.chargeGlowOuter,
      this.chargeGlowInner,
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

  public get bulletColor(): number {
    return this.appearance.bulletColor;
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

    const muzzleX = Math.cos(this.turretAngleRadians) * MUZZLE_OFFSET;
    const muzzleY = Math.sin(this.turretAngleRadians) * MUZZLE_OFFSET;
    this.chargeGlowOuter.setPosition(muzzleX, muzzleY);
    this.chargeGlowInner.setPosition(muzzleX, muzzleY);

    const chargeLevel = this.getChargeRatio();
    if (!this.isCharging) {
      this.chargeGlowOuter.setAlpha(0);
      this.chargeGlowOuter.setScale(1);
      this.chargeGlowInner.setAlpha(0);
      this.chargeGlowInner.setScale(1);
      return;
    }

    const pulse = 0.95 + Math.sin(this.chargePulseMs * 0.018) * 0.08;
    const chargeScale = Phaser.Math.Linear(0.35, 1.45, chargeLevel) * pulse;

    this.chargeGlowOuter.setAlpha(0.15 + chargeLevel * 0.4);
    this.chargeGlowOuter.setScale(chargeScale);
    this.chargeGlowOuter.setStrokeStyle(1.5 + chargeLevel * 2.5, this.appearance.bulletColor, 0.3 + chargeLevel * 0.5);

    this.chargeGlowInner.setAlpha(0.2 + chargeLevel * 0.65);
    this.chargeGlowInner.setScale(Phaser.Math.Linear(0.45, 1.2, chargeLevel) * pulse);
  }

  protected static createTankBodyTexture(
    scene: Phaser.Scene,
    textureKey: string,
    outerColor: number,
    innerColor: number,
  ): void {
    if (scene.textures.exists(textureKey)) {
      return;
    }

    const bodyGraphics = scene.add.graphics();
    bodyGraphics.fillStyle(outerColor, 1);
    bodyGraphics.fillRoundedRect(0, 0, 40, 28, 8);
    bodyGraphics.fillStyle(innerColor, 1);
    bodyGraphics.fillRoundedRect(8, 5, 24, 18, 6);
    bodyGraphics.generateTexture(textureKey, 40, 28);
    bodyGraphics.destroy();
  }

  protected static createTankTurretTexture(scene: Phaser.Scene, textureKey: string, color: number): void {
    if (scene.textures.exists(textureKey)) {
      return;
    }

    const turretGraphics = scene.add.graphics();
    turretGraphics.fillStyle(color, 1);
    turretGraphics.fillRoundedRect(0, 8, 28, 8, 4);
    turretGraphics.fillCircle(10, 12, 9);
    turretGraphics.generateTexture(textureKey, 28, 24);
    turretGraphics.destroy();
  }

  public destroy(): void {
    // Clean up the tank's resources by destroying its container and all child game objects (body sprite, turret sprite, shadow).
    // This method should be called when the tank is removed from the game (e.g., when it is destroyed or when the player leaves the game)
    // to ensure that all associated resources are properly released and to prevent memory leaks.
    this.container.destroy(true);
  }
}

export class PolPotTank extends Tank {
  public static readonly typeName: TankType = 'PolPot';

  private static readonly appearance: TankAppearance = {
    bodyTextureKey: 'tank-body-polpot',
    turretTextureKey: 'tank-turret-polpot',
    bulletColor: 0x22c55e,
  };

  public readonly tankType = PolPotTank.typeName;

  public constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
    PolPotTank.createTextures(scene);
    super(scene, id, x, y, PolPotTank.appearance);
  }

  public static createTextures(scene: Phaser.Scene): void {
    Tank.createTankBodyTexture(scene, PolPotTank.appearance.bodyTextureKey, 0x22c55e, 0x14532d);
    Tank.createTankTurretTexture(scene, PolPotTank.appearance.turretTextureKey, 0x4ade80);
  }
}

export class HightilleryTank extends Tank {
  public static readonly typeName: TankType = 'Hightillery';

  private static readonly appearance: TankAppearance = {
    bodyTextureKey: 'tank-body-hightillery',
    turretTextureKey: 'tank-turret-hightillery',
    bulletColor: 0xdc2626,
  };

  public readonly tankType = HightilleryTank.typeName;

  public constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
    HightilleryTank.createTextures(scene);
    super(scene, id, x, y, HightilleryTank.appearance);
  }

  public static createTextures(scene: Phaser.Scene): void {
    Tank.createTankBodyTexture(scene, HightilleryTank.appearance.bodyTextureKey, 0xdc2626, 0x7f1d1d);
    Tank.createTankTurretTexture(scene, HightilleryTank.appearance.turretTextureKey, 0xfca5a5);
  }
}

export class SSugarTank extends Tank {
  public static readonly typeName: TankType = 'SSugar';

  private static readonly appearance: TankAppearance = {
    bodyTextureKey: 'tank-body-ssugar',
    turretTextureKey: 'tank-turret-ssugar',
    bulletColor: 0xf8fafc,
  };

  public readonly tankType = SSugarTank.typeName;

  public constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
    SSugarTank.createTextures(scene);
    super(scene, id, x, y, SSugarTank.appearance);
  }

  public static createTextures(scene: Phaser.Scene): void {
    Tank.createTankBodyTexture(scene, SSugarTank.appearance.bodyTextureKey, 0xf8fafc, 0xcbd5e1);
    Tank.createTankTurretTexture(scene, SSugarTank.appearance.turretTextureKey, 0xe2e8f0);
  }
}

export class FantanylTank extends Tank {
  public static readonly typeName: TankType = 'Fantanyl';

  private static readonly appearance: TankAppearance = {
    bodyTextureKey: 'tank-body-fantanyl',
    turretTextureKey: 'tank-turret-fantanyl',
    bulletColor: 0xfacc15,
  };

  public readonly tankType = FantanylTank.typeName;

  public constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
    FantanylTank.createTextures(scene);
    super(scene, id, x, y, FantanylTank.appearance);
  }

  public static createTextures(scene: Phaser.Scene): void {
    Tank.createTankBodyTexture(scene, FantanylTank.appearance.bodyTextureKey, 0xfacc15, 0xa16207);
    Tank.createTankTurretTexture(scene, FantanylTank.appearance.turretTextureKey, 0xfde047);
  }
}

export function preloadTankTextures(scene: Phaser.Scene): void {
  PolPotTank.createTextures(scene);
  HightilleryTank.createTextures(scene);
  SSugarTank.createTextures(scene);
  FantanylTank.createTextures(scene);
}

export function createTankByType(
  scene: Phaser.Scene,
  tankType: TankType,
  id: string,
  x: number,
  y: number,
): Tank {
  switch (tankType) {
    case 'PolPot':
      return new PolPotTank(scene, id, x, y);
    case 'Hightillery':
      return new HightilleryTank(scene, id, x, y);
    case 'SSugar':
      return new SSugarTank(scene, id, x, y);
    case 'Fantanyl':
      return new FantanylTank(scene, id, x, y);
    default:
      return new PolPotTank(scene, id, x, y);
  }
}
