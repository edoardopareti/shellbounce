import {
  BULLET_EXPLOSION_VISUAL_DURATION_MS,
  FIXED_TIMESTEP_SECONDS,
  MINE_ARMING_DELAY_MS,
  MINE_EXPLOSION_RADIUS,
  MINE_EXPLOSION_VISUAL_DURATION_MS,
  MUZZLE_OFFSET,
  SHOT_PREVIEW_BULLET_RADIUS,
  SHOT_PREVIEW_MAX_DISTANCE,
  SHOT_PREVIEW_REFLECTIONS,
  TANK_BOOST_MULTIPLIER,
  TANK_MOVE_SPEED,
  TANK_REVERSE_SPEED,
  TANK_ROTATION_SPEED,
} from '../shared/constants.js';
import { ENEMY_AI_DIFFICULTY, ENEMY_COUNT, SELECTED_MAP } from '../shared/config.js';
import { getArenaWorld } from '../shared/map.js';
import { circleIntersectsRect, normalizeAngleRadians } from '../shared/math.js';
import {
  ALL_TANK_TYPES,
  EMPTY_INPUT,
  type ShotPreviewState,
  type TankInput,
  type TankType,
  type WorldSnapshot,
} from '../shared/types.js';
import { BOT_DIFFICULTY_PROFILES, type BotDifficultyProfile, parseBotDifficulty } from './entities/bot.js';
import { BotController } from './entities/botController.js';
import { updateBoostState } from './entities/boost.js';
import type { BulletEntity } from './entities/bullet.js';
import { sanitizeInput } from './entities/input.js';
import type { MineEntity } from './entities/mine.js';
import {
  createPlayerEntity,
  resolveTankTypeForNewPlayer, 
  schedulePlayerRespawn,
  type PlayerEntity,
} from './entities/player.js';
import { registerFrag } from './entities/scoreboard.js';
import {
  deflectBulletByShieldSurfaceNormal as deflectBulletByShield,
  isBulletHittingShield as bulletHitsShield,
  updateShieldState as updateShieldEntityState,
} from './entities/shield.js';
import { buildShotPreview } from './entities/shotPreview.js';
import { splitMitosisBulletEntity } from './entities/mitosisBullet.js';
import { MitosisGun } from './entities/mitosisGun.js';
import { GrappleGun } from './entities/grappleGun.js';
import { MachineGun } from './entities/machineGun.js';
import { LaserWhipGun } from './entities/laserWhipGun.js';
import { SimpleGun } from './entities/simpleGun.js';
import { EffectBuffer } from './systems/effects.js';
import { ExplosionService } from './systems/explosionService.js';
import { MineSystem } from './systems/mineSystem.js';
import { PlayerLifecycleSystem } from './systems/playerLifecycleSystem.js';
import { ProjectileSystem } from './systems/projectileSystem.js';
import type { SimulationContext } from './systems/simulationContext.js';
import type { Weapon } from './entities/weapon.js';
import { WeaponRegistry } from './entities/weaponRegistry.js';

// AuthoritativeSimulation manages the state and logic of the game,
// including players, bullets, mines, and bots.
// It provides methods to add/remove players, process player inputs,
// advance the simulation state, and create snapshots of the world state for clients.
export class AuthoritativeSimulation {
  private readonly world = getArenaWorld(SELECTED_MAP); // Game arena
  private readonly players = new Map<string, PlayerEntity>(); // Player ID : PlayerEntity
  private readonly latestInputs = new Map<string, TankInput>(); // Player ID : Latest input
  private readonly bullets: BulletEntity[] = []; // Active bullets in the simulation
  private readonly mines: MineEntity[] = []; // Active mines in the simulation
  private readonly botController = new BotController(); // Bot controller to manage AI player behavior
  private readonly weaponRegistry = new WeaponRegistry(); // Registry for creating weapons based on tank types
  private readonly playerWeapons = new Map<string, Weapon>(); // Player ID : Weapon instance
  private readonly effectBuffer = new EffectBuffer();  // Buffer for visual effects to be sent to clients
  private readonly explosionService = new ExplosionService();  // Service to handle explosion logic and its effects on players, bullets, and mines
  private readonly mineSystem = new MineSystem();  // System to handle mine placement, arming, and explosion logic
  private readonly playerLifecycleSystem = new PlayerLifecycleSystem(this.world);  // System to manage player respawns and lifecycle events based on the world state
  private readonly projectileSystem = new ProjectileSystem(); // System to manage bullet movement, collisions, and interactions with players and mines
  private tick = 0; // Simulation tick counter
  private nowMs = 0; // Current simulation time in milliseconds
  private bulletCounter = 0; // Counter for bullet IDs
  private mineCounter = 0; // Counter for mine IDs
  private playerJoinCounter = 0; // Counter for player joins

