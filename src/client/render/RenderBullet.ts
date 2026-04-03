// src/client/render/RenderBullet.ts
import Phaser from 'phaser';
import { DynamicElement } from './DynamicElements';

export interface BulletRenderData {
  x: number;
  y: number;
  radius: number;
  color: number;
  isCharged: boolean;
  time: number;
  graphics: Phaser.GameObjects.Graphics;
}

export class RenderBullet extends DynamicElement {
  constructor(scene: Phaser.Scene) {
    super(scene);
  }

  sync(data: BulletRenderData): void {
    const {
      x, y, radius, color, isCharged, time, graphics
    } = data;
    // Configurable constants
    const CHARGED_OUTLINE_WIDTH = 2;
    const CHARGED_OUTLINE_COLOR = 0xfef08a;
    const CHARGED_OUTLINE_ALPHA = 0.75;
    const CHARGED_OUTLINE_EXTRA_RADIUS = 3;
    const CHARGED_OUTLINE_PULSE_FREQ = 0.02;
    const CHARGED_OUTLINE_PULSE_AMP = 0.22;

    graphics.fillStyle(color, 1);
    graphics.fillCircle(x, y, radius);
    if (isCharged) {
      const pulse = 1 + Math.sin(time * CHARGED_OUTLINE_PULSE_FREQ) * CHARGED_OUTLINE_PULSE_AMP;
      graphics.lineStyle(
        CHARGED_OUTLINE_WIDTH,
        CHARGED_OUTLINE_COLOR,
        CHARGED_OUTLINE_ALPHA
      );
      graphics.strokeCircle(
        x,
        y,
        (radius + CHARGED_OUTLINE_EXTRA_RADIUS) * pulse
      );
    }
  }
}
