import Phaser from 'phaser';
import { InputController } from '../network/InputController';
import { GameCommands } from '../network/GameCommands';
import { GameClient } from '../network/GameClient';
import { type EffectEvent, type WorldSnapshot } from '../../shared/types';
import { RenderTank } from '../render/RenderTank';
import { ScoreBoard } from '../render/ScoreBoard';
import { preloadTankTextures } from '../render/tankVisuals';
import {
  BULLET_RADIUS,
  MUZZLE_OFFSET,
  SHOT_PREVIEW_MAX_DISTANCE,
  SHOT_PREVIEW_REFLECTIONS,
} from '../../shared/constants';
import { predictBulletTrajectory } from '../../shared/shotPrediction';
import { SfxController } from '../audio/SfxController';
import { showJoinOverlay } from '../ui/showJoinOverlay';
import { buildWsUrl } from '../network/utils';

const DEFAULT_BACKGROUND = 0x111827;

export class NetworkGameScene extends Phaser.Scene {
  
  // NetworkGameScene is the main client scene for the multiplayer game.
  // It handles rendering the game world, processing player input,
  // and managing network communication with the game server.
  // It extends Phaser.Scene, which provides the core functionality for a game scene in Phaser.

  private readonly client = new GameClient(buildWsUrl()); // Initialize the GameClient with the WebSocket URL to connect to the game server.
  private inputController: InputController | undefined; // The InputController is responsible for reading player input (keyboard and mouse) and translating it into game commands to be sent to the server.
  private gameCommands: GameCommands | undefined;
  private sfx: SfxController | undefined; // The SfxController manages the sound effects for the game, allowing the scene to play sounds in response to game events (e.g., shooting, explosions, etc.).
  private wallGraphics: Phaser.GameObjects.Graphics | undefined;
  private dynamicGraphics: Phaser.GameObjects.Graphics | undefined;
  private shotPreviewGraphics: Phaser.GameObjects.Graphics | undefined;
  private scoreBoard: ScoreBoard | undefined;
  private scoreboardVisible = false;
  private lastRenderedTick = -1;
  private readonly tanks = new Map<string, RenderTank>();

  public constructor() {
    super('network-game');  // construct the Phaser.Scene with a unique key 'network-game' to identify this scene within the game instance
  }

  public create(): void {
    // create is called once when the scene starts.
    // Used to set up the initial state of the scene, load assets, and configure game objects.
    
    // Set the background color of the main camera to the default background color defined in the configuration.
    this.cameras.main.setBackgroundColor(DEFAULT_BACKGROUND);
  
    // Disable the context menu on right-click to allow using right-click for game controls without interference from the browser's default context menu.
    this.input.mouse?.disableContextMenu();
  
    // Preload tank textures so that they are ready to be used when rendering tanks in the game.
    preloadTankTextures(this);
    
    // Create graphics objects for rendering the game world.
    
    this.wallGraphics = this.add.graphics(); // static elements like walls

    this.dynamicGraphics = this.add.graphics(); // dynamic elements like tanks, bullets, and mines
    this.dynamicGraphics.setDepth(5); // Ensure dynamic elements are rendered above the walls

    this.shotPreviewGraphics = this.add.graphics(); // shot trajectory previews
    this.shotPreviewGraphics.setDepth(5.4); // Ensure shot previews are rendered above tanks and bullets but below effects like explosions

    // Initialize the sound effects controller to manage game audio.
    this.sfx = new SfxController();
    
    // Display the join overlay to allow the player to enter their name
    // and select a tank type before connecting to the game server.
    showJoinOverlay((joinProfile) => {
      // Callback function that is called when the player submits the join form
      // ( see addEventListener('submit',.. in showJoinOverlay function below ).
      // This function expects a ClientJoinProfile object containing the player's name and selected tank type,
      // and it will handle connecting to the game server and initializing the input controller.

      // Initialize the input controller to start reading player input after they have joined the game
      // (so that game input is not read before the player has entered their name and selected a tank type).
      this.inputController = new InputController(this);
      this.gameCommands = new GameCommands(this);
      this.scoreBoard = new ScoreBoard(this);
      
      // Initialize the scoreboard UI elements but keep them hidden until the player toggles the scoreboard on.
      this.scoreBoard.initializeScoreboardUi();
      
      // Connect to the game server using the GameClient instance and the collected join profile information
      // (player name and tank type).
      this.client.connect(joinProfile);
    });
  }

  public update(): void {

    if (this.inputController !== undefined) {
      this.client.sendInput(this.inputController.read());
    }

    const snapshot = this.client.getLatestSnapshot();
    if (snapshot === undefined) {
      return;
    }

    if (snapshot.tick !== this.lastRenderedTick) {
      this.ensureWorldRendered(snapshot);
      this.playEffects(snapshot.effects);
      this.drawDynamic(snapshot);
      this.renderShotPreviews(snapshot);
      this.lastRenderedTick = snapshot.tick;
    }

    if (this.gameCommands?.read().toggleScoreboardPressed === true) {
      this.scoreboardVisible = !this.scoreboardVisible;
      this.scoreBoard?.setScoreboardVisibility(this.scoreboardVisible);
    }

    if (this.scoreboardVisible) {
      this.scoreBoard?.updateScoreboard(snapshot);
    }

    this.followOwnedPlayer(snapshot);
  }
  
