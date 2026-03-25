import Phaser from 'phaser';
import { ArenaMap } from '../map/ArenaMap';
import { Bullet } from '../entities/Bullet';
import { Mine } from '../entities/Mine';
import { Tank, type TankAppearance } from '../entities/Tank';
import { InputController, type TankInput } from '../systems/InputController';
import {
  BULLET_EXPLOSION_VISUAL_DURATION_MS,
  BULLET_RADIUS,
  MAX_ACTIVE_MINES_PER_TANK,
  MAX_ACTIVE_BULLETS_PER_TANK,
  MINE_EXPLOSION_RADIUS,
  MINE_EXPLOSION_VISUAL_DURATION_MS,
  SHOT_PREVIEW_MAX_DISTANCE,
  SHOT_PREVIEW_REFLECTIONS,
  SPAWN_CORNER_PADDING,
  TANK_RESPAWN_DELAY_MS,
} from '../constants';
import { ENEMY_AI_DIFFICULTY, ENEMY_COUNT } from '../config';
import { EnemyAiController } from '../systems/EnemyAiController';
import { SfxController } from '../systems/SfxController';
import { predictBulletTrajectory } from '../utils/shotPrediction';

//TODO remove magic numbers and magic strings
//TODO increase code modularity by splitting GameScene into multiple classes/files

//GAME MECHANICS TODOs:
//TODO if left click is pressed for a certain amount of time without releasing, charge up a more powerful shot which moves faster and bigger explosion radius but without rebounce - add visual feedback for the charging state and the increased power level, and with a cooldown after firing to prevent spamming the charged shot 
//TODO define multiple map layouts and load them at runtime, instead of hardcoding a single arena layout
//TODO define multiple types of tanks
//TODO add allies
//TODO Add temporary invincibility and visual feedback on respawn, to avoid frustrating instant deaths right after respawning, especially in crowded areas with many active bullets and mines
//TODO add directional rebouncing shield mechanics with left+right click to deploy, with cooldown and limited durability (rebounce bullets and protects from explosions while active) 
//TODO add different weapons as collectables in the arena, with different primary (left click) and secondary (right click) fire modes, such as:
// - spread shot with wider bullet angles and shorter range (left click: shoots, right click: explode)
// - single large range missile with no rebounce but slighly controllable trajectory and bigger explosion radius (left click: shoots, right click: detonates mid-flight, left click+move mouse: applies a directional impulse to the missile)
// - minigun with very high firerate small bullets but without rebounce and explosions and with cooldown and limited durability (left click: shoots)
//TODO add powerups and pickups in the arena

//TODO add the following game modes:
// - story mode, which can either be single player or co-op, with a series of levels with different arena layouts and enemy configurations
// - free-for-all multiplayer arena (online)


// TankSlot represents a slot for a tank in the game,
// which can be occupied by either a player-controlled tank or an AI-controlled enemy tank.
// A slot includes information about whether it is controlled by the player,
// the AI controller (if applicable), the tank's appearance,
// the tank instance (if currently active), and the respawn time if the tank is destroyed.
interface TankSlot {
  id: string;
  controlledByPlayer: boolean;
  aiController: EnemyAiController | undefined;
  appearance: TankAppearance;
  tank: Tank | undefined;
  respawnAtMs: number | undefined;
}

export class GameScene extends Phaser.Scene {

  private arenaMap!: ArenaMap;
  private inputController!: InputController;
  private tanks: TankSlot[] = [];
  private bullets: Bullet[] = [];
  private mines: Mine[] = [];
  private pendingDetonationTankIds: string[] = [];
  private pendingMinePlacementTankIds: string[] = [];
  private hudText!: Phaser.GameObjects.Text;
  private shotPreviewGraphics!: Phaser.GameObjects.Graphics;
  private sfx!: SfxController;
  
  private readonly playerTankId = 'player-1';

  // Defining appearances for player tank
  private static readonly PLAYER_APPEARANCE: TankAppearance = {
    bodyTextureKey: 'tank-body-player',
    turretTextureKey: 'tank-turret-player',
    bulletColor: 0x22c55e,
  };
  // Defining appearances for enemy tanks
  private static readonly ENEMY_APPEARANCE: TankAppearance = {
    bodyTextureKey: 'tank-body-enemy',
    turretTextureKey: 'tank-turret-enemy',
    bulletColor: 0xdc2626,
  };

