import Phaser from 'phaser';
import { InputController } from '../network/InputController';
import { GameCommands } from '../network/GameCommands';
import { GameClient } from '../network/GameClient';
import { type EffectEvent, type WorldSnapshot } from '../../shared/types';
import { RenderTank } from '../render/RenderTank';
import { RenderMine } from '../render/RenderMine';
import { RenderBullet } from '../render/RenderBullet';
import { RenderShotPreview } from '../render/RenderShotPreview';
import { ExplosionEffect } from '../render/ExplosionEffect';
import { TankDestructionEffect } from '../render/TankDestructionEffect';
import { BoostEffect } from '../render/BoostEffect';
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
  private gameCommands: GameCommands | undefined; // The GameCommands object manages the commands that can be sent to the server based on player input.
  private sfx: SfxController | undefined; // The SfxController manages the sound effects for the game, allowing the scene to play sounds in response to game events (e.g., shooting, explosions, etc.).
  private scoreBoard: ScoreBoard | undefined; // The scoreboard displays the current scores of all players
  private wallGraphics: Phaser.GameObjects.Graphics | undefined; // Graphics object for rendering static elements like walls
  private dynamicGraphics: Phaser.GameObjects.Graphics | undefined; // Graphics object for rendering dynamic elements like tanks, bullets, and mines
  private shotPreviewGraphics: Phaser.GameObjects.Graphics | undefined; // Graphics object for rendering shot trajectory previews
  private scoreboardVisible = false; // Flag to track whether the scoreboard is currently visible
  private lastRenderedTick = -1; // The last game tick that was rendered
  private readonly tanks = new Map<string, RenderTank>(); // A map of tank IDs to their corresponding RenderTank objects

  public constructor() {
    super('network-game');  // construct the Phaser.Scene with a unique key 'network-game' to identify this scene within the game instance
  }

  public create(): void {
    // Create is called once when the scene starts.
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

    // Update is called on every game tick (frame) and is responsible
    // for updating the game state, processing player input, and rendering the game world 
    // based on the latest state received from the server.
    
    // Read the current player input and send it to the server.
    if (this.inputController !== undefined) {
      this.client.sendInput(this.inputController.read());
    }
    
    // Get the latest game state snapshot from the server
    // to update the game world rendering.
    const snapshot = this.client.getLatestSnapshot();
    if (snapshot === undefined) {
      return;
    }
    
    // If a new game state is available to render, 
    // then proceed to render the world, play any effects,
    // and update the scoreboard if it's visible.
    if (snapshot.tick !== this.lastRenderedTick) {
      // Ensure that the static world elements (like walls) are rendered first
      // before rendering dynamic elements (like tanks and bullets).
      this.ensureWorldRendered(snapshot);

      // Play any effects (like explosions) that are part of the current game state snapshot.
      this.playEffects(snapshot.effects);

      // Render dynamic elements such as tanks, bullets, mines,
      // and shot previews based on the current game state snapshot.
      this.drawDynamic(snapshot);

      if (this.gameCommands?.read().toggleScoreboardPressed === true) {
        // If the player has pressed the key to toggle the scoreboard,
        // update the visibility of the scoreboard accordingly.
        this.scoreboardVisible = !this.scoreboardVisible;
        this.scoreBoard?.setScoreboardVisibility(this.scoreboardVisible);
    }

      if (this.scoreboardVisible) {
        // If the scoreboard is visible,
        // update its contents based on the current game state snapshot.
        this.scoreBoard?.updateScoreboard(snapshot);
      }
      
      // Center the camera on the player's own tank
      // to keep it in view as they move around the game world.
      this.followOwnedPlayer(snapshot);

      // Update the last rendered tick to the current snapshot's tick
      // to avoid re-rendering the same state multiple times.
      this.lastRenderedTick = snapshot.tick;
    }
  }
  
  private ensureWorldRendered(snapshot: WorldSnapshot): void {

    // This method ensures that the static elements of the game world (like walls) are rendered.
    
    // If the wall graphics object is not initialized, we cannot render the world, so we return early.
    if (this.wallGraphics === undefined) {
      return;
    }
    // If the walls have already been rendered for the current game state snapshot, we can skip re-rendering them to improve performance.
    if (this.wallGraphics.getData('rendered') === true) {
      return;
    }
    
    // Clear the wall graphics to prepare for rendering the walls based on the current game state snapshot.
    this.wallGraphics.clear();
    
    // Fill the background with a solid color to represent the ground or floor of the game world.
    this.wallGraphics.fillStyle(0x111827, 1);
    this.wallGraphics.fillRect(0, 0, snapshot.width, snapshot.height);
    
    // Draw a grid on the background to help players gauge distances and navigate the game world.
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
    
    // Draw the walls based on the current game state snapshot.
    // Each wall is represented as a filled rectangle with a border to distinguish it from the background.
    for (const wall of snapshot.walls) {
      this.wallGraphics.fillStyle(0x334155, 1);
      this.wallGraphics.fillRect(wall.x, wall.y, wall.width, wall.height);
      this.wallGraphics.lineStyle(2, 0x64748b, 0.8);
      this.wallGraphics.strokeRect(wall.x, wall.y, wall.width, wall.height);
    }
    
    // Mark the walls as rendered for the current game state snapshot
    // to avoid unnecessary re-rendering in subsequent updates.
    this.cameras.main.setBounds(0, 0, snapshot.width, snapshot.height);

    // Store a flag in the wall graphics data to indicate that the walls have been rendered
    // for the current snapshot.
    this.wallGraphics.setData('rendered', true);
  }

  private playEffects(effects: EffectEvent[]): void {
    // This method plays visual and audio effects based on
    // the list of EffectEvents provided in the current game state snapshot.
    for (const effect of effects) {
      if (effect.kind === 'bullet-shot') {
        this.sfx?.playBulletShot();
      } else if (effect.kind === 'mine-place') {
        this.sfx?.playMinePlace();
      } else if (effect.kind === 'boost') {
        this.playBoostEffect(effect);
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

  private drawDynamic(snapshot: WorldSnapshot): void {
    // Render dynamic elements such as tanks, bullets, mines, and shot previews based on the current game state snapshot.
    
    if (this.dynamicGraphics === undefined) {
      return;
    }
    this.dynamicGraphics.clear();

    // Render mines
    const mineRenderer = new RenderMine(this);
    for (const mine of snapshot.mines) {
      mineRenderer.sync({
        x: mine.x,
        y: mine.y,
        radius: mine.radius,
        color: mine.color,
        armed: mine.armed,
        graphics: this.dynamicGraphics,
      });
    }

    // Render bullets
    const bulletRenderer = new RenderBullet(this);
    for (const bullet of snapshot.bullets) {
      bulletRenderer.sync({
        x: bullet.x,
        y: bullet.y,
        radius: bullet.radius,
        color: bullet.color,
        isCharged: bullet.isCharged,
        kind: bullet.kind,
        isMitosisSplit: bullet.isMitosisSplit,
        time: this.time.now,
        graphics: this.dynamicGraphics,
      });
    }

    // Render shot previews
    if (this.shotPreviewGraphics !== undefined) {
      this.shotPreviewGraphics.clear();
      const shotPreviewRenderer = new RenderShotPreview(this);
      for (const player of snapshot.players) {
        if (!player.isAlive) continue;
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
        // Prepare segments for renderer
        const segments = trajectory.segments.map(segment => ({
          start: segment.start,
          end: segment.end,
          color: player.bulletColor,
        }));
        shotPreviewRenderer.sync({
          segments,
          graphics: this.shotPreviewGraphics,
        });
      }
    }

    this.syncTanks(snapshot);
  }

  private followOwnedPlayer(snapshot: WorldSnapshot): void {
    // This method centers the camera on the player's own tank
    // to keep it in view as they move around the game world.

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
  
  private playBoostEffect(effect: EffectEvent): void {
    // Use the new BoostEffect class for boost visuals
    const boost = new BoostEffect(this);
    boost.play({
      x: effect.x,
      y: effect.y,
      color: effect.color,
      radius: effect.radius,
      durationMs: effect.durationMs,
      angle: effect.angle,
      scene: this,
    });
  }

  private playExplosionEffect(effect: EffectEvent): void {
    // Use the new ExplosionEffect class for explosion visuals
    const explosion = new ExplosionEffect(this);
    explosion.play({
      x: effect.x,
      y: effect.y,
      color: effect.color,
      radius: effect.radius,
      durationMs: effect.durationMs,
      scene: this,
    });
  }

  private playTankDestructionEffect(effect: EffectEvent): void {
    // Use the new TankDestructionEffect class for tank destruction visuals
    const tankDestruction = new TankDestructionEffect(this);
    tankDestruction.play({
      x: effect.x,
      y: effect.y,
      color: effect.color,
      radius: effect.radius,
      durationMs: effect.durationMs,
      scene: this,
    });
  }

  private syncTanks(snapshot: WorldSnapshot): void {

    // This method synchronizes the RenderTank objects
    // with the current state of the tanks in the game world

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
}
