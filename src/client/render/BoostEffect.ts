import Phaser from 'phaser';
import { Effect } from './Effects';

export interface BoostEffectData {
  x: number;
  y: number;
  color: number;
  radius: number;
  durationMs: number;
  angle?: number;
  scene: Phaser.Scene;
}

export class BoostEffect extends Effect {
  constructor(scene: Phaser.Scene) {
    super(scene);
  }

  play(data: BoostEffectData): void {
    const { x, y, color, radius, durationMs, angle = 0, scene } = data;

    // Configurable constants for boost effect
    const OFFSET = 4; // Offset from tank rear
    const DUST_WIDTH = 24;
    const DUST_HEIGHT = 12;
    const DUST_COLOR = 0xcbd5e1;
    const DUST_ALPHA = 0.3;
    const DUST_DEPTH = 5.8;
    const DUST_SCALE_X = 1.9;
    const DUST_SCALE_Y = 1.35;
    const DUST_EASE = 'Cubic.Out';

    const STREAK_COUNT = 7;
    const STREAK_SPREAD_MIN = -0.42;
    const STREAK_SPREAD_MAX = 0.42;
    const STREAK_LENGTH_MIN = 20;
    const STREAK_LENGTH_MAX = 34;
    const STREAK_ALPHA = 0.75;
    const STREAK_LINE_WIDTH = 2.4;
    const STREAK_DEPTH = 6.2;
    const STREAK_BLEND = Phaser.BlendModes.ADD;
    const STREAK_SCALE = 1.18;
    const STREAK_EASE = 'Cubic.Out';

    const tankAngle = angle;
    const rearAngle = tankAngle + Math.PI;
    const originX = x + Math.cos(rearAngle) * (radius + OFFSET);
    const originY = y + Math.sin(rearAngle) * (radius + OFFSET);

    const dust = scene.add.ellipse(originX, originY, DUST_WIDTH, DUST_HEIGHT, DUST_COLOR, DUST_ALPHA);
    dust.setDepth(DUST_DEPTH);
    scene.tweens.add({
      targets: dust,
      alpha: 0,
      scaleX: DUST_SCALE_X,
      scaleY: DUST_SCALE_Y,
      duration: durationMs,
      ease: DUST_EASE,
      onComplete: () => dust.destroy(),
    });

    for (let i = 0; i < STREAK_COUNT; i += 1) {
      const spread = Phaser.Math.FloatBetween(STREAK_SPREAD_MIN, STREAK_SPREAD_MAX);
      const angle2 = rearAngle + spread;
      const length = Phaser.Math.Between(STREAK_LENGTH_MIN, STREAK_LENGTH_MAX);
      const x2 = originX + Math.cos(angle2) * length;
      const y2 = originY + Math.sin(angle2) * length;
      const streak = scene.add.line(0, 0, originX, originY, x2, y2, color, STREAK_ALPHA);
      streak.setLineWidth(STREAK_LINE_WIDTH);
      streak.setDepth(STREAK_DEPTH);
      streak.setBlendMode(STREAK_BLEND);

      scene.tweens.add({
        targets: streak,
        alpha: 0,
        scaleX: STREAK_SCALE,
        scaleY: STREAK_SCALE,
        duration: durationMs,
        ease: STREAK_EASE,
        onComplete: () => streak.destroy(),
      });
    }
  }
}
