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
      
      // Render dynamic elements such as tanks, bullets, and mines based on the current game state snapshot.
      this.drawDynamic(snapshot);
      
      // Render shot previews based on the current game state snapshot.
      this.renderShotPreviews(snapshot);
      
      // Update the last rendered tick to the current snapshot's tick
      // to avoid re-rendering the same state multiple times.
      this.lastRenderedTick = snapshot.tick;
    }
    
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
    
    // This method renders dynamic elements of the game world such as tanks,
    // bullets, and mines based on the current game state snapshot.
    
    // If the dynamic graphics object is not initialized,
    // we cannot render the dynamic elements, so we return early.
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

  private playExplosionEffect(effect: EffectEvent): void {
    // This method plays a visual explosion effect at the location specified in the EffectEvent.

    // Configurable constants for explosion effect
    const INITIAL_RADIUS = 8; // The initial radius of the explosion effect when it first appears
    const INITIAL_ALPHA = 0.45; // The initial transparency of the explosion effect when it first appears (0 = fully transparent, 1 = fully opaque)
    const DEPTH = 6; // The rendering depth of the explosion effect (higher values are rendered above lower values)

    const wave = this.add.circle(effect.x, effect.y, INITIAL_RADIUS, effect.color, INITIAL_ALPHA);
    wave.setDepth(DEPTH);

    this.tweens.add({
      targets: wave,
      radius: effect.radius,
      alpha: 0, // The final transparency of the explosion effect when it disappears (0 = fully transparent, 1 = fully opaque)
      duration: effect.durationMs, // The duration of the explosion effect in milliseconds
      ease: 'Cubic.Out', // The easing function for the explosion effect animation
      onComplete: () => wave.destroy(), // Callback function to destroy the explosion effect when the animation is complete
    });
  }

  private playTankDestructionEffect(effect: EffectEvent): void {
    // This method plays a visual tank destruction effect at the location specified in the EffectEvent.

    // Configurable constants for tank destruction effect

    const FLASH_RADIUS = 14; // The initial radius of the flash effect when it first appears
    const FLASH_ALPHA = 0.95; // The initial transparency of the flash effect when it first appears (0 = fully transparent, 1 = fully opaque)
    const FLASH_DEPTH = 7; // The rendering depth of the flash effect (higher values are rendered above lower values)
    const FLASH_SCALE = 2.8; // The scale factor for the flash effect
    const FLASH_DURATION = 220; // The duration of the flash effect in milliseconds

    const SHOCKWAVE_RADIUS = 18; // The initial radius of the shockwave effect when it first appears
    const SHOCKWAVE_DEPTH = 6.8; // The rendering depth of the shockwave effect (higher values are rendered above lower values)
    const SHOCKWAVE_STROKE = 4; // The stroke width of the shockwave effect
    const SHOCKWAVE_STROKE_ALPHA = 0.7; // The transparency of the shockwave stroke (0 = fully transparent, 1 = fully opaque)
    const SHOCKWAVE_SCALE = 2.6; // The scale factor for the shockwave effect
    const SHOCKWAVE_DURATION = 300; // The duration of the shockwave effect in milliseconds

    const SHARD_COUNT = 200; // The number of shards to generate for the tank destruction effect
    const SHARD_MIN_DISTANCE = 36;  // The minimum distance that shards will travel from the explosion center
    const SHARD_MAX_DISTANCE = 112; // The maximum distance that shards will travel from the explosion center
    const SHARD_MIN_SIZE = 3; // The minimum size of the shards in the tank destruction effect
    const SHARD_MAX_SIZE = 7; // The maximum size of the shards in the tank destruction effect
    const SHARD_DEPTH = 6.9; // The rendering depth of the shards (higher values are rendered above lower values)
    const SHARD_ALPHA = 0.95; // The initial transparency of the shards when they first appear (0 = fully transparent, 1 = fully opaque)
    const SHARD_SCALE = 0.3; // The scale factor for the shards as they move away from the explosion center
    const SHARD_MIN_DURATION = 240; // The minimum duration of the shard animation in milliseconds
    const SHARD_MAX_DURATION = 430; // The maximum duration of the shard animation in milliseconds
    const SHARD_MIN_ANGLE = -270; // The minimum rotation angle of the shards during the animation
    const SHARD_MAX_ANGLE = 270; // The maximum rotation angle of the shards during the animation

    const SCORCH_OFFSET_Y = 10; // The vertical offset for the scorch mark effect to position it slightly below the explosion center
    const SCORCH_WIDTH = 30; // The initial width of the scorch mark effect when it first appears
    const SCORCH_HEIGHT = 16;  // The initial height of the scorch mark effect when it first appears
    const SCORCH_COLOR = 0x020617;  // The color of the scorch mark effect (in hexadecimal RGB format)
    const SCORCH_ALPHA = 0.5; // The initial transparency of the scorch mark effect when it first appears (0 = fully transparent, 1 = fully opaque)
    const SCORCH_DEPTH = 1.5;  // The rendering depth of the scorch mark effect (higher values are rendered above lower values)
    const SCORCH_SCALE_X = 1.5;  // The scale factor for the scorch mark effect in the horizontal direction as it expands and fades out
    const SCORCH_SCALE_Y = 1.15;  // The scale factor for the scorch mark effect in the vertical direction as it expands and fades out
    const SCORCH_DURATION = 650; // The duration of the scorch mark effect in milliseconds

    const SHAKE_DURATION = 90; // The duration of the camera shake effect in milliseconds
    const SHAKE_INTENSITY = 0.005; // The intensity of the camera shake effect (higher values result in a more intense shake)

    const flash = this.add.circle(effect.x, effect.y, FLASH_RADIUS, effect.color, FLASH_ALPHA);
    flash.setDepth(FLASH_DEPTH);
    flash.setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: flash,
      scaleX: FLASH_SCALE,
      scaleY: FLASH_SCALE,
      alpha: 0,
      duration: FLASH_DURATION,
      ease: 'Cubic.Out',
      onComplete: () => flash.destroy(),
    });

    const shockwave = this.add.circle(effect.x, effect.y, SHOCKWAVE_RADIUS, effect.color, 0);
    shockwave.setDepth(SHOCKWAVE_DEPTH);
    shockwave.setStrokeStyle(SHOCKWAVE_STROKE, effect.color, SHOCKWAVE_STROKE_ALPHA);

    this.tweens.add({
      targets: shockwave,
      scaleX: SHOCKWAVE_SCALE,
      scaleY: SHOCKWAVE_SCALE,
      alpha: 0,
      duration: SHOCKWAVE_DURATION,
      ease: 'Quad.Out',
      onComplete: () => shockwave.destroy(),
    });

    for (let i = 0; i < SHARD_COUNT; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(SHARD_MIN_DISTANCE, SHARD_MAX_DISTANCE);
      const size = Phaser.Math.Between(SHARD_MIN_SIZE, SHARD_MAX_SIZE);
      const shard = this.add.rectangle(effect.x, effect.y, size, size * 1.8, effect.color, SHARD_ALPHA);
      shard.setDepth(SHARD_DEPTH);
      shard.setRotation(angle);

      this.tweens.add({
        targets: shard,
        x: effect.x + Math.cos(angle) * distance,
        y: effect.y + Math.sin(angle) * distance,
        angle: Phaser.Math.Between(SHARD_MIN_ANGLE, SHARD_MAX_ANGLE),
        alpha: 0,
        scaleX: SHARD_SCALE,
        scaleY: SHARD_SCALE,
        duration: Phaser.Math.Between(SHARD_MIN_DURATION, SHARD_MAX_DURATION),
        ease: 'Cubic.Out',
        onComplete: () => shard.destroy(),
      });
    }

    const scorch = this.add.ellipse(
      effect.x,
      effect.y + SCORCH_OFFSET_Y,
      SCORCH_WIDTH,
      SCORCH_HEIGHT,
      SCORCH_COLOR,
      SCORCH_ALPHA,
    );
    scorch.setDepth(SCORCH_DEPTH);
    this.tweens.add({
      targets: scorch,
      alpha: 0,
      scaleX: SCORCH_SCALE_X,
      scaleY: SCORCH_SCALE_Y,
      duration: SCORCH_DURATION,
      ease: 'Quad.Out',
      onComplete: () => scorch.destroy(),
    });

    this.cameras.main.shake(SHAKE_DURATION, SHAKE_INTENSITY, true);
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
