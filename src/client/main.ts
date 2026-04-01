import Phaser from 'phaser';
import { NetworkGameScene } from './scenes/NetworkGameScene';
import { GAME_WIDTH, GAME_HEIGHT, BACKGROUND_COLOR } from '../shared/config';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,  // Phaser will decide whether to use WebGL or Canvas based on the browser's capabilities
  parent: 'app',  // The ID of the DOM element to which the game canvas will be appended
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: BACKGROUND_COLOR,
  scene: [NetworkGameScene], // The main game scene that will be loaded when the game starts
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
