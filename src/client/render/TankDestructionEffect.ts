// src/client/render/TankDestructionEffect.ts
import Phaser from 'phaser';
import { Effect } from './Effects';

export interface TankDestructionEffectData {
  x: number;
  y: number;
  color: number;
  radius: number;
  durationMs: number;
  scene: Phaser.Scene;
}

export class TankDestructionEffect extends Effect {
  constructor(scene: Phaser.Scene) {
    super(scene);
  }

  play(data: TankDestructionEffectData): void {
    const { x, y, color } = data;
    // Configurable constants for tank destruction effect
    const FLASH_RADIUS = 14;
    const FLASH_ALPHA = 0.95;
    const FLASH_DEPTH = 7;
    const FLASH_SCALE = 2.8;
    const FLASH_DURATION = 220;

    const SHOCKWAVE_RADIUS = 18;
    const SHOCKWAVE_DEPTH = 6.8;
    const SHOCKWAVE_STROKE = 4;
    const SHOCKWAVE_STROKE_ALPHA = 0.7;
    const SHOCKWAVE_SCALE = 2.6;
    const SHOCKWAVE_DURATION = 300;

    const SHARD_COUNT = 200;
    const SHARD_MIN_DISTANCE = 36;
    const SHARD_MAX_DISTANCE = 112;
    const SHARD_MIN_SIZE = 3;
    const SHARD_MAX_SIZE = 7;
    const SHARD_DEPTH = 6.9;
    const SHARD_ALPHA = 0.95;
    const SHARD_SCALE = 0.3;
    const SHARD_MIN_DURATION = 240;
    const SHARD_MAX_DURATION = 430;
    const SHARD_MIN_ANGLE = -270;
    const SHARD_MAX_ANGLE = 270;

    const SCORCH_OFFSET_Y = 10;
    const SCORCH_WIDTH = 30;
    const SCORCH_HEIGHT = 16;
    const SCORCH_COLOR = 0x020617;
    const SCORCH_ALPHA = 0.5;
    const SCORCH_DEPTH = 1.5;
    const SCORCH_SCALE_X = 1.5;
    const SCORCH_SCALE_Y = 1.15;
    const SCORCH_DURATION = 650;

    const SHAKE_DURATION = 90;
    const SHAKE_INTENSITY = 0.005;

    const flash = this.scene.add.circle(x, y, FLASH_RADIUS, color, FLASH_ALPHA);
    flash.setDepth(FLASH_DEPTH);
    flash.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: flash,
      scaleX: FLASH_SCALE,
      scaleY: FLASH_SCALE,
      alpha: 0,
      duration: FLASH_DURATION,
      ease: 'Cubic.Out',
      onComplete: () => flash.destroy(),
    });

    const shockwave = this.scene.add.circle(x, y, SHOCKWAVE_RADIUS, color, 0);
    shockwave.setDepth(SHOCKWAVE_DEPTH);
    shockwave.setStrokeStyle(SHOCKWAVE_STROKE, color, SHOCKWAVE_STROKE_ALPHA);

    this.scene.tweens.add({
      targets: shockwave,
      scaleX: SHOCKWAVE_SCALE,
      scaleY: SHOCKWAVE_SCALE,
      alpha: 0,
      duration: SHOCKWAVE_DURATION,
      ease: 'Quad.Out',
      onComplete: () => shockwave.destroy(),
    });

    for (let i = 0; i < SHARD_COUNT; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(SHARD_MIN_DISTANCE, SHARD_MAX_DISTANCE);
      const size = Phaser.Math.Between(SHARD_MIN_SIZE, SHARD_MAX_SIZE);
      const shard = this.scene.add.rectangle(x, y, size, size * 1.8, color, SHARD_ALPHA);
      shard.setDepth(SHARD_DEPTH);
      shard.setRotation(angle);

      this.scene.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        angle: Phaser.Math.Between(SHARD_MIN_ANGLE, SHARD_MAX_ANGLE),
        alpha: 0,
        scaleX: SHARD_SCALE,
        scaleY: SHARD_SCALE,
        duration: Phaser.Math.Between(SHARD_MIN_DURATION, SHARD_MAX_DURATION),
        ease: 'Cubic.Out',
        onComplete: () => shard.destroy(),
      });
    }

    const scorch = this.scene.add.ellipse(
      x,
      y + SCORCH_OFFSET_Y,
      SCORCH_WIDTH,
      SCORCH_HEIGHT,
      SCORCH_COLOR,
      SCORCH_ALPHA,
    );
    scorch.setDepth(SCORCH_DEPTH);
    this.scene.tweens.add({
      targets: scorch,
      alpha: 0,
      scaleX: SCORCH_SCALE_X,
      scaleY: SCORCH_SCALE_Y,
      duration: SCORCH_DURATION,
      ease: 'Quad.Out',
      onComplete: () => scorch.destroy(),
    });

    this.scene.cameras.main.shake(SHAKE_DURATION, SHAKE_INTENSITY, true);
  }
}