  // An empty input object to use for AI tanks when
  // they don't have a valid tank instance (e.g., during respawn)
  private readonly emptyInput: TankInput = {
    moveForward: false,
    moveBackward: false,
    turnLeft: false,
    turnRight: false,
    firePressed: false,
    fireHeld: false,
    fireReleased: false,
    detonatePressed: false,
    placeMinePressed: false,
    boostPressed: false,
    pointerWorldX: 0,
    pointerWorldY: 0,
  };

  public constructor() {
    super('game');
  }
  
  // Phaser scene lifecycle methods: preload, create, update
  // Preload is called before the scene is created, used to load assets
  public preload(): void {
    this.createTextures();
  }
  // Create is called once after preload, used to set up the game objects and initial state
  public create(): void {

    // Render the arena map, which draws the background, grid, and walls onto the scene
    this.arenaMap = new ArenaMap(this);  // Initialize the arena map, which generates the walls based on the scene's dimensions and renders the background, grid, and walls onto the scene
    this.arenaMap.render(); // Render the arena map, which draws the background, grid, and walls onto the scene
    
    // Initialize the input controller, which will handle player input
    // and provide it to the game logic during the update loop.
    this.inputController = new InputController(this);

    this.input.mouse?.disableContextMenu();  // Disable the default context menu on right-click to allow using right-click for game actions without interference
    
    // Define spawn points for tanks in the corners of the arena, with some padding from the walls, to ensure that tanks don't spawn too close to the walls and have some space to maneuver right after spawning
    const spawnPoints = this.getCornerSpawnPoints(); 
    
    // Initialize the player tank in the first spawn point,
    // with the defined appearance and controlledByPlayer set to true
    const playerSlot: TankSlot = {
      id: this.playerTankId,
      controlledByPlayer: true,
      aiController: undefined,
      appearance: GameScene.PLAYER_APPEARANCE,
      tank: new Tank(this, this.playerTankId, spawnPoints[0].x, spawnPoints[0].y, GameScene.PLAYER_APPEARANCE),
      respawnAtMs: undefined,
    };
    
    // Initialize enemy tanks in the remaining spawn points,
    // with the defined appearance and controlledByPlayer set to false,
    // and assign an AI controller to each enemy tank based on the configured difficulty level
    const enemySlots: TankSlot[] = [];
    for (let enemyIndex = 0; enemyIndex < ENEMY_COUNT; enemyIndex += 1) {
      const enemyId = `enemy-${enemyIndex + 1}`;
      const spawnPoint = spawnPoints[(enemyIndex + 1) % spawnPoints.length];

      enemySlots.push({
        id: enemyId,
        controlledByPlayer: false,
        aiController: new EnemyAiController(ENEMY_AI_DIFFICULTY),
        appearance: GameScene.ENEMY_APPEARANCE,
        tank: new Tank(this, enemyId, spawnPoint.x, spawnPoint.y, GameScene.ENEMY_APPEARANCE),
        respawnAtMs: undefined,
      });
    }
    
    // Combine the player slot and enemy slots into the tanks array,
    // which will be used to manage all tanks in the game
    this.tanks = [playerSlot, ...enemySlots];
    
    // Initialize the HUD (heads-up display) text object, which will display game information
    // such as player health, score, etc., and set its depth and scroll factor
    // to ensure it stays on top of other game objects and doesn't scroll with the camera
    this.hudText = this.add.text(16, 16, '', {
      color: '#e2e8f0',
      fontSize: '16px',
      fontFamily: 'monospace',
      lineSpacing: 6,
    });
    this.hudText.setDepth(10); // Set depth to ensure HUD is rendered above all other game objects
    this.hudText.setScrollFactor(1);  // Set scroll factor to 0 to make the HUD stay fixed on the screen and not scroll with the camera
    
    // Initialize the graphics object for rendering shot previews,
    // which will be used to visualize the predicted trajectory 
    // of bullets when the player is aiming and about to shoot.
    this.shotPreviewGraphics = this.add.graphics();
    this.shotPreviewGraphics.setDepth(5); // Set depth to ensure shot previews are rendered above the arena and below the HUD
    
    // Initialize the sound effects controller,
    // which will manage playing sound effects for various game actions such as shooting, explosions, etc.
    this.sfx = new SfxController(this);
    
    // Set up an event listener for the scene shutdown event
    // to perform any necessary cleanup when the scene is shut down
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }
  