  public constructor() {
    // Register default weapons for each tank type in the weapon registry.
    this.weaponRegistry.registerDefault((runtime) => new SimpleGun(runtime));
    for (const tankType of ALL_TANK_TYPES) {
      // For each tank type, register a factory function
      // that creates a new SimpleGun instance when requested.
      this.weaponRegistry.register(tankType, (runtime) => new SimpleGun(runtime));
    }

    this.weaponRegistry.register('PolPot', (runtime) => new MitosisGun(runtime));
    this.weaponRegistry.register('Fantanyl', (runtime) => new GrappleGun(runtime));
    this.weaponRegistry.register('SSugar', (runtime) => new LaserWhipGun(runtime));
    this.weaponRegistry.register('Hightillery', (runtime) => new MachineGun(runtime));
  }

  public step(): void {

    // Advance the simulation by one tick.

    this.tick += 1;
    this.nowMs += FIXED_TIMESTEP_SECONDS * 1000;
    
    // Update the state of the simulation

    // Process player respawns based on their respawn timers
    // and the current world state.
    this.processRespawns();

    // Update player states based on their inputs, movement, firing actions,
    // and interactions with the world.
    this.updatePlayers();

    // Update the state of bullets and mines, 
    // including their movement, arming, and explosion logic.
    this.updateBullets();
    this.updateMines();

    // Resolve interactions between bullets, including
    // collisions with other bullets,
    // impacts with players and mines,
    // and any resulting explosions or player deaths.
    this.resolveBulletBulletCollisions();
    this.resolveBulletImpacts();
    this.resolveMineTriggers();
  }

  public addPlayer(playerId: string, isBot: boolean, preferredTankType?: TankType): void {

    // Add a new player to the simulation with the specified playerId and bot status.

    if (this.players.has(playerId)) {
      return;
    }
    
    // Determine the tank type for the new player based on whether it's a bot or human player.
    const tankType = resolveTankTypeForNewPlayer(isBot, this.playerJoinCounter, preferredTankType);

    // Pick an available spawn point for the new player.
    // If no spawn points are available, default to a corner spawn point.
    const spawn =
      this.playerLifecycleSystem.pickAvailableSpawnPoint(this.players, this.world.walls, playerId, this.tick) ??
      this.playerLifecycleSystem.getDefaultSpawnPoint();
    const player = createPlayerEntity(playerId, isBot, spawn, tankType);
    
    // Increment the player join counter to ensure unique player IDs for bots
    this.playerJoinCounter += 1;
    
    // Add the new player to the simulation's player map and initialize their input state.
    this.players.set(playerId, player);

    // Create a weapon instance for the new player based on their tank type
    // and register it in the playerWeapons map.
    this.playerWeapons.set(
      playerId,
      this.weaponRegistry.createForTankType(tankType, {
        nextBulletId: () => `b-${this.bulletCounter++}`,
        detonateOldestBulletForPlayer: (id) => this.tryDetonateOldestBulletForPlayer(id),
        detonateAllBulletsForPlayer: (id) => this.tryDetonateAllBulletsForPlayer(id),
        splitOldestMitosisBulletForPlayer: (id) => this.trySplitOldestMitosisBulletForPlayer(id),
        detonateSplitMitosisBulletsForPlayer: (id) => this.tryDetonateSplitMitosisBulletsForPlayer(id),
        pullPlayerToOwnedLaserTip: (id, stepDistance) => this.tryPullPlayerToOwnedLaserTip(id, stepDistance),
      }),
    );
    
    // Initialize the latest input for the player to an empty input state.
    this.latestInputs.set(playerId, EMPTY_INPUT);

    if (isBot) {
      this.botController.onBotAdded(playerId);
    }
  }

