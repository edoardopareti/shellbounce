// src/client/render/DynamicElements.ts

import Phaser from 'phaser';

/**
 * Abstract base class for all dynamic elements in the game world.
 * Each dynamic element must implement the sync method to handle its rendering logic.
 */
export abstract class DynamicElement {
  protected scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Synchronize and render the dynamic element based on the latest game state.
   * @param data - The data required to render the element (type depends on implementation)
   */
  abstract sync(data: any): void;
}
