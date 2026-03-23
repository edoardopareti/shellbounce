// src/game/map/ArenaMap.ts
// This file defines the ArenaMap class, which is responsible for rendering the arena layout onto the game scene.
// The arena layout is defined in the arenaLayout.ts file, which includes
// the base dimensions and the walls that make up the arena.
// The ArenaMap class uses the scene's dimensions to scale the walls accordingly,
// ensuring that the arena maintains its proportions regardless of the screen size.
// Additionally, the ArenaMap class renders a background and a grid overlay
// to help visualize the arena layout and provide a reference for positioning game objects.

import Phaser from 'phaser';
import { getScaledArenaWalls } from './arenaLayout';
import type { Wall } from './types';

// TODO Remove magic numbers and use constants for colors, spacing, etc.
// TODO render background and grid in separate layers, so they can be easily modified or toggled on/off

export class ArenaMap {
  public readonly walls: Wall[];
  
  // The constructor initializes the arena map by generating the walls based on the scene's dimensions.
  public constructor(private readonly scene: Phaser.Scene) {
    this.walls = getScaledArenaWalls(this.scene.scale.width, this.scene.scale.height);
  }

  public render(): void {

    // Render the background of the arena using a solid color fill, covering the entire scene dimensions
    const background = this.scene.add.graphics();
    background.fillStyle(0x111827, 1);
    background.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);
    
    // Render a grid overlay on top of the background 
    // to help visualize the arena layout and provide a reference for positioning game objects
    const grid = this.scene.add.graphics();
    grid.lineStyle(1, 0x1f2937, 0.5);
    const spacing = 40;
    for (let x = 0; x <= this.scene.scale.width; x += spacing) {
      grid.beginPath();
      grid.moveTo(x, 0);
      grid.lineTo(x, this.scene.scale.height);
      grid.strokePath();
    }
    for (let y = 0; y <= this.scene.scale.height; y += spacing) {
      grid.beginPath();
      grid.moveTo(0, y);
      grid.lineTo(this.scene.scale.width, y);
      grid.strokePath();
    }
    
    // Render the walls of the arena by iterating over the walls array and drawing each wall
    // as a filled rectangle with a border
    const wallsGraphics = this.scene.add.graphics();
    for (const wall of this.walls) {
      wallsGraphics.fillStyle(0x334155, 1);
      wallsGraphics.fillRect(wall.x, wall.y, wall.width, wall.height);
      wallsGraphics.lineStyle(2, 0x64748b, 0.8);
      wallsGraphics.strokeRect(wall.x, wall.y, wall.width, wall.height);
    }
  }
}