  public removePlayer(playerId: string): void {

    // Remove a player from the simulation based on their playerId.

    this.players.delete(playerId);
    this.playerWeapons.delete(playerId);
    this.latestInputs.delete(playerId);
    this.botController.onBotRemoved(playerId);

    for (let index = this.bullets.length - 1; index >= 0; index -= 1) {
      if (this.bullets[index].ownerPlayerId === playerId) {
        this.bullets.splice(index, 1);
      }
    }

    for (let index = this.mines.length - 1; index >= 0; index -= 1) {
      if (this.mines[index].ownerPlayerId === playerId) {
        this.mines.splice(index, 1);
      }
    }
  }

  public setPlayerInput(playerId: string, input: TankInput): void {
    
    // Set the input for a specific player, ensuring that edge-triggered actions are preserved.
    
    if (!this.players.has(playerId)) {
      return;
    }

    const sanitized = sanitizeInput(input);
    const previous = this.latestInputs.get(playerId) ?? EMPTY_INPUT;

    // Preserve edge-triggered actions until consumed during the next simulation tick.
    // Override values for actions like
    // firePressed, fireReleased, detonatePressed, placeMinePressed, and boostPressed
    // to ensure they remain true until the simulation processes them,
    // even if the client input changes quickly.
    this.latestInputs.set(playerId, {
      ...sanitized,
      firePressed: previous.firePressed || sanitized.firePressed,
      fireReleased: previous.fireReleased || sanitized.fireReleased,
      detonatePressed: previous.detonatePressed || sanitized.detonatePressed,
      placeMinePressed: previous.placeMinePressed || sanitized.placeMinePressed,
      boostPressed: previous.boostPressed || sanitized.boostPressed,
    });
  }

  private updatePlayers(): void {
    
    // Update the state of each player based on their latest inputs, interactions with the world,
    // and the behavior of bots for AI-controlled players.
    
    // Gather a list of human players to provide context for bot decision-making.
    const humans = Array.from(this.players.values()).filter((player) => !player.isBot && player.isAlive);

    // Create a simulation context object that provides necessary information and functions
    // for bots to make informed decisions based on the current state of the world,
    // active bullets, and player states.
    const context: SimulationContext = {
      world: this.world,
      bullets: this.bullets,
      nowMs: this.nowMs,
      getActiveBulletCountForPlayer: (id) => this.getActiveBulletCountForPlayer(id),
      getMaxActiveBulletsForPlayer: (id) => this.playerWeapons.get(id)?.getMaxActiveBullets() ?? 0,
      intersectsAnyWall: (x, y, radius) => this.intersectsAnyWall(x, y, radius),
      isExplosionBlockedByWall: (startX, startY, endX, endY) => this.isExplosionBlockedByWall(startX, startY, endX, endY),
    };
    
    // Iterate through each player in the simulation
    // and update their state based on their input and interactions.
    for (const player of this.players.values()) {
      if (!player.isAlive) {
        continue;
      }
      
      // Determine the input for the player.
      // If it's a bot, compute the input using the bot controller.
      // If it's a human player, use the latest input received from the client.
      // If no input is available, default to an empty input state.
      const input = player.isBot
        ? this.botController.computeInput(player, humans, this.getBotDifficultyProfile(), context)
        : (this.latestInputs.get(player.id) ?? EMPTY_INPUT);

      // Apply the player's input to update their state,
      // including movement, firing actions, and interactions with the world.
      this.applyPlayerInput(player, input);
      
      // For human players, reset edge-triggered input actions after processing
      // to ensure they are only triggered once per press.
      if (!player.isBot) {
        this.latestInputs.set(player.id, {
          ...input,
          firePressed: false,
          fireReleased: false,
          detonatePressed: false,
          placeMinePressed: false,
          boostPressed: false,
        });
      }
    }
  }

