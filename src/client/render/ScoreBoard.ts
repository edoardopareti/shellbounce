import Phaser from 'phaser';
import type { WorldSnapshot } from '../../shared/types';

export class ScoreBoard {
  private scoreboardBackground: Phaser.GameObjects.Rectangle | undefined;
  private scoreboardText: Phaser.GameObjects.Text | undefined;

  public constructor(private readonly scene: Phaser.Scene) {}

  public initializeScoreboardUi(): void {

    // This method initializes the UI elements for the scoreboard,
    // including a background rectangle and a text object.

    // Configurable constants for scoreboard UI
    const BG_X = 16; // The X coordinate for the top-left corner of the scoreboard background
    const BG_Y = 16; // The Y coordinate for the top-left corner of the scoreboard background
    const BG_WIDTH = 360; // The width of the scoreboard background
    const BG_HEIGHT = 280; // The initial height of the scoreboard background (will be adjusted based on content)
    const BG_COLOR = 0x020617; // The color of the scoreboard background in hexadecimal (dark blue)
    const BG_ALPHA = 0.5; // The transparency level of the scoreboard background (0.5 means 50% transparent)
    const BG_DEPTH = 30; // The rendering depth of the scoreboard background (higher values are rendered on top of lower values)
    const TEXT_X = 28; // The X coordinate for the top-left corner of the scoreboard text
    const TEXT_Y = 28; // The Y coordinate for the top-left corner of the scoreboard text
    const TEXT_COLOR = '#e2e8f0'; // The color of the scoreboard text in hexadecimal (light gray)
    const TEXT_FONT_SIZE = '14px'; // The font size of the scoreboard text
    const TEXT_FONT_FAMILY = 'monospace'; // The font family of the scoreboard text
    const TEXT_LINE_SPACING = 4; // The line spacing between lines of text in the scoreboard
    const TEXT_DEPTH = 31; // The rendering depth of the scoreboard text (higher values are rendered on top of lower values)

    if (this.scoreboardBackground !== undefined && this.scoreboardText !== undefined) {
      return;
    }

    // Create a semi-transparent background rectangle for the scoreboard
    // positioned at the top-left corner of the screen.
    this.scoreboardBackground = this.scene.add.rectangle(BG_X, BG_Y, BG_WIDTH, BG_HEIGHT, BG_COLOR, BG_ALPHA);
    this.scoreboardBackground.setOrigin(0, 0);
    this.scoreboardBackground.setScrollFactor(0);
    this.scoreboardBackground.setDepth(BG_DEPTH);

    // Create a text object to display the scoreboard information,
    // positioned with some padding inside the background rectangle.
    this.scoreboardText = this.scene.add.text(TEXT_X, TEXT_Y, '', {
      color: TEXT_COLOR,
      fontSize: TEXT_FONT_SIZE,
      fontFamily: TEXT_FONT_FAMILY,
      lineSpacing: TEXT_LINE_SPACING,
    });
    this.scoreboardText.setScrollFactor(0);
    this.scoreboardText.setDepth(TEXT_DEPTH);

    this.setScoreboardVisibility(false);
  }

  public setScoreboardVisibility(visible: boolean): void {
    // This method sets the visibility of the scoreboard UI elements.
    this.scoreboardBackground?.setVisible(visible);
    this.scoreboardText?.setVisible(visible);
  }

  public updateScoreboard(snapshot: WorldSnapshot): void {
    // This method updates the scoreboard display based on the latest game state snapshot.

    if (this.scoreboardBackground === undefined || this.scoreboardText === undefined) {
      return;
    }
    
    // Configurable constants for scoreboard formatting
    const NAME_MAX_LEN = 13; // The maximum length for player names in the scoreboard (longer names will be truncated)
    const NAME_TRUNCATE_LEN = 12; // The length to which player names will be truncated if they exceed the maximum length (one character is reserved for a dot)
    const NAME_HEADER = 'Name'; // The header text for the player name column in the scoreboard
    const KILLS_HEADER = 'Kills'; // The header text for the kills column in the scoreboard
    const DEATHS_HEADER = 'Deaths'; // The header text for the deaths column in the scoreboard
    const SCORE_HEADER = 'Score';  // The header text for the score column in the scoreboard
    const HEADER_LINE = `${NAME_HEADER.padEnd(NAME_MAX_LEN, ' ')} | ${KILLS_HEADER.padStart(5, ' ')} | ${DEATHS_HEADER.padStart(6, ' ')} | ${SCORE_HEADER.padStart(5, ' ')}`;
    const SEPARATOR_LINE = `${'-'.repeat(NAME_MAX_LEN)}+${'-'.repeat(7)}+${'-'.repeat(8)}+${'-'.repeat(6)}`; // A separator line to visually separate the header from the player entries in the scoreboard
    const HEADER_TITLE = 'SCOREBOARD (P)'; // The title text for the scoreboard, indicating that it can be toggled with the 'P' key
    const HEADER_TIME_LABEL = 'Time:'; // The label for the elapsed time display in the scoreboard
    const BG_WIDTH = 360; // The width of the scoreboard background
    const BG_MIN_HEIGHT = 120; // The minimum height of the scoreboard background
    const BG_BASE_HEIGHT = 100; // The base height of the scoreboard background
    const BG_ROW_HEIGHT = 22; // The height of each row in the scoreboard background

    // Sort the players by score (descending), then by kills (descending), then by deaths (ascending),
    // and finally by player ID (ascending) to ensure a consistent order in the scoreboard.
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

    // Format the elapsed time from milliseconds to a MM:SS format for display on the scoreboard.
    let elapsed = '';
    if (typeof snapshot.elapsedMs === 'number') {
      const totalSeconds = Math.floor(snapshot.elapsedMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      elapsed = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Prepare the lines of text to display on the scoreboard, including a header and a line for each player with their name, kills, deaths, and score.
    const lines = [
      `${HEADER_TITLE}   ${HEADER_TIME_LABEL} ${elapsed}`,
      HEADER_LINE,
      SEPARATOR_LINE,
    ];

    // Add a line for each player in the sorted list, formatting their name and stats into aligned columns.
    for (const player of sortedPlayers) {
      const displayName = player.id.length > NAME_MAX_LEN ? `${player.id.slice(0, NAME_TRUNCATE_LEN)}.` : player.id;
      const nameCell = displayName.padEnd(NAME_MAX_LEN, ' ');
      const killsCell = String(player.kills).padStart(5, ' ');
      const deathsCell = String(player.deaths).padStart(6, ' ');
      const scoreCell = String(player.score).padStart(5, ' ');
      lines.push(`${nameCell} |${killsCell} |${deathsCell} |${scoreCell}`);
    }

    // Update the text object with the prepared lines
    this.scoreboardText.setText(lines);
    // Adjust the background size based on the number of players to ensure all information fits properly.
    const requiredHeight = Math.max(BG_MIN_HEIGHT, BG_BASE_HEIGHT + sortedPlayers.length * BG_ROW_HEIGHT);
    this.scoreboardBackground.setSize(BG_WIDTH, requiredHeight);
  }
}
