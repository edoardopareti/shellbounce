import Phaser from 'phaser';
import { getArenaWorld } from './mapLayouts';
import type { MapName, Wall } from './types';

export class ArenaMap {
  public readonly width: number;
  public readonly height: number;
  public readonly walls: Wall[];

  public constructor(
    private readonly scene: Phaser.Scene,
    mapName: MapName,
  ) {
    const arenaWorld = getArenaWorld(mapName);

    this.width = arenaWorld.width;
    this.height = arenaWorld.height;
    this.walls = arenaWorld.walls;
  }

  public render(): void {
    const background = this.scene.add.graphics();
    background.fillStyle(0x111827, 1);
    background.fillRect(0, 0, this.width, this.height);

    const grid = this.scene.add.graphics();
    grid.lineStyle(1, 0x1f2937, 0.5);
    const spacing = 40;

    for (let x = 0; x <= this.width; x += spacing) {
      grid.beginPath();
      grid.moveTo(x, 0);
      grid.lineTo(x, this.height);
      grid.strokePath();
    }

    for (let y = 0; y <= this.height; y += spacing) {
      grid.beginPath();
      grid.moveTo(0, y);
      grid.lineTo(this.width, y);
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