  private applyPlayerInput(player: PlayerEntity, input: TankInput): void {
    // Update the player's state based on their input, including movement, firing actions,
    // and interactions with the world such as boosting and shielding.
    
    // Update the player's boost state based on their input and apply any resulting effects.
    this.updateBoost(player, input);
    
    // Evaluate how much time the player has left of spawn protection, if any.
    player.spawnProtectionMs = Math.max(0, player.spawnProtectionMs - FIXED_TIMESTEP_SECONDS * 1000);
    // If the player still has spawn protection time remaining, consider them offensively locked.
    const offensiveLocked = player.spawnProtectionMs > 0;
    
    // Update the player's shield state based on their input
    // and apply any resulting effects or cooldowns.
    this.updateShieldState(player, input);
    
    // Update the player's body rotation, movement, and turret angle based on their input.
    this.updateBodyRotation(player, input);
    this.updateMovement(player, input);
    this.updateTurret(player, input);
    
    // Handle the player's firing actions based on their input and weapon state,
    // including checking for cooldowns, firing bullets, and placing mines.

    // Decrement the player's fire cooldown timer by the fixed time step of the simulation.
    player.fireCooldownMs = Math.max(0, player.fireCooldownMs - FIXED_TIMESTEP_SECONDS * 1000);
    
    // If player is still in fire cooldown, set fireCooldownBlocked to true
    // to inform client to display a blocked firing action
    player.fireCooldownBlocked = false;
    if ((input.firePressed || input.fireHeld) && player.fireCooldownMs > 0) {
      player.fireCooldownBlocked = true;
    }
    
    // If the player is offensively locked (e.g., due to spawn protection), 
    // set fireCooldownBlocked to true
    // when they attempt to fire to inform client to display a blocked firing action,
    if (offensiveLocked) {
      player.fireCooldownBlocked = input.firePressed || input.fireHeld;
      player.isChargingShot = false;
      player.chargeMs = 0;
      return;
    }
    
    // Get the weapon instance for the player based on their tank type from the playerWeapons map.
    const weapon = this.playerWeapons.get(player.id);
    if (weapon === undefined) {
      return;
    }
    
    // Determine if the player can fire based on the number of active bullets 
    // they currently have in the simulation
    const activeBulletCount = this.getActiveBulletCountForPlayer(player.id);

    // Handle the player's firing input through their weapon instance, which will manage firing logic,
    // including checking for cooldowns, firing bullets, and placing mines.
    const weaponAction = weapon.handleInput(player, input, activeBulletCount);
    if (weaponAction.selfDestructed) {
      this.destroyPlayer(player, player.id);
      return;
    }
    
    // If the weapon action resulted in a fired bullet, add it to the simulation's bullet list
    if (weaponAction.firedBullets.length > 0) {
      this.bullets.push(...weaponAction.firedBullets);
      this.effectBuffer.pushTransient(
        'bullet-shot', player.x, player.y, 0, player.bulletColor, 0);
    }
    
    // Try to place a mine if the corresponding input action is triggered.
    if (input.placeMinePressed) {
      this.tryPlaceMine(player);
    }
  }

  public ensureDefaultBots(): void {
    // Add default bots to the simulation based on the configured ENEMY_COUNT.
    // This allows the game to have AI opponents even if no human players are connected.
    for (let index = 0; index < ENEMY_COUNT; index += 1) {
      this.addPlayer(`bot-${index + 1}`, true);
    }
  }

