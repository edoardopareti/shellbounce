import Phaser from 'phaser';
import type { TankInput } from '../../shared/types';

export class InputController {
  private readonly keys: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    boost: Phaser.Input.Keyboard.Key;
    mine: Phaser.Input.Keyboard.Key;
  };

  private wasLeftDown = false;
  private wasRightDown = false;
  private wasMiddleDown = false;

  public constructor(private readonly scene: Phaser.Scene) {
    this.keys = this.scene.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      boost: Phaser.Input.Keyboard.KeyCodes.SPACE,
      mine: Phaser.Input.Keyboard.KeyCodes.E,
    }) as InputController['keys'];
  }

  public read(): TankInput {
    const pointer = this.scene.input.activePointer;
    const leftDown = pointer.leftButtonDown();
    const rightDown = pointer.rightButtonDown();
    const middleDown = pointer.middleButtonDown();
    const shieldHeld = leftDown && rightDown;
    const effectiveLeftDown = leftDown && !shieldHeld;
    const effectiveRightDown = rightDown && !shieldHeld;
    const firePressed = effectiveLeftDown && !this.wasLeftDown;
    const fireReleased = !effectiveLeftDown && this.wasLeftDown;
    const detonatePressed = effectiveRightDown && !this.wasRightDown;
    const placeMinePressedMouse = middleDown && !this.wasMiddleDown;

    this.wasLeftDown = effectiveLeftDown;
    this.wasRightDown = effectiveRightDown;
    this.wasMiddleDown = middleDown;

    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);

    return {
      moveForward: this.keys.up.isDown,
      moveBackward: this.keys.down.isDown,
      turnLeft: this.keys.left.isDown,
      turnRight: this.keys.right.isDown,
      shieldHeld,
      firePressed,
      fireHeld: effectiveLeftDown,
      fireReleased,
      detonatePressed,
      placeMinePressed: placeMinePressedMouse || Phaser.Input.Keyboard.JustDown(this.keys.mine),
      boostPressed: Phaser.Input.Keyboard.JustDown(this.keys.boost),
      pointerWorldX: worldPoint.x,
      pointerWorldY: worldPoint.y,
    };
  }
}
