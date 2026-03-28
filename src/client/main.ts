import Phaser from 'phaser';
import { NetworkGameScene } from './scenes/NetworkGameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 1920,
  height: 1080,
  backgroundColor: '#111827',
  scene: [NetworkGameScene],
  render: {
    pixelArt: false,
    antialias: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