  public createSnapshot(): WorldSnapshot {
    
    // Create a snapshot of the current world state to be sent to clients,
    // including player states, bullet and mine states, active effects, and shot previews.

    const effects = this.effectBuffer.drain();
    const shotPreviews = this.createShotPreviews();

    return {
      tick: this.tick,
      width: this.world.width,
      height: this.world.height,
      walls: this.world.walls,
      elapsedMs: this.nowMs,
      players: Array.from(this.players.values()).map((player) => ({
          id: player.id,
          tankType: player.tankType,
          kills: player.kills,
          deaths: player.deaths,
          score: player.kills - player.deaths,
          x: player.x,
          y: player.y,
          bodyAngle: player.bodyAngle,
          turretAngle: player.turretAngle,
          radius: player.radius,
          isAlive: player.isAlive,
          isBot: player.isBot,
          bulletColor: player.bulletColor,
          isShieldActive: player.isShieldActive,
          isSpawnProtected: player.spawnProtectionMs > 0,
          shieldCooldownBlocked: player.shieldCooldownBlocked,
          isChargingShot: player.isChargingShot,
          chargeLevel: this.getChargeRatio(player),
          fireCooldownBlocked: player.fireCooldownBlocked,
        })),
      bullets: this.bullets.map((bullet) => ({
        id: bullet.id,
        ownerPlayerId: bullet.ownerPlayerId,
        x: bullet.x,
        y: bullet.y,
        radius: bullet.radius,
        color: bullet.color,
        isCharged: bullet.isCharged,
        kind: bullet.kind,
        isMitosisSplit: bullet.kind === 'mitosis' && bullet.mitosisGeneration > 0,
        laserLength: bullet.kind === 'laser' ? bullet.laserLength : undefined,
        laserAngle: bullet.kind === 'laser' ? Math.atan2(bullet.vy, bullet.vx) : undefined,
      })),
      mines: this.mines.map((mine) => ({
        id: mine.id,
        ownerPlayerId: mine.ownerPlayerId,
        x: mine.x,
        y: mine.y,
        radius: mine.radius,
        armed: mine.lifetimeMs >= MINE_ARMING_DELAY_MS,
        color: mine.color,
      })),
      effects,
      shotPreviews,
    };
  }

  private createShotPreviews(): ShotPreviewState[] {
    const previews: ShotPreviewState[] = [];

    for (const player of this.players.values()) {
      if (!player.isAlive) {
        continue;
      }

      const origin = {
        x: player.x + Math.cos(player.turretAngle) * MUZZLE_OFFSET,
        y: player.y + Math.sin(player.turretAngle) * MUZZLE_OFFSET,
      };
      const segments = buildShotPreview(
        origin,
        player.turretAngle,
        this.world.walls,
        SHOT_PREVIEW_BULLET_RADIUS,
        player.isChargingShot ? 0 : SHOT_PREVIEW_REFLECTIONS,
        SHOT_PREVIEW_MAX_DISTANCE,
      );

      previews.push({ playerId: player.id, segments });
    }

    return previews;
  }

  private updateBoost(player: PlayerEntity, input: TankInput): void {
    // Update the player's boost state based on their input and apply any resulting visual effects.
    const boosted = updateBoostState(player, input.boostPressed);
    if (boosted) {
      // If the player has just activated their boost, push a boost effect to the effect buffer
      // to provide visual feedback for the boost activation on the client side.
      this.effectBuffer.pushTransient(
        'boost', player.x, player.y, player.radius, player.bulletColor, 260, player.bodyAngle);
    }
  }

  private updateShieldState(player: PlayerEntity, input: TankInput): void {
    // Update the player's shield state
    // based on their input and apply any resulting effects or cooldowns.
    updateShieldEntityState(player, input.shieldHeld);
  }

  private updateBodyRotation(player: PlayerEntity, input: TankInput): void {
    // Update the player's body rotation based on their input for turning left or right.
    let rotationDirection = 0;
    if (input.turnLeft) {
      rotationDirection -= 1;
    }
    if (input.turnRight) {
      rotationDirection += 1;
    }

    if (rotationDirection === 0) {
      return;
    }

    player.bodyAngle = normalizeAngleRadians(
      player.bodyAngle + rotationDirection * TANK_ROTATION_SPEED * FIXED_TIMESTEP_SECONDS);
  }

  private updateMovement(player: PlayerEntity, input: TankInput): void {
    // Update the player's movement based on their input for moving forward or backward,
    // while also checking for collisions with walls to prevent moving through them.
    let movementDirection = 0;
    if (input.moveForward) {
      movementDirection += 1;
    }
    if (input.moveBackward) {
      movementDirection -= 1;
    }

    if (movementDirection === 0) {
      return;
    }

    const speedBase = movementDirection >= 0 ? TANK_MOVE_SPEED : TANK_REVERSE_SPEED;
    const boostMultiplier = player.boostRemainingMs > 0 ? TANK_BOOST_MULTIPLIER : 1;
    const speed = speedBase * boostMultiplier;
    const distancePerTick = speed * movementDirection * FIXED_TIMESTEP_SECONDS;

    const nextX = player.x + Math.cos(player.bodyAngle) * distancePerTick;
    const nextY = player.y + Math.sin(player.bodyAngle) * distancePerTick;

    if (!this.intersectsAnyWall(nextX, player.y, player.radius)) {
      player.x = nextX;
    }
    if (!this.intersectsAnyWall(player.x, nextY, player.radius)) {
      player.y = nextY;
    }
  }

