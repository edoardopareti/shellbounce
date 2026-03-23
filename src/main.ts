// src/main.ts
// This is the entry point of the game, where the Phaser game instance is created and configured.
// The configuration includes the game dimensions, background color, scenes, rendering options, and scaling mode.
// The GameScene will be the main scene where the game logic and rendering will occur.

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './game/config';
import { GameScene } from './game/scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#111827',
  scene: [GameScene],
  render: {
    pixelArt: false,
    antialias: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

// Initialize the Phaser game with the specified configuration, which includes:
// - game dimensions
// - background color
// - scenes
// - rendering options
// - scaling mode
// The GameScene will be the main scene where the game logic and rendering will occur.
new Phaser.Game(config);