  // Update is called automatically on every game tick,
  // and is used to update the game state and handle interactions
  // _time is the current time in milliseconds,
  // and deltaMs is the time elapsed since the last update in milliseconds
  public update(_time: number, deltaMs: number): void {

    // Calculate deltaSeconds from deltaMs,
    // capping it to a maximum value to prevent issues with very large delta times
    // (e.g., when the game is paused or lags)
    const deltaSeconds = Math.min(deltaMs / 1000, 1 / 30);

    // Read the current player input from the input controller,
    // which will be used to update the player tank's state and actions during this update cycle
    const playerInput = this.inputController.read();
    
    // Main update loop for the game scene
    this.updateTanks(deltaSeconds, playerInput); // Update the state of all tanks based on player input and AI controllers
    this.processPendingMinePlacements(); // Handle any mines that are pending placement
    this.updateBullets(deltaSeconds); // Update the state of all bullets
    this.resolveBulletBulletCollisions(); // Check for and resolve collisions between bullets
    this.updateMines(deltaSeconds); // Update the state of all mines
    this.processPendingDetonations(); // Handle any mines that are pending detonation
    this.resolveBulletImpacts(); // Check for and resolve bullet impacts on tanks and other objects
    this.resolveMineTankTriggers(); // Check for and resolve mine triggers on tanks
    this.processRespawns(); // Handle tank respawns
    this.cleanupBullets(); // Remove any bullets that are no longer active
    this.cleanupMines(); // Remove any mines that are no longer active
    this.renderShotPreviews(); // Render the predicted trajectory of bullets for aiming
    this.updateHud(); // Update the heads-up display with the latest game information
  }

  private updateTanks(deltaSeconds: number, playerInput: TankInput): void {
    // Update the state of all tanks in the game based on player input and AI controllers.
    
    // Find the player's tank instance from the tanks array using the playerTankId,
    // which will be passed to the AI controllers to allow them to make informed decisions
    // based on the player's position and actions.
    const playerTank = this.tanks.find((slot) => slot.id === this.playerTankId)?.tank;

    this.pendingDetonationTankIds = [];  // Reset the list of pending detonation tank IDs at the start of each update cycle,
    this.pendingMinePlacementTankIds = [];  // Reset the list of pending mine placement tank IDs at the start of each update cycle,

    for (const slot of this.tanks) {
      if (slot.tank === undefined) {
        continue;
      }
       
      // Resolve the input for the current tank slot,
      // which will be either the player input (if controlled by player)
      // or the AI controller's input (if controlled by AI)
      const input = this.resolveTankInput(slot, playerInput, playerTank);
      
      // Check if the fire, detonate, or place mine actions were triggered by the input,
      // and if so, add the tank's ID to the corresponding pending action lists,
      // to be processed later in the update cycle.
      // This allows the game to handle these actions in a consistent way during the update loop, 
      // and ensures that actions are not missed even if the input is read at a different time
      // than when the actions are processed.
      if (input.detonatePressed && !this.pendingDetonationTankIds.includes(slot.id)) {
        this.pendingDetonationTankIds.push(slot.id);
      }
      if (input.placeMinePressed && !this.pendingMinePlacementTankIds.includes(slot.id)) {
        this.pendingMinePlacementTankIds.push(slot.id);
      }
      const canFire = this.getActiveBulletCountForTank(slot.id) < MAX_ACTIVE_BULLETS_PER_TANK;
      const updateResult = slot.tank.update(deltaSeconds, input, this.arenaMap.walls, canFire);
      if (updateResult.firedBullet !== undefined) {
        this.bullets.push(updateResult.firedBullet);
        this.sfx.playBulletShot();
      }

      if (updateResult.selfDestructed) {
        this.destroyTank(slot);
      }
    }
  }

  private getActiveBulletCountForTank(tankId: string): number {
    let activeCount = 0;

    for (const bullet of this.bullets) {
      if (!bullet.isAlive) {
        continue;
      }

      if (bullet.ownerTankId === tankId) {
        activeCount += 1;
      }
    }

    return activeCount;
  }

  private getActiveMineCountForTank(tankId: string): number {
    let activeCount = 0;

    for (const mine of this.mines) {
      if (!mine.isAlive) {
        continue;
      }

      if (mine.ownerTankId === tankId) {
        activeCount += 1;
      }
    }

    return activeCount;
  }

  private resolveTankInput(slot: TankSlot, playerInput: TankInput, playerTank: Tank | undefined): TankInput {
    
    // Determine the input for a given tank slot,
    // which will be the player input if the slot is controlled by the player,
    // or the AI controller's input if the slot is controlled by AI.

    if (slot.controlledByPlayer) {
      return playerInput;  // If the slot is controlled by the player, return the player input directly.
    }

    if (slot.aiController === undefined || slot.tank === undefined) {
      return this.emptyInput;
    }
    
    // If the slot is controlled by AI, call the AI controller's readInput method to get the input for this tank.
    return slot.aiController.readInput(this.time.now, slot.tank, playerTank, this.arenaMap.walls, this.bullets);
  }

