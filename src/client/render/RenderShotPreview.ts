// src/client/render/RenderShotPreview.ts
import Phaser from 'phaser';
import { DynamicElement } from './DynamicElements';

export interface ShotPreviewRenderData {
  segments: Array<{ start: Phaser.Math.Vector2; end: Phaser.Math.Vector2; color: number; }>;
  graphics: Phaser.GameObjects.Graphics;
}

export class RenderShotPreview extends DynamicElement {
  constructor(scene: Phaser.Scene) {
    super(scene);
  }

  sync(data: ShotPreviewRenderData): void {
    const { segments, graphics } = data;
    // Configurable constants
    const DASH_LENGTH = 10;
    const GAP_LENGTH = 8;
    const ALPHA = 0.8;
    const LINE_WIDTH = 2;

    for (const segment of segments) {
      const { start, end, color } = segment;
      const totalLength = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
      if (totalLength <= 0.001) continue;
      const directionX = (end.x - start.x) / totalLength;
      const directionY = (end.y - start.y) / totalLength;
      let traveled = 0;
      while (traveled < totalLength) {
        const dashStart = traveled;
        const dashEnd = Math.min(traveled + DASH_LENGTH, totalLength);
        const x1 = start.x + directionX * dashStart;
        const y1 = start.y + directionY * dashStart;
        const x2 = start.x + directionX * dashEnd;
        const y2 = start.y + directionY * dashEnd;
        graphics.lineStyle(LINE_WIDTH, color, ALPHA);
        graphics.beginPath();
        graphics.moveTo(x1, y1);
        graphics.lineTo(x2, y2);
        graphics.strokePath();
        traveled += DASH_LENGTH + GAP_LENGTH;
      }
    }
  }
}
