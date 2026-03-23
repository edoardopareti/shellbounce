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
    if (!this.isAlive) {
      return;
    }

    this.isAlive = false;
    this.sprite.destroy();
  }
}