  private updateBullets(deltaSeconds: number): void {
    for (const bullet of this.bullets) {
      const hitWall = bullet.update(deltaSeconds, this.arenaMap.walls);
      if (hitWall && bullet.isAlive && bullet.explodeOnWallImpact) {
        this.triggerBulletExplosion(bullet);
      }
    }
  }

  private updateMines(deltaSeconds: number): void {
    for (const mine of this.mines) {
      if (!mine.isAlive) {
        continue;
      }

      const shouldExplode = mine.update(deltaSeconds);
      if (shouldExplode) {
        this.triggerMineExplosion(mine);
      }
    }
  }

  private resolveBulletImpacts(): void {
    for (const bullet of this.bullets) {
      if (!bullet.isAlive) {
        continue;
      }

      let explodedOnMine = false;
      for (const mine of this.mines) {
        if (!mine.isAlive) {
          continue;
        }

        if (!this.isBulletHittingMine(bullet, mine)) {
          continue;
        }

        bullet.destroy();
        this.triggerMineExplosion(mine);
        explodedOnMine = true;
        break;
      }

      if (explodedOnMine || !bullet.isAlive) {
        continue;
      }

      for (const tankSlot of this.tanks) {
        const tank = tankSlot.tank;
        if (tank === undefined) {
          continue;
        }

        if (!this.isBulletHittingTank(bullet, tank)) {
          continue;
        }

        bullet.destroy();
        this.destroyTank(tankSlot);
        break;
      }
    }
  }

  private resolveBulletBulletCollisions(): void {
    for (let i = 0; i < this.bullets.length; i += 1) {
      const first = this.bullets[i];
      if (!first.isAlive) {
        continue;
      }

      for (let j = i + 1; j < this.bullets.length; j += 1) {
        const second = this.bullets[j];
        if (!second.isAlive) {
          continue;
        }

        if (first.ownerTankId === second.ownerTankId) {
          continue;
        }

        if (!this.areBulletsColliding(first, second)) {
          continue;
        }

        this.triggerBulletExplosion(first);
        if (second.isAlive) {
          this.triggerBulletExplosion(second);
        }
        break;
      }
    }
  }

  private resolveMineTankTriggers(): void {
    for (const mine of this.mines) {
      if (!mine.isAlive) {
        continue;
      }

      const ownerTank = this.tanks.find((slot) => slot.id === mine.ownerTankId)?.tank;
      if (ownerTank !== undefined) {
        mine.updateOwnerClearance(this.isMineHittingTank(mine, ownerTank));
      } else {
        mine.updateOwnerClearance(false);
      }

      for (const tankSlot of this.tanks) {
        const tank = tankSlot.tank;
        if (tank === undefined) {
          continue;
        }

        if (!mine.canBeTriggeredByTank(tankSlot.id)) {
          continue;
        }

        if (!this.isMineHittingTank(mine, tank)) {
          continue;
        }

        this.triggerMineExplosion(mine);
        break;
      }
    }
  }

  private processRespawns(): void {
    const now = this.time.now;

    for (const tankSlot of this.tanks) {
      if (tankSlot.tank !== undefined || tankSlot.respawnAtMs === undefined || now < tankSlot.respawnAtMs) {
        continue;
      }

      const spawnPoint = this.pickAvailableCornerSpawn(tankSlot.id);
      if (spawnPoint === undefined) {
        tankSlot.respawnAtMs = now + 250;
        continue;
      }

      tankSlot.tank = new Tank(this, tankSlot.id, spawnPoint.x, spawnPoint.y, tankSlot.appearance);
      tankSlot.respawnAtMs = undefined;
    }
  }

  private cleanupBullets(): void {
    this.bullets = this.bullets.filter((bullet) => bullet.isAlive);
  }

  private cleanupMines(): void {
    this.mines = this.mines.filter((mine) => mine.isAlive);
  }

  private processPendingMinePlacements(): void {
    for (const tankId of this.pendingMinePlacementTankIds) {
      this.tryPlaceMineForTank(tankId);
    }

    this.pendingMinePlacementTankIds = [];
  }