  private ensureWorldRendered(snapshot: WorldSnapshot): void {
    if (this.wallGraphics === undefined) {
      return;
    }

    if (this.wallGraphics.getData('rendered') === true) {
      return;
    }

    this.wallGraphics.clear();

    this.wallGraphics.fillStyle(0x111827, 1);
    this.wallGraphics.fillRect(0, 0, snapshot.width, snapshot.height);

    this.wallGraphics.lineStyle(1, 0x1f2937, 0.5);
    const spacing = 40;
    for (let x = 0; x <= snapshot.width; x += spacing) {
      this.wallGraphics.beginPath();
      this.wallGraphics.moveTo(x, 0);
      this.wallGraphics.lineTo(x, snapshot.height);
      this.wallGraphics.strokePath();
    }

    for (let y = 0; y <= snapshot.height; y += spacing) {
      this.wallGraphics.beginPath();
      this.wallGraphics.moveTo(0, y);
      this.wallGraphics.lineTo(snapshot.width, y);
      this.wallGraphics.strokePath();
    }

    for (const wall of snapshot.walls) {
      this.wallGraphics.fillStyle(0x334155, 1);
      this.wallGraphics.fillRect(wall.x, wall.y, wall.width, wall.height);
      this.wallGraphics.lineStyle(2, 0x64748b, 0.8);
      this.wallGraphics.strokeRect(wall.x, wall.y, wall.width, wall.height);
    }

    this.cameras.main.setBounds(0, 0, snapshot.width, snapshot.height);
    this.wallGraphics.setData('rendered', true);
  }

  private drawDynamic(snapshot: WorldSnapshot): void {
    if (this.dynamicGraphics === undefined) {
      return;
    }

    this.dynamicGraphics.clear();

    for (const mine of snapshot.mines) {
      this.dynamicGraphics.fillStyle(mine.color, mine.armed ? 1 : 0.95);
      this.dynamicGraphics.fillCircle(mine.x, mine.y, mine.radius);
      this.dynamicGraphics.lineStyle(2, 0x111827, mine.armed ? 1 : 0.8);
      this.dynamicGraphics.strokeCircle(mine.x, mine.y, mine.radius);
    }

    for (const bullet of snapshot.bullets) {
      this.dynamicGraphics.fillStyle(bullet.color, 1);
      this.dynamicGraphics.fillCircle(bullet.x, bullet.y, bullet.radius);
      if (bullet.isCharged) {
        const pulse = 1 + Math.sin(this.time.now * 0.02) * 0.22;
        this.dynamicGraphics.lineStyle(2, 0xfef08a, 0.75);
        this.dynamicGraphics.strokeCircle(bullet.x, bullet.y, (bullet.radius + 3) * pulse);
      }
    }

    this.syncTanks(snapshot);
  }

  private renderShotPreviews(snapshot: WorldSnapshot): void {
    if (this.shotPreviewGraphics === undefined) {
      return;
    }

    this.shotPreviewGraphics.clear();

    for (const player of snapshot.players) {
      if (!player.isAlive) {
        continue;
      }

      const origin = new Phaser.Math.Vector2(
        player.x + Math.cos(player.turretAngle) * MUZZLE_OFFSET,
        player.y + Math.sin(player.turretAngle) * MUZZLE_OFFSET,
      );

      const trajectory = predictBulletTrajectory(
        origin,
        player.turretAngle,
        snapshot.walls,
        BULLET_RADIUS,
        player.isChargingShot ? 0 : SHOT_PREVIEW_REFLECTIONS,
        SHOT_PREVIEW_MAX_DISTANCE,
      );

      for (const segment of trajectory.segments) {
        this.drawDashedLine(segment.start, segment.end, player.bulletColor, 10, 8, 0.8);
      }
    }
  }

  private drawDashedLine(
    start: Phaser.Math.Vector2,
    end: Phaser.Math.Vector2,
    color: number,
    dashLength: number,
    gapLength: number,
    alpha: number,
  ): void {
    if (this.shotPreviewGraphics === undefined) {
      return;
    }

    const totalLength = Phaser.Math.Distance.Between(start.x, start.y, end.x, end.y);
    if (totalLength <= 0.001) {
      return;
    }

    const directionX = (end.x - start.x) / totalLength;
    const directionY = (end.y - start.y) / totalLength;

    let traveled = 0;
    while (traveled < totalLength) {
      const dashStart = traveled;
      const dashEnd = Math.min(traveled + dashLength, totalLength);

      const x1 = start.x + directionX * dashStart;
      const y1 = start.y + directionY * dashStart;
      const x2 = start.x + directionX * dashEnd;
      const y2 = start.y + directionY * dashEnd;

      this.shotPreviewGraphics.lineStyle(2, color, alpha);
      this.shotPreviewGraphics.beginPath();
      this.shotPreviewGraphics.moveTo(x1, y1);
      this.shotPreviewGraphics.lineTo(x2, y2);
      this.shotPreviewGraphics.strokePath();

      traveled += dashLength + gapLength;
    }
  }

