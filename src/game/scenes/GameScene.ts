// src/game/scenes/GameScene.ts
// This file defines the GameScene class, which is the main scene for the game.
// The GameScene is responsible for managing the game state, including tanks, bullets, mines, and the arena map.
// It handles the game loop, processing player input, updating game objects,
// checking for collisions, and rendering the game state to the screen.

import Phaser from 'phaser';
import { ArenaMap } from '../maps/ArenaMap';
import { Bullet } from '../entities/Bullet';
import { Mine } from '../entities/Mine';
import { Tank, type TankAppearance } from '../entities/Tank';
import { InputController, type TankInput } from '../systems/InputController';
import {
  BULLET_EXPLOSION_RADIUS,
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
import { ENEMY_AI_DIFFICULTY, ENEMY_COUNT, SELECTED_MAP } from '../config';
import { EnemyAiController } from '../systems/EnemyAiController';
import { SfxController } from '../systems/SfxController';
import { predictBulletTrajectory } from '../utils/shotPrediction';

//TODO remove magic numbers and magic strings
//TODO increase code modularity by splitting GameScene into multiple classes/files
// - Move HUD-related code to a separate class/file
// - ...

//GAME MECHANICS TODOs:
//TODO if left click is pressed for a certain amount of time without releasing, charge up a more powerful shot which moves faster and bigger explosion radius but without rebounce - add visual feedback for the charging state and the increased power level, and with a cooldown after firing to prevent spamming the charged shot 
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

// GameScene is the main scene for the game, responsible for
// managing the game state, including tanks, bullets, mines, and the arena map.
// It handles the game loop, processing player input, updating game objects,
// checking for collisions, and rendering the game state to the screen.
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
    detonatePressed: false,
    placeMinePressed: false,
    boostPressed: false,
    pointerWorldX: 0,
    pointerWorldY: 0,
  };

  public constructor() {
    super('game');
  }
  
  // -------- Phaser scene lifecycle methods: preload, create, update --------

  // Preload is called before the scene is created, used to load assets
  public preload(): void {
    this.createTextures();
  }
  // Create is called once after preload, used to set up the game objects and initial state
  public create(): void {

    // Render the arena map, which draws the background, grid, and walls onto the scene
    this.arenaMap = new ArenaMap(this, SELECTED_MAP);  // Initialize the arena map using the selected map's own world size definition
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

    this.configureCamera(playerSlot.tank);
    
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
    this.hudText.setScrollFactor(0);  // Keep HUD fixed on the viewport while camera moves through the map
    
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
    
    // ------------ Main update loop for the game scene ------------
    
    // Update the state of all tanks based on player input and AI controllers
    this.updateTanks(deltaSeconds, playerInput);

    // Render the predicted trajectory of bullets for aiming
    this.renderShotPreviews();

    // Handle any mines that are pending placement
    this.processPendingMinePlacements();
    // Handle any mines that are pending detonation
    this.processPendingDetonations();

    // Update the state of all bullets
    this.updateBullets(deltaSeconds);
    // Update the state of all mines
    this.updateMines(deltaSeconds);
    
    // Check for and resolve collisions between bullets
    this.resolveBulletBulletCollisions(); 
    // Check for and resolve bullet impacts on tanks and other objects
    this.resolveBulletImpacts();
    // Check for and resolve mine triggers on tanks
    this.resolveMineTankTriggers(); 

    // Handle tank respawns
    this.processRespawns();

    // Remove any bullets that are no longer active
    this.cleanupBullets();
    // Remove any mines that are no longer active
    this.cleanupMines();
    
    // Update the heads-up display with the latest game information
    this.updateHud();
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
      if (input.detonatePressed && !this.pendingDetonationTankIds.includes(slot.id)) {
        this.pendingDetonationTankIds.push(slot.id);
      }
      if (input.placeMinePressed && !this.pendingMinePlacementTankIds.includes(slot.id)) {
        this.pendingMinePlacementTankIds.push(slot.id);
      }

      // Determine if the tank can fire a new bullet based on the number of active bullets it currently has,
      const canFire = this.getActiveBulletCountForTank(slot.id) < MAX_ACTIVE_BULLETS_PER_TANK;

      // Update the tank's state based on the input and the arena walls
      // this method returns a new bullet instance if the tank has fired
      // during this update cycle, which will be added to the bullets array
      // and processed in subsequent update steps.
      const bullet = slot.tank.update(deltaSeconds, input, this.arenaMap.walls, canFire);

      // If the tank has fired a bullet (i.e., the update method returns a new bullet instance),
      // add the bullet to the bullets array and play the bullet shot sound effect.
      if (bullet !== undefined) {
        this.bullets.push(bullet);
        this.sfx.playBulletShot();
      }
    }
  }

  private getActiveBulletCountForTank(tankId: string): number {

    // Count the number of active bullets in the game that belong to a specific tank ID,
    // which is used to determine if a tank can fire a new bullet based on the maximum allowed active bullets per tank.

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
    // Count the number of active mines in the game that belong to a specific tank ID,
    // which is used to determine if a tank can place a new mine based on the maximum allowed active mines per tank.
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
    // Update the state of all bullets in the game by calling their update method,
    // which will move the bullets according to their velocity, check for collisions with walls,
    // and handle their lifetime and destruction when they expire or collide.
    for (const bullet of this.bullets) {
      bullet.update(deltaSeconds, this.arenaMap.walls);
    }
  }

  private updateMines(deltaSeconds: number): void {
    // Update the state of all mines in the game by calling their update method,
    // which will check for triggers based on nearby tanks, handle the explosion timing,
    // and determine when the mine should explode and be removed from the game.

    for (const mine of this.mines) {
      if (!mine.isAlive) {
        continue;
      }
      // Determine if the mine's lifetime has expired and it should explode
      const shouldExplode = mine.update(deltaSeconds);
      // If the mine should explode, trigger the explosion and handle the effects on nearby tanks and bullets
      if (shouldExplode) {
        this.triggerMineExplosion(mine);
      }
    }
  }

  private resolveBulletImpacts(): void {

    // Check for and resolve impacts of bullets on tanks and mines
    // by iterating through all active bullets, and for each bullet,
    // checking if it is colliding with any mines or tanks,
    // and if so, applying the appropriate effects such as destroying the bullet,
    // triggering mine explosions,
    // and destroying tanks that are hit by bullets.
    
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
    // Check for and resolve collisions between bullets
    // by iterating through all pairs of active bullets,
    // and if a collision is detected, trigger the explosion effects for both bullets.

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
    // Check for and resolve triggers of mines on tanks
    // by iterating through all active mines, and for each mine,
    // checking if it is being triggered by any tanks that are within its trigger radius,
    // and if so, triggering the mine explosion and applying the appropriate effects
    // to the affected tanks.

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
    // Handle the respawning of tanks that are scheduled to respawn
    // by checking the current time against their scheduled respawn time, and if it's time to respawn,
    // create a new tank instance for them at an available spawn point,
    // or delay the respawn if no spawn point is currently available.
    const now = this.time.now;

    for (const tankSlot of this.tanks) {
      
      // If the tank slot is currently occupied by an active tank,
      // or if it doesn't have a scheduled respawn time,
      // or if the current time is still before the scheduled respawn time,
      // skip to the next tank slot.
      if (tankSlot.tank !== undefined || tankSlot.respawnAtMs === undefined || now < tankSlot.respawnAtMs) {
        continue;
      }
      
      // Pick an available spawn point for the tank to respawn at, 
      // ensuring that it doesn't spawn on top of another tank or too close to walls.
      const spawnPoint = this.pickAvailableCornerSpawn(tankSlot.id);
      if (spawnPoint === undefined) {
        tankSlot.respawnAtMs = now + 250; // If no spawn point is currently available, delay the respawn and try again in the next update cycle.
        continue;
      }
      
      // Create a new tank instance for the respawning tank slot at the chosen spawn point
      tankSlot.tank = new Tank(this, tankSlot.id, spawnPoint.x, spawnPoint.y, tankSlot.appearance);
      tankSlot.respawnAtMs = undefined;

      if (tankSlot.id === this.playerTankId) {
        this.configureCamera(tankSlot.tank);
      }
    }
  }

  private configureCamera(playerTank: Tank | undefined): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.arenaMap.width, this.arenaMap.height);

    if (playerTank === undefined) {
      return;
    }

    camera.startFollow(playerTank.container, true, 0.12, 0.12);
    camera.roundPixels = true;
  }

  private cleanupBullets(): void {
    // Remove any bullets that are no longer alive from the bullets array of the game scene,
    // which will effectively remove them from the game and stop rendering them.
    this.bullets = this.bullets.filter((bullet) => bullet.isAlive);
  }

  private cleanupMines(): void {
    // Remove any mines that are no longer alive from the mines array of the game scene,
    // which will effectively remove them from the game and stop rendering them.
    this.mines = this.mines.filter((mine) => mine.isAlive);
  }

  private processPendingMinePlacements(): void {
    // Handle any mines that are pending placement by iterating through the list of tank IDs
    // that have requested to place a mine, and attempting to place a mine for each of those tanks
    // if they are allowed to do so

    for (const tankId of this.pendingMinePlacementTankIds) {
      this.tryPlaceMineForTank(tankId);
    }

    this.pendingMinePlacementTankIds = [];
  }

  private tryPlaceMineForTank(tankId: string): void {
    // Attempt to place a mine for a given tank ID,
    // checking if the tank is allowed to place a mine based on the number of active mines it currently has,
    // and if so, create a new mine instance at the tank's current position and add it to the mines array.
    
    // Assess whether the tank can place a new mine based on the number of active mines it currently has
    if (this.getActiveMineCountForTank(tankId) >= MAX_ACTIVE_MINES_PER_TANK) {
      return;
    }
    
    const tankSlot = this.tanks.find((slot) => slot.id === tankId);
    if (tankSlot?.tank === undefined) {
      return;
    }
    
    // Determine the color of the mine based on whether the tank placing it is controlled by the player or AI
    const mineColor = tankSlot.controlledByPlayer ? 0x22c55e : 0xdc2626;
    // Create a new mine instance at the tank's current position and add it to the mines array
    // When Mine constructor is called, it will create the visual representation of the mine in the game scene
    this.mines.push(new Mine(this, tankId, tankSlot.tank.x, tankSlot.tank.y, mineColor));
    // Play the mine placement sound effect
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
    this.applyAreaExplosion(centerX, centerY, BULLET_EXPLOSION_RADIUS, 0xf59e0b, BULLET_EXPLOSION_VISUAL_DURATION_MS);
  }

  private triggerMineExplosion(mine: Mine): void {
    // Trigger the explosion of a mine, applying area damage and effects to nearby tanks and bullets,
    // and playing the explosion sound effect.

    if (!mine.isAlive) {
      return;
    }
    
    // Mine position is used as the center of the explosion
    const centerX = mine.x;
    const centerY = mine.y;
    
    // Destroy the mine, which will mark it as no longer active and remove its visual representation from the game.
    mine.destroy();
    // Play the mine explosion sound effect to provide audio feedback for the explosion event.
    this.sfx.playMineExplosion();
    // Apply the area explosion effects, which will damage nearby tanks,
    // trigger other mines, and play the visual explosion effect.
    this.applyAreaExplosion(centerX, centerY, MINE_EXPLOSION_RADIUS, 0xfb7185, MINE_EXPLOSION_VISUAL_DURATION_MS);
  }

  private applyAreaExplosion(
    centerX: number,
    centerY: number,
    radius: number,
    color: number,
    durationMs: number,
  ): void {
    // Apply the effects of an explosion in a given area,
    // which includes damaging tanks within the explosion radius,
    // triggering other mines within the explosion radius,
    // and playing the visual explosion effect.
    this.applyExplosionDamage(centerX, centerY, radius);
    this.triggerMinesInExplosion(centerX, centerY, radius);
    this.playExplosionEffect(centerX, centerY, radius, color, durationMs);
  }

  private applyExplosionDamage(centerX: number, centerY: number, radius: number): void {
    // Apply damage to tanks within the explosion radius,
    // taking into account line of sight and walls blocking the explosion.
    for (const tankSlot of this.tanks) {
      const tank = tankSlot.tank;
      if (tank === undefined) {
        continue;
      }
      
      // Effective explosion radius is increased by the tank's radius
      const damageDistance = radius + tank.radius;
      // Calculate the squared distance from the explosion center to the tank's position
      const distanceSquared = Phaser.Math.Distance.Squared(centerX, centerY, tank.x, tank.y);
      // Check if the explosion is blocked by a wall between the explosion center and the tank's position
      const blockedByWall = this.isExplosionBlockedByWall(centerX, centerY, tank.x, tank.y);
      // If the tank is within the damage distance and there is a clear line of sight
      // (not blocked by walls) to the explosion center, destroy the tank.
      if (distanceSquared <= damageDistance * damageDistance && !blockedByWall) {
        this.destroyTank(tankSlot);
      }
    }
  }

  private triggerMinesInExplosion(centerX: number, centerY: number, radius: number): void {
    // Trigger other mines that are within the explosion radius,
    // taking into account line of sight and walls blocking the explosion.
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
    // Check if there is a wall blocking the line of sight between the explosion center and a target position,
    // which would prevent the explosion from affecting the target.
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
    // Check if a line segment defined by its start and end points intersects with a rectangle,
    // which is used to determine if a wall is blocking the line of sight for an explosion.
    // If the segment intersects the rectangle, it means there is a wall blocking the explosion's effect on the target.
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
    // Clip a line segment against a single axis-aligned boundary defined by min and max,
    // which is used in the segment-rectangle intersection test
    // to determine if a line segment intersects with a rectangle.
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
    // Play the visual effects for an explosion, which includes a shockwave and a flash,
    // to provide visual feedback for the explosion event and enhance the game's visual appeal.
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
    // Check if a bullet is hitting a tank by calculating
    // the distance between the bullet and the tank,
    // and comparing it to the sum of their radii.
    const hitDistance = bullet.radius + tank.radius;
    const distanceSquared = Phaser.Math.Distance.Squared(bullet.x, bullet.y, tank.x, tank.y);
    return distanceSquared <= hitDistance * hitDistance;
  }

  private areBulletsColliding(first: Bullet, second: Bullet): boolean {
    // Check if two bullets are colliding by calculating
    // the distance between the two bullets,
    // and comparing it to the sum of their radii.
    const hitDistance = first.radius + second.radius;
    const distanceSquared = Phaser.Math.Distance.Squared(first.x, first.y, second.x, second.y);
    return distanceSquared <= hitDistance * hitDistance;
  }

  private isMineHittingTank(mine: Mine, tank: Tank): boolean {
    // Check if a mine is hitting a tank by calculating
    // the distance between the mine and the tank,
    // and comparing it to the sum of their radii.
    const hitDistance = mine.radius + tank.radius;
    const distanceSquared = Phaser.Math.Distance.Squared(mine.x, mine.y, tank.x, tank.y);
    return distanceSquared <= hitDistance * hitDistance;
  }

  private isBulletHittingMine(bullet: Bullet, mine: Mine): boolean {
    // Check if a bullet is hitting a mine by calculating
    // the distance between the bullet and the mine,
    // and comparing it to the sum of their radii.
    const hitDistance = bullet.radius + mine.radius;
    const distanceSquared = Phaser.Math.Distance.Squared(bullet.x, bullet.y, mine.x, mine.y);
    return distanceSquared <= hitDistance * hitDistance;
  }

  private destroyTank(tankSlot: TankSlot): void {
    // Handle the destruction of a tank, which includes playing the destruction effect,
    // destroying the tank instance, and setting up the respawn timer for the tank slot.
    if (tankSlot.tank === undefined) {
      return;
    }

    const destroyedTankX = tankSlot.tank.x;
    const destroyedTankY = tankSlot.tank.y;

    // Play the tank destruction effect at the location of the destroyed tank
    this.playTankDestructionEffect(destroyedTankX, destroyedTankY, tankSlot.appearance.bulletColor);
    
    // Destroy the tank instance, which will mark it as no longer active
    // and remove its visual representation from the game.
    tankSlot.tank.destroy();
    tankSlot.tank = undefined;
    tankSlot.respawnAtMs = this.time.now + TANK_RESPAWN_DELAY_MS;
  }

  private playTankDestructionEffect(x: number, y: number, color: number): void {

    // Play the visual and audio effects for a tank destruction event,
    // which includes a flash, shockwave, debris particles,
    // and a scorch mark on the ground,
    // as well as shaking the camera to enhance the impact of the explosion.

    // Play the tank destroyed sound effect to provide audio feedback for the destruction event.
    this.sfx.playTankDestroyed();
    
    // Flash effect parameters
    // Flash is a bright circle that quickly expands and fades out at the location of the destroyed tank,
    // to create a burst of light effect for the explosion.
    const flashRadius = 14;
    const flashAlpha = 0.95;
    const flashDepth = 7;
    const flashScale = 2.8;
    const flashDurationMs = 220;
    
    // Shockwave effect parameters
    // Shockwave is a circular outline that expands and fades out, simulating the shockwave of the explosion.
    const shockwaveRadius = 18;
    const shockwaveDepth = 6.8;
    const shockwaveStrokeWidth = 4;
    const shockwaveStrokeAlpha = 0.7;
    const shockwaveScale = 2.6;
    const shockwaveDurationMs = 300;
    
    // Debris particle parameters
    // Debris particles are small rectangles that are emitted from the explosion center,
    // flying outwards in random directions with random speeds and rotations,
    // to create a dynamic and chaotic explosion effect.
    const debrisCount = 200;
    const debrisDistanceMin = 36;
    const debrisDistanceMax = 112;
    const debrisSizeMin = 3;
    const debrisSizeMax = 7;
    const debrisHeightScale = 1.8;
    const debrisDepth = 6.9;
    const debrisRotationMin = -270;
    const debrisRotationMax = 270;
    const debrisScale = 0.3;
    const debrisDurationMinMs = 240;
    const debrisDurationMaxMs = 430;
    
    // Scorch mark parameters
    // Scorch mark is an ellipse that appears on the ground at the location of the explosion,
    // simulating a burn mark left by the explosion, and it slowly fades out over time.
    const scorchOffsetY = 10;
    const scorchWidth = 30;
    const scorchHeight = 16;
    const scorchColor = 0x020617;
    const scorchAlpha = 0.5;
    const scorchDepth = 1.5;
    const scorchScaleX = 1.5;
    const scorchScaleY = 1.15;
    const scorchDurationMs = 650;
    
    // Camera shake parameters
    // The camera shake adds a brief shaking effect to the entire view when a tank is destroyed,
    // enhancing the impact and intensity of the explosion.
    const cameraShakeDurationMs = 90;
    const cameraShakeIntensity = 0.0050;

    const flash = this.add.circle(x, y, flashRadius, color, flashAlpha);
    flash.setDepth(flashDepth);
    flash.setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: flash,
      scaleX: flashScale,
      scaleY: flashScale,
      alpha: 0,
      duration: flashDurationMs,
      ease: 'Cubic.Out',
      onComplete: () => flash.destroy(),
    });

    const shockwave = this.add.circle(x, y, shockwaveRadius, color, 0);
    shockwave.setDepth(shockwaveDepth);
    shockwave.setStrokeStyle(shockwaveStrokeWidth, color, shockwaveStrokeAlpha);

    this.tweens.add({
      targets: shockwave,
      scaleX: shockwaveScale,
      scaleY: shockwaveScale,
      alpha: 0,
      duration: shockwaveDurationMs,
      ease: 'Quad.Out',
      onComplete: () => shockwave.destroy(),
    });

    for (let i = 0; i < debrisCount; i += 1) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(debrisDistanceMin, debrisDistanceMax);
      const size = Phaser.Math.Between(debrisSizeMin, debrisSizeMax);
      const shard = this.add.rectangle(x, y, size, size * debrisHeightScale, color, flashAlpha);
      shard.setDepth(debrisDepth);
      shard.setRotation(angle);

      this.tweens.add({
        targets: shard,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        angle: Phaser.Math.Between(debrisRotationMin, debrisRotationMax),
        alpha: 0,
        scaleX: debrisScale,
        scaleY: debrisScale,
        duration: Phaser.Math.Between(debrisDurationMinMs, debrisDurationMaxMs),
        ease: 'Cubic.Out',
        onComplete: () => shard.destroy(),
      });
    }

    const scorch = this.add.ellipse(x, y + scorchOffsetY, scorchWidth, scorchHeight, scorchColor, scorchAlpha);
    scorch.setDepth(scorchDepth);
    this.tweens.add({
      targets: scorch,
      alpha: 0,
      scaleX: scorchScaleX,
      scaleY: scorchScaleY,
      duration: scorchDurationMs,
      ease: 'Quad.Out',
      onComplete: () => scorch.destroy(),
    });

    this.cameras.main.shake(cameraShakeDurationMs, cameraShakeIntensity, true);
  }

  private pickAvailableCornerSpawn(excludedTankId: string): Phaser.Math.Vector2 | undefined {
    // Pick an available spawn point for a tank to respawn at, prioritizing the corners of the arena,
    // and ensuring that the chosen spawn point is not blocked by walls or too close to existing tanks.
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
    const width = this.arenaMap.width;
    const height = this.arenaMap.height;
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
    // Check if a spawn point is blocked by walls or too close to existing tanks,
    // which would make it an invalid spawn location for a tank.
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
    // Get the radius of the tanks in the game,
    // which is used for various calculations
    // such as collision detection and spawn point placement.
    const livingTank = this.tanks.find((tankSlot) => tankSlot.tank !== undefined)?.tank;
    if (livingTank !== undefined) {
      return livingTank.radius;
    }

    return 18;
  }

  private updateHud(): void {
    // Update the heads-up display (HUD) text with the latest game information,
    // such as player health, score, enemy count, active bullets, etc.

    const aliveTankCount = this.tanks.filter((tankSlot) => tankSlot.tank !== undefined).length;
    const respawning = this.tanks.some((tankSlot) => tankSlot.id === this.playerTankId && tankSlot.tank === undefined);

    this.hudText.setText([
      'WASD: move / rotate',
      'Mouse: aim turret / left click: shoot',
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
      'Bullets disappear after 3 bounces.',
      respawning ? 'Respawn in progress...' : 'Tank ready.',
    ]);
  }

  private renderShotPreviews(): void {
    // Render the predicted trajectory of bullets for aiming

    this.shotPreviewGraphics.clear(); // Clear previous shot previews before rendering new ones, to ensure that only the current predicted trajectories are displayed on the screen.

    for (const tankSlot of this.tanks) {
      const tank = tankSlot.tank;
      if (tank === undefined) {
        continue;
      }

      const origin = tank.getMuzzlePosition();  // Get the position of the tank's turret muzzle, which is the starting point for the bullet trajectory prediction.
      const trajectory = predictBulletTrajectory(
        origin,
        tank.turretAngle,
        this.arenaMap.walls,
        BULLET_RADIUS,
        SHOT_PREVIEW_REFLECTIONS,
        SHOT_PREVIEW_MAX_DISTANCE,
      );  // Use the predictBulletTrajectory function to calculate the predicted path of the bullet based on the tank's turret angle, the arena walls, and other parameters such as bullet radius and maximum distance for the preview.

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
    
    // Draw a dashed line between the start and end points
    // with the specified color, dash length, gap length, and alpha transparency.
    // This is used to render the predicted bullet trajectories as dashed lines on the screen.

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