  private tryPlaceMineForTank(tankId: string): void {
    if (this.getActiveMineCountForTank(tankId) >= MAX_ACTIVE_MINES_PER_TANK) {
      return;
    }

    const tankSlot = this.tanks.find((slot) => slot.id === tankId);
    if (tankSlot?.tank === undefined) {
      return;
    }

    const mineColor = tankSlot.controlledByPlayer ? 0x22c55e : 0xdc2626;
    this.mines.push(new Mine(this, tankId, tankSlot.tank.x, tankSlot.tank.y, mineColor));
    this.sfx.playMinePlace();
  }

  private processPendingDetonations(): void {
    for (const tankId of this.pendingDetonationTankIds) {
      this.tryDetonateOldestBulletForTank(tankId);
    }

    this.pendingDetonationTankIds = [];
  }

  private tryDetonateOldestBulletForTank(tankId: string): void {
    const oldestBullet = this.bullets.find((bullet) => bullet.isAlive && bullet.ownerTankId === tankId);

    if (oldestBullet === undefined) {
      return;
    }

    this.triggerBulletExplosion(oldestBullet);
  }

  private triggerBulletExplosion(bullet: Bullet): void {
    const centerX = bullet.x;
    const centerY = bullet.y;

    bullet.destroy();
    this.sfx.playBulletExplosion();
    const explosionColor = bullet.isCharged ? 0xf97316 : 0xf59e0b;
    this.applyAreaExplosion(centerX, centerY, bullet.explosionRadius, explosionColor, BULLET_EXPLOSION_VISUAL_DURATION_MS);
  }

  private triggerMineExplosion(mine: Mine): void {
    if (!mine.isAlive) {
      return;
    }

    const centerX = mine.x;
    const centerY = mine.y;

    mine.destroy();
    this.sfx.playMineExplosion();
    this.applyAreaExplosion(centerX, centerY, MINE_EXPLOSION_RADIUS, 0xfb7185, MINE_EXPLOSION_VISUAL_DURATION_MS);
  }

  private applyAreaExplosion(
    centerX: number,
    centerY: number,
    radius: number,
    color: number,
    durationMs: number,
  ): void {
    this.applyExplosionDamage(centerX, centerY, radius);
    this.triggerMinesInExplosion(centerX, centerY, radius);
    this.playExplosionEffect(centerX, centerY, radius, color, durationMs);
  }

  private applyExplosionDamage(centerX: number, centerY: number, radius: number): void {
    for (const tankSlot of this.tanks) {
      const tank = tankSlot.tank;
      if (tank === undefined) {
        continue;
      }

      const damageDistance = radius + tank.radius;
      const distanceSquared = Phaser.Math.Distance.Squared(centerX, centerY, tank.x, tank.y);
      const blockedByWall = this.isExplosionBlockedByWall(centerX, centerY, tank.x, tank.y);

      if (distanceSquared <= damageDistance * damageDistance && !blockedByWall) {
        this.destroyTank(tankSlot);
      }
    }
  }

  private triggerMinesInExplosion(centerX: number, centerY: number, radius: number): void {
    for (const mine of this.mines) {
      if (!mine.isAlive) {
        continue;
      }

      const triggerDistance = radius + mine.radius;
      const distanceSquared = Phaser.Math.Distance.Squared(centerX, centerY, mine.x, mine.y);
      const blockedByWall = this.isExplosionBlockedByWall(centerX, centerY, mine.x, mine.y);

      if (distanceSquared <= triggerDistance * triggerDistance && !blockedByWall) {
        this.triggerMineExplosion(mine);
      }
    }
  }

  private isExplosionBlockedByWall(startX: number, startY: number, endX: number, endY: number): boolean {
    for (const wall of this.arenaMap.walls) {
      if (this.segmentIntersectsRectangle(startX, startY, endX, endY, wall)) {
        return true;
      }
    }

    return false;
  }

  private segmentIntersectsRectangle(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    rect: { x: number; y: number; width: number; height: number },
  ): boolean {
    const dx = endX - startX;
    const dy = endY - startY;

    let tMin = 0;
    let tMax = 1;

    const xResult = this.clipSegmentAxis(startX, dx, rect.x, rect.x + rect.width, tMin, tMax);
    if (xResult === undefined) {
      return false;
    }
    tMin = xResult.tMin;
    tMax = xResult.tMax;

    const yResult = this.clipSegmentAxis(startY, dy, rect.y, rect.y + rect.height, tMin, tMax);
    if (yResult === undefined) {
      return false;
    }

    tMin = yResult.tMin;
    tMax = yResult.tMax;

    return tMin <= tMax && tMax >= 0 && tMin <= 1;
  }

