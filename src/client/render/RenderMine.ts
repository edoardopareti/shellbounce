// src/client/render/RenderMine.ts
import Phaser from 'phaser';
import { DynamicElement } from './DynamicElements';

export interface MineRenderData {
  x: number;
  y: number;
  radius: number;
  color: number;
  armed: boolean;
  graphics: Phaser.GameObjects.Graphics;
}

export class RenderMine extends DynamicElement {
  constructor(scene: Phaser.Scene) {
    super(scene);
  }

  sync(data: MineRenderData): void {
    const {
      x, y, radius, color, armed, graphics
    } = data;
    // Configurable constants
    const BORDER_WIDTH = 2;
    const BORDER_COLOR = 0x111827;
    const ARMED_ALPHA = 1;
    const UNARMED_ALPHA = 0.95;
    const ARMED_BORDER_ALPHA = 1;
    const UNARMED_BORDER_ALPHA = 0.8;

    graphics.fillStyle(color, armed ? ARMED_ALPHA : UNARMED_ALPHA);
    graphics.fillCircle(x, y, radius);
    graphics.lineStyle(
      BORDER_WIDTH,
      BORDER_COLOR,
      armed ? ARMED_BORDER_ALPHA : UNARMED_BORDER_ALPHA
    );
    graphics.strokeCircle(x, y, radius);
  }
}
