// src/client/render/ExplosionEffect.ts
import Phaser from 'phaser';
import { Effect } from './Effects';

export interface ExplosionEffectData {
  x: number;
  y: number;
  color: number;
  radius: number;
  durationMs: number;
  scene: Phaser.Scene;
}

export class ExplosionEffect extends Effect {
  constructor(scene: Phaser.Scene) {
    super(scene);
  }

  play(data: ExplosionEffectData): void {
    const { x, y, color, radius, durationMs } = data;
    // Configurable constants for explosion effect
    const INITIAL_RADIUS = 8;
    const INITIAL_ALPHA = 0.45;
    const DEPTH = 6;

    const wave = this.scene.add.circle(x, y, INITIAL_RADIUS, color, INITIAL_ALPHA);
    wave.setDepth(DEPTH);

    this.scene.tweens.add({
      targets: wave,
      radius: radius,
      alpha: 0,
      duration: durationMs,
      ease: 'Cubic.Out',
      onComplete: () => wave.destroy(),
    });
  }
}