  private clipSegmentAxis(
    start: number,
    delta: number,
    min: number,
    max: number,
    currentTMin: number,
    currentTMax: number,
  ): { tMin: number; tMax: number } | undefined {
    if (Math.abs(delta) < Number.EPSILON) {
      if (start < min || start > max) {
        return undefined;
      }

      return { tMin: currentTMin, tMax: currentTMax };
    }

    const inverseDelta = 1 / delta;
    let t1 = (min - start) * inverseDelta;
    let t2 = (max - start) * inverseDelta;

    if (t1 > t2) {
      [t1, t2] = [t2, t1];
    }

    const nextTMin = Math.max(currentTMin, t1);
    const nextTMax = Math.min(currentTMax, t2);

    if (nextTMin > nextTMax) {
      return undefined;
    }

    return { tMin: nextTMin, tMax: nextTMax };
  }

  private playExplosionEffect(centerX: number, centerY: number, radius: number, color: number, durationMs: number): void {
    const wave = this.add.circle(centerX, centerY, 8, color, 0.45);
    wave.setDepth(6);

    this.tweens.add({
      targets: wave,
      radius,
      alpha: 0,
      duration: durationMs,
      ease: 'Cubic.Out',
      onComplete: () => wave.destroy(),
    });
  }

  private isBulletHittingTank(bullet: Bullet, tank: Tank): boolean {
    const hitDistance = bullet.radius + tank.radius;
    const distanceSquared = Phaser.Math.Distance.Squared(bullet.x, bullet.y, tank.x, tank.y);
    return distanceSquared <= hitDistance * hitDistance;
  }

  private areBulletsColliding(first: Bullet, second: Bullet): boolean {
    const hitDistance = first.radius + second.radius;
    const distanceSquared = Phaser.Math.Distance.Squared(first.x, first.y, second.x, second.y);
    return distanceSquared <= hitDistance * hitDistance;
  }

  private isMineHittingTank(mine: Mine, tank: Tank): boolean {
    const hitDistance = mine.radius + tank.radius;
    const distanceSquared = Phaser.Math.Distance.Squared(mine.x, mine.y, tank.x, tank.y);
    return distanceSquared <= hitDistance * hitDistance;
  }

  private isBulletHittingMine(bullet: Bullet, mine: Mine): boolean {
    const hitDistance = bullet.radius + mine.radius;
    const distanceSquared = Phaser.Math.Distance.Squared(bullet.x, bullet.y, mine.x, mine.y);
    return distanceSquared <= hitDistance * hitDistance;
  }

  private destroyTank(tankSlot: TankSlot): void {
    if (tankSlot.tank === undefined) {
      return;
    }

    const destroyedTankX = tankSlot.tank.x;
    const destroyedTankY = tankSlot.tank.y;
    this.playTankDestructionEffect(destroyedTankX, destroyedTankY, tankSlot.appearance.bulletColor);

    tankSlot.tank.destroy();
    tankSlot.tank = undefined;
    tankSlot.respawnAtMs = this.time.now + TANK_RESPAWN_DELAY_MS;
  }