  private updateTurret(player: PlayerEntity, input: TankInput): void {
    // Update the player's turret angle to point towards the current position of the input pointer,
    // allowing the player to aim their shots in the direction of the pointer.
    player.turretAngle = normalizeAngleRadians(
      Math.atan2(input.pointerWorldY - player.y, input.pointerWorldX - player.x));
  }

  private updateBullets(): void {
    // Update the state of bullets in the simulation,
    // including their movement and interactions with walls.
    this.projectileSystem.updateBullets(this.bullets, (x, y, radius) => this.intersectsAnyWall(x, y, radius), {
      explodeBullet: (index) => this.triggerBulletExplosion(index),
    });
  }

  private updateMines(): void {
    // Update the state of mines in the simulation,
    // including their arming process and interactions with players,
    // and apply any resulting explosions or effects.
    this.mineSystem.updateMines(this.mines, {
      explodeMine: (x, y, sourcePlayerId) => this.triggerMineExplosion(x, y, sourcePlayerId),});
  }

  private resolveBulletBulletCollisions(): void {
    // Resolve collisions between bullets in the simulation,
    // including checking for collisions between bullets
    // and applying any resulting explosions or effects.
    this.projectileSystem.resolveBulletBulletCollisions(this.bullets, {
      explodeBullet: (index) => this.triggerBulletExplosion(index),
    });
  }

  private resolveBulletImpacts(): void {
    // Resolve impacts of bullets with players, mines, and walls,
    // and apply any resulting explosions, player damage, or mine triggers.
    this.projectileSystem.resolveBulletImpacts(this.bullets, this.mines, this.players, {
      explodeBullet: (index) => this.triggerBulletExplosion(index),
      explodeMine: (x, y, sourcePlayerId) => this.triggerMineExplosion(x, y, sourcePlayerId),
      isBulletHittingShield: (bullet, player) => this.isBulletHittingShield(bullet, player),
      deflectBulletByShieldSurfaceNormal: (bullet, player) => this.deflectBulletByShieldSurfaceNormal(bullet, player),
      destroyPlayer: (player, killerPlayerId) => this.destroyPlayer(player, killerPlayerId),
    });
  }

  private resolveMineTriggers(): void {
    // Resolve mine triggers based on player proximity to mines
    // and apply any resulting explosions or effects.
    this.mineSystem.resolveMineTriggers(this.mines, this.players, {
      explodeMine: (x, y, sourcePlayerId) => this.triggerMineExplosion(x, y, sourcePlayerId),
    });
  }

  private triggerMineExplosion(x: number, y: number, sourcePlayerId?: string): void {
    this.effectBuffer.pushExplosion('mine-explosion', x, y, MINE_EXPLOSION_RADIUS, 0xfb7185, MINE_EXPLOSION_VISUAL_DURATION_MS);
    this.applyAreaExplosion(x, y, MINE_EXPLOSION_RADIUS, sourcePlayerId);
  }

  private applyAreaExplosion(centerX: number, centerY: number, radius: number, sourcePlayerId?: string): void {
    this.explosionService.applyAreaExplosion(
      centerX,
      centerY,
      radius,
      sourcePlayerId,
      this.players,
      this.bullets,
      this.mines,
      { walls: this.world.walls },
      {
        destroyPlayer: (player, sourceId) => this.destroyPlayer(player, sourceId),
        explodeMine: (x, y, sourceId) => this.triggerMineExplosion(x, y, sourceId),
      },
    );
  }

  private isExplosionBlockedByWall(startX: number, startY: number, endX: number, endY: number): boolean {
    return this.explosionService.isBlockedByWall(this.world.walls, startX, startY, endX, endY);
  }

  private tryPlaceMine(player: PlayerEntity): void {
    // Attempt to place a mine for the player at their current position.
    const mine = this.mineSystem.tryPlaceMine(player, this.mines, `m-${this.mineCounter}`);
    if (mine === undefined) {
      return;
    }
    
    // If the mine was successfully placed, add it to the simulation's mine list
    // and push a mine placement effect to the effect buffer for visual feedback on the client side.
    this.mineCounter += 1;
    this.mines.push(mine);
    this.effectBuffer.pushTransient('mine-place', player.x, player.y, mine.radius, player.bulletColor, 0);
  }

