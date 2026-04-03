import Phaser from 'phaser';
import type { WorldSnapshot } from '../../shared/types';

export class ScoreBoard {
  private scoreboardBackground: Phaser.GameObjects.Rectangle | undefined;
  private scoreboardText: Phaser.GameObjects.Text | undefined;

  public constructor(private readonly scene: Phaser.Scene) {}

  public initializeScoreboardUi(): void {
    if (this.scoreboardBackground !== undefined && this.scoreboardText !== undefined) {
      return;
    }

    this.scoreboardBackground = this.scene.add.rectangle(16, 16, 360, 280, 0x020617, 0.5);
    this.scoreboardBackground.setOrigin(0, 0);
    this.scoreboardBackground.setScrollFactor(0);
    this.scoreboardBackground.setDepth(30);

    this.scoreboardText = this.scene.add.text(28, 28, '', {
      color: '#e2e8f0',
      fontSize: '14px',
      fontFamily: 'monospace',
      lineSpacing: 4,
    });
    this.scoreboardText.setScrollFactor(0);
    this.scoreboardText.setDepth(31);

    this.setScoreboardVisibility(false);
  }

  public setScoreboardVisibility(visible: boolean): void {
    this.scoreboardBackground?.setVisible(visible);
    this.scoreboardText?.setVisible(visible);
  }

  public updateScoreboard(snapshot: WorldSnapshot): void {
    if (this.scoreboardBackground === undefined || this.scoreboardText === undefined) {
      return;
    }

    const sortedPlayers = [...snapshot.players].sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      if (b.kills !== a.kills) {
        return b.kills - a.kills;
      }
      if (a.deaths !== b.deaths) {
        return a.deaths - b.deaths;
      }
      return a.id.localeCompare(b.id);
    });

    let elapsed = '';
    if (typeof snapshot.elapsedMs === 'number') {
      const totalSeconds = Math.floor(snapshot.elapsedMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      elapsed = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    const lines = [
      `SCOREBOARD (P)   Time: ${elapsed}`,
      'Name           | Kills | Deaths | Score',
      '---------------+-------+--------+------',
    ];

    for (const player of sortedPlayers) {
      const displayName = player.id.length > 13 ? `${player.id.slice(0, 12)}.` : player.id;
      const nameCell = displayName.padEnd(13, ' ');
      const killsCell = String(player.kills).padStart(5, ' ');
      const deathsCell = String(player.deaths).padStart(6, ' ');
      const scoreCell = String(player.score).padStart(5, ' ');
      lines.push(`${nameCell} |${killsCell} |${deathsCell} |${scoreCell}`);
    }

    this.scoreboardText.setText(lines);
    const requiredHeight = Math.max(120, 48 + sortedPlayers.length * 22);
    this.scoreboardBackground.setSize(360, requiredHeight);
  }
}
