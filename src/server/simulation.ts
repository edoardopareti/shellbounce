import {
  BULLET_EXPLOSION_VISUAL_DURATION_MS,
  BULLET_RADIUS,
  FIXED_TIMESTEP_SECONDS,
  MAX_ACTIVE_BULLETS_PER_TANK,
  MINE_ARMING_DELAY_MS,
  MINE_EXPLOSION_RADIUS,
  MINE_EXPLOSION_VISUAL_DURATION_MS,
  MUZZLE_OFFSET,
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
  private readonly playerWeapons = new Map<string, Weapon>(); // Player ID : Weapon
  private readonly latestInputs = new Map<string, TankInput>(); // Player ID : Latest input
  private readonly bullets: BulletEntity[] = []; // Active bullets in the simulation
  private readonly mines: MineEntity[] = []; // Active mines in the simulation
  private readonly botController = new BotController(); // Bot controller to manage AI player behavior
  private readonly weaponRegistry = new WeaponRegistry(); // Registry for creating weapons based on tank types
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
    this.weaponRegistry.registerDefault((runtime) => new SimpleGun(runtime));
    for (const tankType of ALL_TANK_TYPES) {
      this.weaponRegistry.register(tankType, (runtime) => new SimpleGun(runtime));
    }
  }

  public step(): void {
    // Advance the simulation by one tick.
    this.tick += 1;
    this.nowMs += FIXED_TIMESTEP_SECONDS * 1000;

    this.processRespawns();
    this.updatePlayers();
    this.updateBullets();
    this.updateMines();
    this.resolveBulletBulletCollisions();
    this.resolveBulletImpacts();
    this.resolveMineTriggers();
  }

  public addPlayer(playerId: string, isBot: boolean, preferredTankType?: TankType): void {

    // Add a new player to the simulation with the specified playerId and bot status.
    // If the playerId already exists, the method returns early.
    // Otherwise, it initializes a new PlayerEntity with default properties,
    // assigns a tank type based on whether it's a bot or human player,
    // and places the player at an available spawn point in the arena.
    // The player's input state is also initialized to an empty input.
    // For bots, additional state is set up to manage their behavior and decision-making in the simulation.

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
    this.playerWeapons.set(
      playerId,
      this.weaponRegistry.createForTankType(tankType, {
        nextBulletId: () => `b-${this.bulletCounter++}`,
        detonateOldestBulletForPlayer: (id) => this.tryDetonateOldestBulletForPlayer(id),
      }),
    );
    
    // Initialize the latest input for the player to an empty input state.
    this.latestInputs.set(playerId, EMPTY_INPUT);

    if (isBot) {
      this.botController.onBotAdded(playerId);
    }
  }

  public removePlayer(playerId: string): void {
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

  private updatePlayers(): void {
    const humans = Array.from(this.players.values()).filter((player) => !player.isBot && player.isAlive);
    const context: SimulationContext = {
      world: this.world,
      bullets: this.bullets,
      nowMs: this.nowMs,
      getActiveBulletCountForPlayer: (id) => this.getActiveBulletCountForPlayer(id),
      intersectsAnyWall: (x, y, radius) => this.intersectsAnyWall(x, y, radius),
      isExplosionBlockedByWall: (startX, startY, endX, endY) => this.isExplosionBlockedByWall(startX, startY, endX, endY),
    };

    for (const player of this.players.values()) {
      if (!player.isAlive) {
        continue;
      }

      const input = player.isBot
        ? this.botController.computeInput(player, humans, this.getBotDifficultyProfile(), context)
        : (this.latestInputs.get(player.id) ?? EMPTY_INPUT);
      this.applyPlayerInput(player, input);

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

  public setPlayerInput(playerId: string, input: TankInput): void {
    if (!this.players.has(playerId)) {
      return;
    }

    const sanitized = sanitizeInput(input);
    const previous = this.latestInputs.get(playerId) ?? EMPTY_INPUT;

    // Preserve edge-triggered actions until consumed during the next simulation tick.
    this.latestInputs.set(playerId, {
      ...sanitized,
      firePressed: previous.firePressed || sanitized.firePressed,
      fireReleased: previous.fireReleased || sanitized.fireReleased,
      detonatePressed: previous.detonatePressed || sanitized.detonatePressed,
      placeMinePressed: previous.placeMinePressed || sanitized.placeMinePressed,
      boostPressed: previous.boostPressed || sanitized.boostPressed,
    });
  }

  private applyPlayerInput(player: PlayerEntity, input: TankInput): void {
    this.updateBoost(player, input);
    player.spawnProtectionMs = Math.max(0, player.spawnProtectionMs - FIXED_TIMESTEP_SECONDS * 1000);

    const offensiveLocked = player.spawnProtectionMs > 0;

    this.updateShieldState(player, input);

    this.updateBodyRotation(player, input);
    this.updateMovement(player, input);
    this.updateTurret(player, input);

    player.fireCooldownMs = Math.max(0, player.fireCooldownMs - FIXED_TIMESTEP_SECONDS * 1000);

    player.fireCooldownBlocked = false;
    if ((input.firePressed || input.fireHeld) && player.fireCooldownMs > 0) {
      player.fireCooldownBlocked = true;
    }

    if (offensiveLocked) {
      player.fireCooldownBlocked = input.firePressed || input.fireHeld;
      player.isChargingShot = false;
      player.chargeMs = 0;
      return;
    }

    const weapon = this.playerWeapons.get(player.id);
    if (weapon === undefined) {
      return;
    }

    const canFire = this.getActiveBulletCountForPlayer(player.id) < MAX_ACTIVE_BULLETS_PER_TANK;
    const weaponAction = weapon.handleInput(player, input, canFire);
    if (weaponAction.selfDestructed) {
      this.destroyPlayer(player, player.id);
      return;
    }

    if (weaponAction.firedBullet !== undefined) {
      this.bullets.push(weaponAction.firedBullet);
      this.effectBuffer.pushTransient('bullet-shot', player.x, player.y, 0, player.bulletColor, 0);
    }

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
        BULLET_RADIUS,
        player.isChargingShot ? 0 : SHOT_PREVIEW_REFLECTIONS,
        SHOT_PREVIEW_MAX_DISTANCE,
      );

      previews.push({ playerId: player.id, segments });
    }

    return previews;
  }

  private updateBoost(player: PlayerEntity, input: TankInput): void {
    const boosted = updateBoostState(player, input.boostPressed);
    if (boosted) {
      this.effectBuffer.pushTransient('boost', player.x, player.y, player.radius, player.bulletColor, 260, player.bodyAngle);
    }
  }

  private updateShieldState(player: PlayerEntity, input: TankInput): void {
    updateShieldEntityState(player, input.shieldHeld);
  }

  private updateBodyRotation(player: PlayerEntity, input: TankInput): void {
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

    player.bodyAngle = normalizeAngleRadians(player.bodyAngle + rotationDirection * TANK_ROTATION_SPEED * FIXED_TIMESTEP_SECONDS);
  }

  private updateMovement(player: PlayerEntity, input: TankInput): void {
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
    player.turretAngle = normalizeAngleRadians(Math.atan2(input.pointerWorldY - player.y, input.pointerWorldX - player.x));
  }

  private updateBullets(): void {
    this.projectileSystem.updateBullets(this.bullets, (x, y, radius) => this.intersectsAnyWall(x, y, radius), {
      explodeBullet: (index) => this.triggerBulletExplosion(index),
    });
  }

  private resolveBulletBulletCollisions(): void {
    this.projectileSystem.resolveBulletBulletCollisions(this.bullets, {
      explodeBullet: (index) => this.triggerBulletExplosion(index),
    });
  }

  private resolveBulletImpacts(): void {
    this.projectileSystem.resolveBulletImpacts(this.bullets, this.mines, this.players, {
      explodeBullet: (index) => this.triggerBulletExplosion(index),
      explodeMine: (x, y, sourcePlayerId) => this.triggerMineExplosion(x, y, sourcePlayerId),
      isBulletHittingShield: (bullet, player) => this.isBulletHittingShield(bullet, player),
      deflectBulletByShieldSurfaceNormal: (bullet, player) => this.deflectBulletByShieldSurfaceNormal(bullet, player),
      destroyPlayer: (player, killerPlayerId) => this.destroyPlayer(player, killerPlayerId),
    });
  }

  private resolveMineTriggers(): void {
    this.mineSystem.resolveMineTriggers(this.mines, this.players, {
      explodeMine: (x, y, sourcePlayerId) => this.triggerMineExplosion(x, y, sourcePlayerId),
    });
  }

  private updateMines(): void {
    this.mineSystem.updateMines(this.mines, {
      explodeMine: (x, y, sourcePlayerId) => this.triggerMineExplosion(x, y, sourcePlayerId),});
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
    const mine = this.mineSystem.tryPlaceMine(player, this.mines, `m-${this.mineCounter}`);
    if (mine === undefined) {
      return;
    }

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
    this.playerLifecycleSystem.processRespawns(this.players, this.world.walls, this.nowMs, this.tick);
  }

  private getActiveBulletCountForPlayer(playerId: string): number {
    return this.bullets.filter((bullet) => bullet.ownerPlayerId === playerId).length;
  }

  private getChargeRatio(player: PlayerEntity): number {
    const weapon = this.playerWeapons.get(player.id);
    return weapon?.getChargeRatio(player) ?? 0;
  }

  private intersectsAnyWall(x: number, y: number, radius: number): boolean {
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