  private tryDetonateOldestBulletForPlayer(playerId: string): void {
    const bulletIndex = this.bullets.findIndex((bullet) => bullet.ownerPlayerId === playerId);
    if (bulletIndex < 0) {
      return;
    }

    this.triggerBulletExplosion(bulletIndex);
  }

  private tryDetonateAllBulletsForPlayer(playerId: string): boolean {
    const indexes: number[] = [];
    for (let index = 0; index < this.bullets.length; index += 1) {
      const bullet = this.bullets[index];
      if (bullet === undefined) {
        continue;
      }

      if (bullet.ownerPlayerId === playerId) {
        indexes.push(index);
      }
    }

    if (indexes.length === 0) {
      return false;
    }

    for (let index = indexes.length - 1; index >= 0; index -= 1) {
      const bulletIndex = indexes[index];
      const bullet = this.bullets[bulletIndex];
      if (bullet === undefined || bullet.ownerPlayerId !== playerId) {
        continue;
      }

      this.triggerBulletExplosion(bulletIndex);
    }

    return true;
  }

  private trySplitOldestMitosisBulletForPlayer(playerId: string): boolean {
    // Attempt to split the oldest mitosis bullet for the specified player into two new bullets,
    // and add the new bullets to the simulation if successful.
    const bulletIndex = this.bullets.findIndex((bullet) => (
      bullet.ownerPlayerId === playerId
      && bullet.kind === 'mitosis'
      && bullet.mitosisGeneration === 0
    ));

    if (bulletIndex < 0) {
      return false;
    }

    const bullet = this.bullets[bulletIndex];
    if (bullet === undefined) {
      return false;
    }

    const splitBullets = splitMitosisBulletEntity(
      bullet,
      `b-${this.bulletCounter++}`,
      `b-${this.bulletCounter++}`,
    );

    if (splitBullets.length !== 2) {
      return false;
    }

    this.bullets.splice(bulletIndex, 1, splitBullets[0], splitBullets[1]);
    return true;
  }

  private tryDetonateSplitMitosisBulletsForPlayer(playerId: string): boolean {
    // Attempt to detonate all split mitosis bullets for the specified player,
    // and trigger explosions for each of those bullets if successful.
    const splitIndexes: number[] = [];
    for (let index = 0; index < this.bullets.length; index += 1) {
      const bullet = this.bullets[index];
      if (bullet === undefined) {
        continue;
      }

      if (
        bullet.ownerPlayerId === playerId
        && bullet.kind === 'mitosis'
        && bullet.mitosisGeneration > 0
      ) {
        splitIndexes.push(index);
      }
    }

    if (splitIndexes.length === 0) {
      return false;
    }

    for (let index = splitIndexes.length - 1; index >= 0; index -= 1) {
      const bulletIndex = splitIndexes[index];
      const bullet = this.bullets[bulletIndex];
      if (bullet === undefined) {
        continue;
      }

      if (
        bullet.ownerPlayerId !== playerId
        || bullet.kind !== 'mitosis'
        || bullet.mitosisGeneration === 0
      ) {
        continue;
      }

      this.triggerBulletExplosion(bulletIndex);
    }

    return true;
  }

