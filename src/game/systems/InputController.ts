//src/game/systems/InputController.ts
// This file defines the InputController class, which is responsible 
// for handling player input and translating it into a format that can be easily consumed by the game logic.
// The InputController listens for keyboard and mouse input,
// and provides a method to read the current input state as a TankInput object.
// The TankInput object includes information about movement, firing, and other actions that the player can perform,
// as well as the current position of the mouse pointer in world coordinates.

import Phaser from 'phaser';

export interface TankInput {
  moveForward: boolean;
  moveBackward: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  firePressed: boolean;
  detonatePressed: boolean;
  placeMinePressed: boolean;
  boostPressed: boolean;
  pointerWorldX: number;
  pointerWorldY: number;
}

export class InputController {
  private readonly keys: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    boost: Phaser.Input.Keyboard.Key;
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
    }) as InputController['keys'];
  }

  public read(): TankInput {
    const pointer = this.scene.input.activePointer;
    const leftDown = pointer.leftButtonDown();
    const rightDown = pointer.rightButtonDown();
    const middleDown = pointer.middleButtonDown();

    const firePressed = leftDown && !this.wasLeftDown;
    const detonatePressed = rightDown && !this.wasRightDown;
    const placeMinePressed = middleDown && !this.wasMiddleDown;
    const boostPressed = Phaser.Input.Keyboard.JustDown(this.keys.boost);

    this.wasLeftDown = leftDown;
    this.wasRightDown = rightDown;
    this.wasMiddleDown = middleDown;

    return {
      moveForward: this.keys.up.isDown,
      moveBackward: this.keys.down.isDown,
      turnLeft: this.keys.left.isDown,
      turnRight: this.keys.right.isDown,
      firePressed,
      detonatePressed,
      placeMinePressed,
      boostPressed,
      pointerWorldX: pointer.worldX,
      pointerWorldY: pointer.worldY,
    };
  }
}