  private playTankDestructionEffect(x: number, y: number, color: number): void {
    this.sfx.playTankDestroyed();

    const flash = this.add.circle(x, y, 14, color, 0.95);
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

    const shockwave = this.add.circle(x, y, 18, color, 0);
    shockwave.setDepth(6.8);
    shockwave.setStrokeStyle(4, color, 0.7);

    this.tweens.add({
      targets: shockwave,
      scaleX: 2.6,
      scaleY: 2.6,
      alpha: 0,
      duration: 300,
      ease: 'Quad.Out',
      onComplete: () => shockwave.destroy(),
    });

    const debrisCount = 12;
    for (let i = 0; i < debrisCount; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(36, 112);
      const size = Phaser.Math.Between(3, 7);
      const shard = this.add.rectangle(x, y, size, size * 1.8, color, 0.95);
      shard.setDepth(6.9);
      shard.setRotation(angle);

      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        angle: Phaser.Math.Between(-270, 270),
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: Phaser.Math.Between(240, 430),
        ease: 'Cubic.Out',
        onComplete: () => shard.destroy(),
      });
    }

    const scorch = this.add.ellipse(x, y + 10, 30, 16, 0x020617, 0.5);
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

    this.cameras.main.shake(90, 0.0028, true);
  }

  private pickAvailableCornerSpawn(excludedTankId: string): Phaser.Math.Vector2 | undefined {
    const spawnPoints = this.getCornerSpawnPoints();
    Phaser.Utils.Array.Shuffle(spawnPoints);

    for (const spawnPoint of spawnPoints) {
      if (this.isSpawnPointBlocked(spawnPoint, excludedTankId)) {
        continue;
      }

      return spawnPoint;
    }

    return undefined;
  }

  private getCornerSpawnPoints(): Phaser.Math.Vector2[] {

    // Define spawn points in the corners of the arena, with some padding from the walls,
    // to ensure that tanks don't spawn too close to the walls 
    // and have some space to maneuver right after spawning

    // Calculate the playable bounds of the arena by analyzing the walls
    // and determining how much they inset from each edge of the arena.
    const bounds = this.getPlayableBounds();
    const p = SPAWN_CORNER_PADDING; // Padding from the walls to avoid spawning too close to them

    return [
      new Phaser.Math.Vector2(bounds.left + p, bounds.top + p),
      new Phaser.Math.Vector2(bounds.right - p, bounds.top + p),
      new Phaser.Math.Vector2(bounds.left + p, bounds.bottom - p),
      new Phaser.Math.Vector2(bounds.right - p, bounds.bottom - p),
    ];
  }

  private getPlayableBounds(): { left: number; top: number; right: number; bottom: number } {
    const width = this.scale.width;
    const height = this.scale.height;
    const epsilon = 0.001;
    const fullWidthThreshold = width * 0.95;
    const fullHeightThreshold = height * 0.95;

    let leftInset = 0;
    let rightInset = 0;
    let topInset = 0;
    let bottomInset = 0;
    
    // Analyze the walls to determine how much they inset from each edge of the arena,
    // to calculate the playable area within the arena that is not obstructed by walls.
    // This allows for more accurate spawn point placement and better gameplay experience.
    for (const wall of this.arenaMap.walls) {
      const touchesLeft = Math.abs(wall.x) <= epsilon;
      const touchesTop = Math.abs(wall.y) <= epsilon;
      const touchesRight = Math.abs(wall.x + wall.width - width) <= epsilon;
      const touchesBottom = Math.abs(wall.y + wall.height - height) <= epsilon;

      const isVerticalBorderCandidate = wall.height >= fullHeightThreshold;
      const isHorizontalBorderCandidate = wall.width >= fullWidthThreshold;

      if (touchesLeft && isVerticalBorderCandidate) {
        leftInset = Math.max(leftInset, wall.width);
      }
      if (touchesTop && isHorizontalBorderCandidate) {
        topInset = Math.max(topInset, wall.height);
      }
      if (touchesRight && isVerticalBorderCandidate) {
        rightInset = Math.max(rightInset, wall.width);
      }
      if (touchesBottom && isHorizontalBorderCandidate) {
        bottomInset = Math.max(bottomInset, wall.height);
      }
    }

    return {
      left: leftInset,
      top: topInset,
      right: width - rightInset,
      bottom: height - bottomInset,
    };
  }

  private isSpawnPointBlocked(spawnPoint: Phaser.Math.Vector2, excludedTankId: string): boolean {
    const playerRadius = this.getTankRadius();

    for (const wall of this.arenaMap.walls) {
      const closestX = Phaser.Math.Clamp(spawnPoint.x, wall.x, wall.x + wall.width);
      const closestY = Phaser.Math.Clamp(spawnPoint.y, wall.y, wall.y + wall.height);
      const distanceSquared = Phaser.Math.Distance.Squared(spawnPoint.x, spawnPoint.y, closestX, closestY);
      if (distanceSquared < playerRadius * playerRadius) {
        return true;
      }
    }

    for (const tankSlot of this.tanks) {
      if (tankSlot.id === excludedTankId || tankSlot.tank === undefined) {
        continue;
      }

      const minDistance = playerRadius + tankSlot.tank.radius;
      const distanceSquared = Phaser.Math.Distance.Squared(
        spawnPoint.x,
        spawnPoint.y,
        tankSlot.tank.x,
        tankSlot.tank.y,
      );

      if (distanceSquared < minDistance * minDistance) {
        return true;
      }
    }

    return false;
  }

  private getTankRadius(): number {
    const livingTank = this.tanks.find((tankSlot) => tankSlot.tank !== undefined)?.tank;
    if (livingTank !== undefined) {
      return livingTank.radius;
    }

    return 18;
  }

  private updateHud(): void {
    const aliveTankCount = this.tanks.filter((tankSlot) => tankSlot.tank !== undefined).length;
    const respawning = this.tanks.some((tankSlot) => tankSlot.id === this.playerTankId && tankSlot.tank === undefined);

    this.hudText.setText([
      'WASD: move / rotate',
      'Mouse: aim turret / hold left click: charge shot / release: fire',
      'Right click: detonate oldest player bullet',
      'Space: speed boost (limited duration + cooldown)',
      '',
      `Enemy AI: ${ENEMY_AI_DIFFICULTY}`,
      `Enemy count: ${ENEMY_COUNT}`,
      `Active tanks: ${aliveTankCount}`,
      `Active bullets: ${this.bullets.length}`,
      `Active mines: ${this.mines.length}`,
      'Bullets destroy tanks (friendly fire on).',
      'Middle click: place mine.',
      'Charged shots: faster, bigger blast, no bounce (long cooldown).',
      'Overcharge: hold too long and your tank explodes.',
      'Normal bullets disappear after 3 bounces.',
      respawning ? 'Respawn in progress...' : 'Tank ready.',
    ]);
  }

  private renderShotPreviews(): void {
    this.shotPreviewGraphics.clear();

    for (const tankSlot of this.tanks) {
      const tank = tankSlot.tank;
      if (tank === undefined) {
        continue;
      }

      const origin = tank.getMuzzlePosition();
      const trajectory = predictBulletTrajectory(
        origin,
        tank.turretAngle,
        this.arenaMap.walls,
        BULLET_RADIUS,
        tank.isChargingShot ? 0 : SHOT_PREVIEW_REFLECTIONS,
        SHOT_PREVIEW_MAX_DISTANCE,
      );

      for (const segment of trajectory.segments) {
        this.drawDashedLine(segment.start, segment.end, tankSlot.appearance.bulletColor, 10, 8, 0.8);
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

  private createTextures(): void {

    // Create simple tank body and turret textures using Phaser's graphics API
    this.createTankBodyTexture('tank-body-player', 0x22c55e, 0x14532d);
    this.createTankTurretTexture('tank-turret-player', 0x4ade80);
    
    // Create enemy tank textures with different colors for visual distinction
    this.createTankBodyTexture('tank-body-enemy', 0xdc2626, 0x7f1d1d);
    this.createTankTurretTexture('tank-turret-enemy', 0xfca5a5);
  }

  private createTankBodyTexture(textureKey: string, outerColor: number, innerColor: number): void {
    // The tank body is represented as a rounded rectangle with an inner detail, created using Phaser's graphics API
    const bodyGraphics = this.add.graphics();
    bodyGraphics.fillStyle(outerColor, 1); // Outer color for the tank body 
    bodyGraphics.fillRoundedRect(0, 0, 40, 28, 8);  // Main body shape (rounded rectangle)
    bodyGraphics.fillStyle(innerColor, 1); // Inner color for the tank body
    bodyGraphics.fillRoundedRect(8, 5, 24, 18, 6); // Inner detail (smaller rounded rectangle)
    bodyGraphics.generateTexture(textureKey, 40, 28);  // Generate a texture from the graphics and assign it a key for later use (textures are saved in Phaser's texture manager and can be used by game objects)
    bodyGraphics.destroy(); // Destroy the graphics object after generating the texture to free up memory, as it's no longer needed
  }

  private createTankTurretTexture(textureKey: string, color: number): void {
    // The tank turret is represented as a rounded rectangle with a circular detail, created using Phaser's graphics API
    const turretGraphics = this.add.graphics();
    turretGraphics.fillStyle(color, 1); // Fill color for the turret
    turretGraphics.fillRoundedRect(0, 8, 28, 8, 4); // Main turret shape (rounded rectangle)
    turretGraphics.fillCircle(10, 12, 9); // Circular detail at the base of the turret for visual interest
    turretGraphics.generateTexture(textureKey, 28, 24); // Generate a texture from the graphics and assign it a key for later use (textures are saved in Phaser's texture manager and can be used by game objects)
    turretGraphics.destroy(); // Destroy the graphics object after generating the texture to free up memory, as it's no longer needed
  }

  private handleShutdown(): void {

    // Clean up all game objects and resources when the scene is shut down
    // to prevent memory leaks and ensure a clean state if the scene is restarted

    // Destroy all bullets, mines, and tanks to free up resources
    // and ensure they are properly removed from the scene
    for (const bullet of this.bullets) {
      bullet.destroy();
    }
    for (const mine of this.mines) {
      mine.destroy();
    }
    for (const tankSlot of this.tanks) {
      tankSlot.tank?.destroy();
    }
    
    // Destroy the HUD text and shot preview graphics to free up resources
    this.hudText.destroy();
    this.shotPreviewGraphics.destroy();

    this.bullets = [];
    this.mines = [];
    this.tanks = [];
  }
}
