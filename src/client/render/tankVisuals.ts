import Phaser from 'phaser';
import type { TankType } from '../../shared/types';

interface TankBodyShape {
  width: number;
  height: number;
  cornerRadius: number;
  innerOffsetX: number;
  innerOffsetY: number;
  innerWidth: number;
  innerHeight: number;
  innerCornerRadius: number;
}

interface TankTurretShape {
  textureWidth: number;
  textureHeight: number;
  barrelX: number;
  barrelY: number;
  barrelWidth: number;
  barrelHeight: number;
  barrelCornerRadius: number;
  baseX: number;
  baseY: number;
  baseRadius: number;
  originX: number;
  originY: number;
}

export interface TankAppearance {
  bodyTextureKey: string;
  turretTextureKey: string;
  bulletColor: number;
  bodyShape: TankBodyShape;
  turretShape: TankTurretShape;
}

const APPEARANCES: Record<TankType, TankAppearance> = {
  PolPot: {
    bodyTextureKey: 'tank-body-polpot',
    turretTextureKey: 'tank-turret-polpot',
    bulletColor: 0x22c55e,
    bodyShape: {
      width: 40,
      height: 28,
      cornerRadius: 8,
      innerOffsetX: 8,
      innerOffsetY: 5,
      innerWidth: 24,
      innerHeight: 18,
      innerCornerRadius: 6,
    },
    turretShape: {
      textureWidth: 28,
      textureHeight: 24,
      barrelX: 0,
      barrelY: 8,
      barrelWidth: 28,
      barrelHeight: 8,
      barrelCornerRadius: 4,
      baseX: 10,
      baseY: 12,
      baseRadius: 9,
      originX: 0.25,
      originY: 0.5,
    },
  },
  Hightillery: {
    bodyTextureKey: 'tank-body-hightillery',
    turretTextureKey: 'tank-turret-hightillery',
    bulletColor: 0xdc2626,
    bodyShape: {
      width: 50,
      height: 34,
      cornerRadius: 9,
      innerOffsetX: 10,
      innerOffsetY: 6,
      innerWidth: 30,
      innerHeight: 22,
      innerCornerRadius: 7,
    },
    turretShape: {
      textureWidth: 36,
      textureHeight: 28,
      barrelX: 0,
      barrelY: 10,
      barrelWidth: 36,
      barrelHeight: 8,
      barrelCornerRadius: 4,
      baseX: 12,
      baseY: 14,
      baseRadius: 11,
      originX: 0.22,
      originY: 0.5,
    },
  },
  SSugar: {
    bodyTextureKey: 'tank-body-ssugar',
    turretTextureKey: 'tank-turret-ssugar',
    bulletColor: 0xf8fafc,
    bodyShape: {
      width: 36,
      height: 28,
      cornerRadius: 7,
      innerOffsetX: 6,
      innerOffsetY: 4,
      innerWidth: 20,
      innerHeight: 14,
      innerCornerRadius: 5,
    },
    turretShape: {
      textureWidth: 24,
      textureHeight: 20,
      barrelX: 0,
      barrelY: 7,
      barrelWidth: 24,
      barrelHeight: 6,
      barrelCornerRadius: 3,
      baseX: 8,
      baseY: 10,
      baseRadius: 7,
      originX: 0.26,
      originY: 0.5,
    },
  },
  Fantanyl: {
    bodyTextureKey: 'tank-body-fantanyl',
    turretTextureKey: 'tank-turret-fantanyl',
    bulletColor: 0xfacc15,
    bodyShape: {
      width: 48,
      height: 36,
      cornerRadius: 10,
      innerOffsetX: 10,
      innerOffsetY: 6,
      innerWidth: 28,
      innerHeight: 24,
      innerCornerRadius: 8,
    },
    turretShape: {
      textureWidth: 34,
      textureHeight: 30,
      barrelX: 1,
      barrelY: 11,
      barrelWidth: 33,
      barrelHeight: 8,
      barrelCornerRadius: 4,
      baseX: 12,
      baseY: 15,
      baseRadius: 10,
      originX: 0.24,
      originY: 0.5,
    },
  },
};

export function getTankAppearance(tankType: TankType): TankAppearance {
  return APPEARANCES[tankType];
}

export function preloadTankTextures(scene: Phaser.Scene): void {
  createTankTextures(scene, 'PolPot', 0x22c55e, 0x14532d, 0x4ade80);
  createTankTextures(scene, 'Hightillery', 0xdc2626, 0x7f1d1d, 0xfca5a5);
  createTankTextures(scene, 'SSugar', 0xf8fafc, 0xcbd5e1, 0xe2e8f0);
  createTankTextures(scene, 'Fantanyl', 0xfacc15, 0xa16207, 0xfde047);
}

function createTankTextures(
  scene: Phaser.Scene,
  tankType: TankType,
  outerColor: number,
  innerColor: number,
  turretColor: number,
): void {
  const appearance = APPEARANCES[tankType];

  if (!scene.textures.exists(appearance.bodyTextureKey)) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(outerColor, 1);
    graphics.fillRoundedRect(0, 0, appearance.bodyShape.width, appearance.bodyShape.height, appearance.bodyShape.cornerRadius);
    graphics.fillStyle(innerColor, 1);
    graphics.fillRoundedRect(
      appearance.bodyShape.innerOffsetX,
      appearance.bodyShape.innerOffsetY,
      appearance.bodyShape.innerWidth,
      appearance.bodyShape.innerHeight,
      appearance.bodyShape.innerCornerRadius,
    );
    graphics.generateTexture(appearance.bodyTextureKey, appearance.bodyShape.width, appearance.bodyShape.height);
    graphics.destroy();
  }

  if (!scene.textures.exists(appearance.turretTextureKey)) {
    const graphics = scene.add.graphics();
    graphics.fillStyle(turretColor, 1);
    graphics.fillRoundedRect(
      appearance.turretShape.barrelX,
      appearance.turretShape.barrelY,
      appearance.turretShape.barrelWidth,
      appearance.turretShape.barrelHeight,
      appearance.turretShape.barrelCornerRadius,
    );
    graphics.fillCircle(appearance.turretShape.baseX, appearance.turretShape.baseY, appearance.turretShape.baseRadius);
    graphics.generateTexture(
      appearance.turretTextureKey,
      appearance.turretShape.textureWidth,
      appearance.turretShape.textureHeight,
    );
    graphics.destroy();
  }
}