  private playEffects(effects: EffectEvent[]): void {
    for (const effect of effects) {
      if (effect.kind === 'bullet-shot') {
        this.sfx?.playBulletShot();
      } else if (effect.kind === 'mine-place') {
        this.sfx?.playMinePlace();
      } else if (effect.kind === 'bullet-explosion') {
        this.sfx?.playBulletExplosion();
        this.playExplosionEffect(effect);
      } else if (effect.kind === 'mine-explosion') {
        this.sfx?.playMineExplosion();
        this.playExplosionEffect(effect);
      } else if (effect.kind === 'explosion') {
        this.playExplosionEffect(effect);
      } else {
        this.sfx?.playTankDestroyed();
        this.playTankDestructionEffect(effect);
      }
    }
  }

  private playExplosionEffect(effect: EffectEvent): void {
    const wave = this.add.circle(effect.x, effect.y, 8, effect.color, 0.45);
    wave.setDepth(6);

    this.tweens.add({
      targets: wave,
      radius: effect.radius,
      alpha: 0,
      duration: effect.durationMs,
      ease: 'Cubic.Out',
      onComplete: () => wave.destroy(),
    });
  }

  private playTankDestructionEffect(effect: EffectEvent): void {
    const flash = this.add.circle(effect.x, effect.y, 14, effect.color, 0.95);
    flash.setDepth(7);
    flash.setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: flash,
      scaleX: 2.8,
      scaleY: 2.8,
      alpha: 0,
      duration: 220,
      ease: 'Cubic.Out',
      onComplete: () => flash.destroy(),
    });

    const shockwave = this.add.circle(effect.x, effect.y, 18, effect.color, 0);
    shockwave.setDepth(6.8);
    shockwave.setStrokeStyle(4, effect.color, 0.7);

    this.tweens.add({
      targets: shockwave,
      scaleX: 2.6,
      scaleY: 2.6,
      alpha: 0,
      duration: 300,
      ease: 'Quad.Out',
      onComplete: () => shockwave.destroy(),
    });

    for (let i = 0; i < 200; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(36, 112);
      const size = Phaser.Math.Between(3, 7);
      const shard = this.add.rectangle(effect.x, effect.y, size, size * 1.8, effect.color, 0.95);
      shard.setDepth(6.9);
      shard.setRotation(angle);

      this.tweens.add({
        targets: shard,
        x: effect.x + Math.cos(angle) * distance,
        y: effect.y + Math.sin(angle) * distance,
        angle: Phaser.Math.Between(-270, 270),
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: Phaser.Math.Between(240, 430),
        ease: 'Cubic.Out',
        onComplete: () => shard.destroy(),
      });
    }

    const scorch = this.add.ellipse(effect.x, effect.y + 10, 30, 16, 0x020617, 0.5);
    scorch.setDepth(1.5);
    this.tweens.add({
      targets: scorch,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.15,
      duration: 650,
      ease: 'Quad.Out',
      onComplete: () => scorch.destroy(),
    });

    this.cameras.main.shake(90, 0.005, true);
  }

  private syncTanks(snapshot: WorldSnapshot): void {
    const aliveIds = new Set(snapshot.players.map((player) => player.id));

    for (const [playerId, tank] of this.tanks.entries()) {
      if (aliveIds.has(playerId)) {
        continue;
      }

      tank.destroy();
      this.tanks.delete(playerId);
    }

    let highestScore = -Infinity;
    let lowestScore = Infinity;
    for (const player of snapshot.players) {
      if (player.score > highestScore) {
        highestScore = player.score;
      }
      if (player.score < lowestScore) {
        lowestScore = player.score;
      }
    }

    const allScoresEqual = highestScore === lowestScore;
    const highestScorerIds = new Set<string>(
      allScoresEqual ? [] : snapshot.players.filter((player) => player.score === highestScore).map((player) => player.id),
    );
    const lowestScorerIds = new Set<string>(
      allScoresEqual ? [] : snapshot.players.filter((player) => player.score === lowestScore).map((player) => player.id),
    );

    for (const player of snapshot.players) {
      let renderTank = this.tanks.get(player.id);
      if (renderTank === undefined) {
        renderTank = new RenderTank(this, player);
        this.tanks.set(player.id, renderTank);
      }

      renderTank.sync(player, highestScorerIds.has(player.id), lowestScorerIds.has(player.id));
    }
  }

  private followOwnedPlayer(snapshot: WorldSnapshot): void {
    const youId = this.client.getPlayerId();
    if (youId === undefined) {
      return;
    }

    const ownPlayer = snapshot.players.find((player) => player.id === youId);
    if (ownPlayer === undefined) {
      return;
    }

    this.cameras.main.centerOn(ownPlayer.x, ownPlayer.y);
  }

}