  private tryPullPlayerToOwnedLaserTip(playerId: string, stepDistance: number): boolean {
    const player = this.players.get(playerId);
    if (player === undefined || !player.isAlive) {
      return false;
    }

    const hook = this.findLatestLaserForPlayer(playerId);
    if (hook === undefined) {
      return false;
    }

    // Consume the hook projectile before moving the player so they cannot
    // collide with their own laser tip on the same tick.
    this.bullets.splice(hook.index, 1);
    const laser = hook.bullet;

    const startX = player.x;
    const startY = player.y;
    const dx = laser.x - startX;
    const dy = laser.y - startY;
    const distance = Math.hypot(dx, dy);
    if (distance <= Number.EPSILON) {
      return false;
    }

    const dirX = dx / distance;
    const dirY = dy / distance;
    const targetX = laser.x;
    const targetY = laser.y;

    // Primary behavior: teleport directly to the live laser tip.
    if (!this.intersectsAnyWall(targetX, targetY, player.radius)) {
      player.x = targetX;
      player.y = targetY;
      player.bodyAngle = normalizeAngleRadians(Math.atan2(dirY, dirX));
      player.turretAngle = player.bodyAngle;
      return true;
    }

    // Fallback: if the tip is invalid for tank radius, walk back from tip to start
    // to find the closest valid position on the whip segment.
    const safeStepDistance = Math.max(1, Math.min(stepDistance, 8));
    let pullback = safeStepDistance;
    while (pullback <= distance) {
      const candidateX = targetX - dirX * pullback;
      const candidateY = targetY - dirY * pullback;
      if (!this.intersectsAnyWall(candidateX, candidateY, player.radius)) {
        player.x = candidateX;
        player.y = candidateY;
        player.bodyAngle = normalizeAngleRadians(Math.atan2(player.y - startY, player.x - startX));
        player.turretAngle = player.bodyAngle;
        return true;
      }

      pullback += safeStepDistance;
    }

    return false;
  }

  private findLatestLaserForPlayer(playerId: string): { index: number; bullet: BulletEntity } | undefined {
    for (let index = this.bullets.length - 1; index >= 0; index -= 1) {
      const bullet = this.bullets[index];
      if (bullet === undefined) {
        continue;
      }

      if (bullet.ownerPlayerId === playerId && bullet.kind === 'laser') {
        return { index, bullet };
      }
    }

    return undefined;
  }

  private triggerBulletExplosion(index: number): void {
    const bullet = this.bullets[index];
    if (bullet === undefined) {
      return;
    }

    this.bullets.splice(index, 1);
    const explosionColor = bullet.isCharged ? 0xf97316 : 0xf59e0b;
    this.effectBuffer.pushExplosion(
      'bullet-explosion',
      bullet.x,
      bullet.y,
      bullet.explosionRadius,
      explosionColor,
      BULLET_EXPLOSION_VISUAL_DURATION_MS,
    );
    this.applyAreaExplosion(bullet.x, bullet.y, bullet.explosionRadius, bullet.ownerPlayerId);
  }

  private isBulletHittingShield(bullet: BulletEntity, player: PlayerEntity): boolean {
    return bulletHitsShield(bullet, player);
  }

  private deflectBulletByShieldSurfaceNormal(bullet: BulletEntity, player: PlayerEntity): void {
    deflectBulletByShield(bullet, player);
  }

  private destroyPlayer(player: PlayerEntity, killerPlayerId?: string): void {
    if (!player.isAlive) {
      return;
    }

    if (player.spawnProtectionMs > 0) {
      return;
    }

    registerFrag(player, killerPlayerId, this.players);
    this.effectBuffer.pushTankDestruction(player.x, player.y, player.bulletColor);
    schedulePlayerRespawn(player, this.nowMs);
  }

  private processRespawns(): void {
    // Process player respawns based on their respawn timers and the current world state.
    this.playerLifecycleSystem.processRespawns(
      this.players, this.world.walls, this.nowMs, this.tick);
  }

  private getActiveBulletCountForPlayer(playerId: string): number {
    // Get the count of active bullets in the simulation that belong to a specific player.
    return this.bullets.filter((bullet) => bullet.ownerPlayerId === playerId).length;
  }

  private getChargeRatio(player: PlayerEntity): number {
    const weapon = this.playerWeapons.get(player.id);
    return weapon?.getChargeRatio(player) ?? 0;
  }

  private intersectsAnyWall(x: number, y: number, radius: number): boolean {
    // Check if a circle defined by (x, y, radius) intersects with any of the walls in the world.
    for (const wall of this.world.walls) {
      if (circleIntersectsRect(x, y, radius, wall.x, wall.y, wall.width, wall.height)) {
        return true;
      }
    }

    return false;
  }

  private getBotDifficultyProfile(): BotDifficultyProfile {
    const configuredDifficulty = parseBotDifficulty(ENEMY_AI_DIFFICULTY);
    return BOT_DIFFICULTY_PROFILES[configuredDifficulty];
  }
}
