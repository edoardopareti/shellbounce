import Phaser from 'phaser';

export interface GameCommandState {
  toggleScoreboardPressed: boolean;
}

export class GameCommands {
  private readonly keys: {
    scoreboardToggle: Phaser.Input.Keyboard.Key;
  };

  public constructor(private readonly scene: Phaser.Scene) {
    this.keys = {
      scoreboardToggle: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P, false),
    };
  }

  public read(): GameCommandState {
    return {
      toggleScoreboardPressed: Phaser.Input.Keyboard.JustDown(this.keys.scoreboardToggle),
    };
  }
}
