// src/client/render/Effects.ts
import Phaser from 'phaser';

/**
 * Abstract base class for all visual effects in the game world.
 * Each effect must implement the play method to handle its animation logic.
 */
export abstract class Effect {
  protected scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Play the effect animation at the specified location and with the given parameters.
   * @param data - The data required to play the effect (type depends on implementation)
   */
  abstract play(data: any): void;
}
