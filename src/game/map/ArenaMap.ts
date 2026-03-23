import Phaser from 'phaser';
import { getScaledArenaWalls } from './arenaLayout';
import type { Wall } from './types';

export class ArenaMap {
  public readonly walls: Wall[];

  public constructor(private readonly scene: Phaser.Scene) {
    this.walls = getScaledArenaWalls(this.scene.scale.width, this.scene.scale.height);
  }

  public render(): void {
    const background = this.scene.add.graphics();
    background.fillStyle(0x111827, 1);
    background.fillRect(0, 0, this.scene.scale.width, this.scene.scale.height);

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

    const wallsGraphics = this.scene.add.graphics();
    for (const wall of this.walls) {
      wallsGraphics.fillStyle(0x334155, 1);
      wallsGraphics.fillRect(wall.x, wall.y, wall.width, wall.height);
      wallsGraphics.lineStyle(2, 0x64748b, 0.8);
      wallsGraphics.strokeRect(wall.x, wall.y, wall.width, wall.height);
    }
  }
}
