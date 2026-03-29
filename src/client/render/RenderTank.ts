import Phaser from 'phaser';
import {
  MUZZLE_OFFSET,
  TANK_SHIELD_FORWARD_OFFSET,
  TANK_SHIELD_RADIUS,
  TANK_SHIELD_SECTOR_ANGLE_RADIANS,
} from '../../shared/constants';
import type { PlayerState } from '../../shared/types';
import { getTankAppearance } from './tankVisuals';

export class RenderTank {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bodySprite: Phaser.GameObjects.Image;
  private readonly turretSprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly shieldRing: Phaser.GameObjects.Arc;
  private readonly chargeGlowOuter: Phaser.GameObjects.Arc;
  private readonly chargeGlowInner: Phaser.GameObjects.Arc;
  private readonly chargeSpark: Phaser.GameObjects.Arc;
  private readonly idLabel: Phaser.GameObjects.Text;

  public constructor(private readonly scene: Phaser.Scene, player: PlayerState) {
    const appearance = getTankAppearance(player.tankType);

    const bodyShape = appearance.bodyShape;
    const turretShape = appearance.turretShape;
    const shadowOffsetY = Math.max(4, bodyShape.height * 0.22);
    const shadowWidth = bodyShape.width * 0.88;
    const shadowHeight = bodyShape.height * 0.72;
    const glowOuterRadius = Phaser.Math.Clamp(bodyShape.width * 0.22, 6, 13);
    const glowInnerRadius = glowOuterRadius * 0.5;

    this.shadow = this.scene.add.ellipse(0, shadowOffsetY, shadowWidth, shadowHeight, 0x020617, 0.3);
    this.shieldRing = this.scene.add.arc(0, 0, TANK_SHIELD_RADIUS, 0, 0, false, appearance.bulletColor, 0);
    this.shieldRing.setStrokeStyle(2.5, appearance.bulletColor, 0);
    this.shieldRing.setBlendMode(Phaser.BlendModes.ADD);

    this.chargeGlowOuter = this.scene.add.circle(0, 0, glowOuterRadius, appearance.bulletColor, 0);
    this.chargeGlowOuter.setStrokeStyle(2, appearance.bulletColor, 0);
    this.chargeGlowOuter.setBlendMode(Phaser.BlendModes.ADD);
    this.chargeGlowInner = this.scene.add.circle(0, 0, glowInnerRadius, appearance.bulletColor, 0);
    this.chargeGlowInner.setBlendMode(Phaser.BlendModes.ADD);
    this.chargeSpark = this.scene.add.circle(0, 0, Math.max(2, glowInnerRadius * 0.45), appearance.bulletColor, 0);
    this.chargeSpark.setBlendMode(Phaser.BlendModes.ADD);

    this.bodySprite = this.scene.add.image(0, 0, appearance.bodyTextureKey);
    this.turretSprite = this.scene.add.image(0, 0, appearance.turretTextureKey);
    this.turretSprite.setOrigin(turretShape.originX, turretShape.originY);

    // Create the player ID label above the tank
    this.idLabel = this.scene.add.text(0, 0, player.id, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#e2e8f0',
      align: 'center',
      stroke: '#22223b',
      strokeThickness: 3,
    });
    this.idLabel.setOrigin(0.5, 1.1); // Centered horizontally, above the tank
    this.idLabel.setDepth(7);

    this.container = this.scene.add.container(player.x, player.y, [
      this.shadow,
      this.shieldRing,
      this.bodySprite,
      this.turretSprite,
      this.chargeGlowOuter,
      this.chargeGlowInner,
      this.chargeSpark,
      this.idLabel,
    ]);
    this.container.setDepth(6);
  }

  public sync(player: PlayerState): void {
    this.container.setPosition(player.x, player.y);

    // Update the label text and position (above the tank)
    this.idLabel.setText(player.id);
    this.idLabel.setX(0); // Centered on the tank
    this.idLabel.setY(-player.radius - 8); // 8px above the tank's top

    if (!player.isAlive) {
      this.container.setAlpha(0);
      this.shieldRing.setAlpha(0);
      this.chargeGlowOuter.setAlpha(0);
      this.chargeGlowInner.setAlpha(0);
      this.chargeSpark.setAlpha(0);
      this.idLabel.setAlpha(0);
      return;
    }

    this.container.setAlpha(1);
    this.idLabel.setAlpha(1);
    this.bodySprite.setRotation(player.bodyAngle);
    this.turretSprite.setRotation(player.turretAngle);

    const muzzleX = Math.cos(player.turretAngle) * MUZZLE_OFFSET;
    const muzzleY = Math.sin(player.turretAngle) * MUZZLE_OFFSET;
    this.chargeGlowOuter.setPosition(muzzleX, muzzleY);
    this.chargeGlowInner.setPosition(muzzleX, muzzleY);

    if (!player.isChargingShot) {
      this.chargeGlowOuter.setAlpha(0);
      this.chargeGlowOuter.setScale(1);
      this.chargeGlowInner.setAlpha(0);
      this.chargeGlowInner.setScale(1);
      this.chargeSpark.setAlpha(0);
      this.chargeSpark.setScale(1);
    } else {
      const pulse = 0.95 + Math.sin(this.scene.time.now * 0.018) * 0.08;
      const chargeScale = Phaser.Math.Linear(0.35, 1.45, player.chargeLevel) * pulse;
      const sparklePulse = 0.92 + Math.sin(this.scene.time.now * 0.031) * 0.2;

      this.chargeGlowOuter.setAlpha(0.15 + player.chargeLevel * 0.4);
      this.chargeGlowOuter.setScale(chargeScale);
      this.chargeGlowOuter.setStrokeStyle(1.5 + player.chargeLevel * 2.5, player.bulletColor, 0.3 + player.chargeLevel * 0.5);

      this.chargeGlowInner.setAlpha(0.2 + player.chargeLevel * 0.65);
      this.chargeGlowInner.setScale(Phaser.Math.Linear(0.45, 1.2, player.chargeLevel) * pulse);

      this.chargeSpark.setAlpha(0.4 + player.chargeLevel * 0.5);
      this.chargeSpark.setScale(Phaser.Math.Linear(0.7, 1.5, player.chargeLevel) * sparklePulse);
    }

    const shieldCenterLocalX = Math.cos(player.turretAngle) * TANK_SHIELD_FORWARD_OFFSET;
    const shieldCenterLocalY = Math.sin(player.turretAngle) * TANK_SHIELD_FORWARD_OFFSET;
    this.shieldRing.setPosition(shieldCenterLocalX, shieldCenterLocalY);

    const shieldStartAngle = player.turretAngle - TANK_SHIELD_SECTOR_ANGLE_RADIANS * 0.5;
    const shieldEndAngle = player.turretAngle + TANK_SHIELD_SECTOR_ANGLE_RADIANS * 0.5;
    this.shieldRing.setStartAngle(Phaser.Math.RadToDeg(shieldStartAngle));
    this.shieldRing.setEndAngle(Phaser.Math.RadToDeg(shieldEndAngle));

    if (!player.isShieldActive) {
      this.shieldRing.setAlpha(0);
      this.shieldRing.setScale(1);
      return;
    }

    const shieldPulse = 0.97 + Math.sin(this.scene.time.now * 0.014) * 0.06;
    this.shieldRing.setAlpha(0.45);
    this.shieldRing.setFillStyle(player.bulletColor, 0.14);
    this.shieldRing.setScale(shieldPulse);
    this.shieldRing.setStrokeStyle(2.5, player.bulletColor, 0.7);
  }

  public destroy(): void {
    this.container.destroy(true);
  }
}
