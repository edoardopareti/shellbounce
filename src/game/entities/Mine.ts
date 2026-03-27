import Phaser from 'phaser';
import { MINE_ARMING_DELAY_MS, MINE_LIFETIME_MS, MINE_RADIUS } from '../constants';

export class Mine {
  public readonly ownerTankId: string;
  public readonly radius = MINE_RADIUS;
  public readonly sprite: Phaser.GameObjects.Arc;
  public isAlive = true;

  private lifetimeMs = 0;
  private ownerHasClearedMine = false;
  private readonly position: Phaser.Math.Vector2;

  public constructor(
    private readonly scene: Phaser.Scene,
    ownerTankId: string,
    x: number,
    y: number,
    color = 0xfacc15,
  ) {
    this.ownerTankId = ownerTankId;
    this.position = new Phaser.Math.Vector2(x, y);

    this.sprite = this.scene.add.circle(x, y, this.radius, color, 0.95);
    this.sprite.setDepth(2.5);
    this.sprite.setStrokeStyle(2, 0x111827, 0.8);
  }

  public update(deltaSeconds: number): boolean {

    // Update the mine's state by incrementing its lifetime and checking if it has reached its maximum lifetime,
    // which would indicate that the mine should explode and be removed from the game. The method returns a boolean
    // indicating whether the mine's lifetime has expired and it should be removed from the game.
    if (!this.isAlive) {
      return false;
    }
    this.lifetimeMs += deltaSeconds * 1000;
    return this.lifetimeMs >= MINE_LIFETIME_MS;
  }

  public get x(): number {
    return this.position.x;
  }

  public get y(): number {
    return this.position.y;
  }

  public get isArmed(): boolean {
    return this.lifetimeMs >= MINE_ARMING_DELAY_MS;
  }

  public updateOwnerClearance(ownerOverlappingMine: boolean): void {
    if (!ownerOverlappingMine) {
      this.ownerHasClearedMine = true;
    }
  }

  public canBeTriggeredByTank(tankId: string): boolean {
    if (!this.isArmed) {
      return false;
    }

    if (tankId === this.ownerTankId && !this.ownerHasClearedMine) {
      return false;
    }

    return true;
  }

  public destroy(): void {
    // Remove the mine from the game by marking it as no longer alive
    // and destroying its visual representation (sprite).
    if (!this.isAlive) {
      return;
    }

    this.isAlive = false;
    this.sprite.destroy();
  }
}
