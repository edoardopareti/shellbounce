import {
  BULLET_EXPLOSION_RADIUS,
  BULLET_EXPLOSION_VISUAL_DURATION_MS,
  BULLET_LIFETIME_MS,
  BULLET_MAX_BOUNCES,
  BULLET_RADIUS,
  BULLET_SPEED,
  CHARGED_SHOT_COOLDOWN_MS,
  CHARGED_SHOT_MAX_EXPLOSION_MULTIPLIER,
  CHARGED_SHOT_MAX_HOLD_MS,
  CHARGED_SHOT_MAX_SPEED_MULTIPLIER,
  CHARGED_SHOT_MIN_HOLD_MS,
  CHARGED_SHOT_OVERCHARGE_MS,
  FIRE_COOLDOWN_MS,
  FIXED_TIMESTEP_SECONDS,
  MAX_ACTIVE_BULLETS_PER_TANK,
  MAX_ACTIVE_MINES_PER_TANK,
  MINE_ARMING_DELAY_MS,
  MINE_EXPLOSION_RADIUS,
  MINE_EXPLOSION_VISUAL_DURATION_MS,
  MINE_LIFETIME_MS,
  MINE_RADIUS,
  MUZZLE_OFFSET,
  SHIELD_COOLDOWN_MS,
  SHIELD_OVERCHARGE_MS,
  SPAWN_CORNER_PADDING,
  TANK_BOOST_COOLDOWN_MS,
  TANK_BOOST_DURATION_MS,
  TANK_BOOST_MULTIPLIER,
  TANK_MOVE_SPEED,
  TANK_RADIUS,
  TANK_RESPAWN_DELAY_MS,
  TANK_REVERSE_SPEED,
  TANK_ROTATION_SPEED,
  TANK_SHIELD_FORWARD_OFFSET,
  TANK_SHIELD_RADIUS,
  TANK_SHIELD_SECTOR_ANGLE_RADIANS,
} from './constants.js';
import { ENEMY_AI_DIFFICULTY, ENEMY_COUNT, PLAYER_TANK_TYPE, SELECTED_MAP } from './config.js';
import { getArenaWorld } from './map.js';
import { circleIntersectsRect, clamp, distance, normalizeAngleRadians } from './math.js';
import {
  ALL_TANK_TYPES,
  EMPTY_INPUT,
  type EffectEvent,
  type TankInput,
  type TankType,
  type WorldSnapshot,
} from './types.js';

interface PlayerEntity {
  id: string;
  tankType: TankType;
  bulletColor: number;
  x: number;
  y: number;
  bodyAngle: number;
  turretAngle: number;
  radius: number;
  isAlive: boolean;
  isBot: boolean;
  fireCooldownMs: number;
  boostRemainingMs: number;
  boostCooldownMs: number;
  respawnAtMs: number;
  shieldHoldMs: number;
  shieldCooldownMs: number;
  isShieldActive: boolean;
  isChargingShot: boolean;
  chargeMs: number;
}

interface BulletEntity {
  id: string;
  ownerPlayerId: string;
  color: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  lifetimeMs: number;
  bouncesRemaining: number;
  explosionRadius: number;
  explodeOnWallImpact: boolean;
  isCharged: boolean;
}

interface MineEntity {
  id: string;
  ownerPlayerId: string;
  color: number;
  x: number;
  y: number;
  radius: number;
  lifetimeMs: number;
  ownerHasClearedMine: boolean;
}

interface PlayableBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

type BotDifficulty = 'easy' | 'medium' | 'hard';

interface BotDifficultyProfile {
  preferredDistanceMin: number;
  preferredDistanceMax: number;
  steeringDeadZoneRadians: number;
  wallProbeDistance: number;
  wallAvoidanceTurnBiasRadians: number;
  fireCooldownMs: { min: number; max: number };
  maxFireRange: number;
  suppressionFireRangeFactor: number;
  dodgeMargin: number;
  dodgeReactionChance: number;
  canShootWhileDodging: boolean;
  bulletThreatHorizonMs: number;
  lineOfFireAvoidanceChance: number;
  lineOfFireDangerMaxDistance: number;
  lineOfFireMargin: number;
  detonationMargin: number;
  detonationTriggerChance: number;
  selfPreservationMargin: number;
  minePlacementDistanceFactor: number;
  minePlacementCooldownMs: { min: number; max: number };
  pursuitRangeMultiplier: number;
  closeReverseDistanceMultiplier: number;
  holdWhenOnTarget: boolean;
  pathCellSize: number;
  pathReplanMs: { min: number; max: number };
  chaseBoostDistanceMultiplier: number;
}

const BOT_DIFFICULTY_PROFILES: Record<BotDifficulty, BotDifficultyProfile> = {
  easy: {
    preferredDistanceMin: 260,
    preferredDistanceMax: 480,
    steeringDeadZoneRadians: 0.38,
    wallProbeDistance: 65,
    wallAvoidanceTurnBiasRadians: Math.PI * (25 / 180),
    fireCooldownMs: { min: 850, max: 1400 },
    maxFireRange: 380,
    suppressionFireRangeFactor: 0.2,
    dodgeMargin: 16,
    dodgeReactionChance: 0.2,
    canShootWhileDodging: false,
    bulletThreatHorizonMs: 400,
    lineOfFireAvoidanceChance: 0.08,
    lineOfFireDangerMaxDistance: 240,
    lineOfFireMargin: 3,
    detonationMargin: 18,
    detonationTriggerChance: 0.08,
    selfPreservationMargin: 20,
    minePlacementDistanceFactor: 0.75,
    minePlacementCooldownMs: { min: 3000, max: 4500 },
    pursuitRangeMultiplier: 1.45,
    closeReverseDistanceMultiplier: 0.95,
    holdWhenOnTarget: false,
    pathCellSize: 64,
    pathReplanMs: { min: 700, max: 1200 },
    chaseBoostDistanceMultiplier: 1.9,
  },
  medium: {
    preferredDistanceMin: 170,
    preferredDistanceMax: 320,
    steeringDeadZoneRadians: 0.2,
    wallProbeDistance: 95,
    wallAvoidanceTurnBiasRadians: Math.PI * (42 / 180),
    fireCooldownMs: { min: 420, max: 700 },
    maxFireRange: 510,
    suppressionFireRangeFactor: 0.45,
    dodgeMargin: 26,
    dodgeReactionChance: 0.72,
    canShootWhileDodging: true,
    bulletThreatHorizonMs: 850,
    lineOfFireAvoidanceChance: 0.52,
    lineOfFireDangerMaxDistance: 450,
    lineOfFireMargin: 9,
    detonationMargin: 8,
    detonationTriggerChance: 0.4,
    selfPreservationMargin: 10,
    minePlacementDistanceFactor: 1,
    minePlacementCooldownMs: { min: 1850, max: 3000 },
    pursuitRangeMultiplier: 1.16,
    closeReverseDistanceMultiplier: 0.68,
    holdWhenOnTarget: true,
    pathCellSize: 44,
    pathReplanMs: { min: 360, max: 620 },
    chaseBoostDistanceMultiplier: 1.3,
  },
  hard: {
    preferredDistanceMin: 70,
    preferredDistanceMax: 190,
    steeringDeadZoneRadians: 0.08,
    wallProbeDistance: 120,
    wallAvoidanceTurnBiasRadians: Math.PI * (60 / 180),
    fireCooldownMs: { min: 240, max: 420 },
    maxFireRange: 700,
    suppressionFireRangeFactor: 0.9,
    dodgeMargin: 40,
    dodgeReactionChance: 1,
    canShootWhileDodging: true,
    bulletThreatHorizonMs: 1400,
    lineOfFireAvoidanceChance: 1,
    lineOfFireDangerMaxDistance: 820,
    lineOfFireMargin: 20,
    detonationMargin: 2,
    detonationTriggerChance: 0.85,
    selfPreservationMargin: 4,
    minePlacementDistanceFactor: 1.2,
    minePlacementCooldownMs: { min: 1100, max: 1800 },
    pursuitRangeMultiplier: 1,
    closeReverseDistanceMultiplier: 0.5,
    holdWhenOnTarget: false,
    pathCellSize: 28,
    pathReplanMs: { min: 140, max: 240 },
    chaseBoostDistanceMultiplier: 1.05,
  },
};

interface BulletThreat {
  bullet: BulletEntity;
  timeToClosest: number;
}

interface LineOfFireThreat {
  aimDirectionX: number;
  aimDirectionY: number;
}

export class AuthoritativeSimulation {
  private readonly world = getArenaWorld(SELECTED_MAP);
  private readonly bounds = this.computePlayableBounds();
  private readonly players = new Map<string, PlayerEntity>();
  private readonly latestInputs = new Map<string, TankInput>();
  private readonly bullets: BulletEntity[] = [];
  private readonly mines: MineEntity[] = [];
  private readonly botFireHeld = new Map<string, boolean>();
  private readonly botNextShotAtMs = new Map<string, number>();
  private readonly botNextMineAtMs = new Map<string, number>();
  private readonly botNextPathPlanAtMs = new Map<string, number>();
  private readonly botPathWaypointIndex = new Map<string, number>();
  private readonly botPathWaypoints = new Map<string, Array<{ x: number; y: number }>>();
  private readonly pathGridCache = new Map<number, NavigationGrid>();
  private readonly pendingEffects: EffectEvent[] = [];
  private tick = 0;
  private nowMs = 0;
  private bulletCounter = 0;
  private mineCounter = 0;
  private playerJoinCounter = 0;
  private effectCounter = 0;

  public addPlayer(playerId: string, isBot: boolean): void {
    if (this.players.has(playerId)) {
      return;
    }

    const tankType = this.resolveTankTypeForNewPlayer(isBot);
    const spawn = this.pickAvailableSpawnPoint(playerId) ?? this.getCornerSpawnPoints()[0];

    const player: PlayerEntity = {
      id: playerId,
      tankType,
      bulletColor: getTankBulletColor(tankType),
      x: spawn.x,
      y: spawn.y,
      bodyAngle: -Math.PI / 2,
      turretAngle: -Math.PI / 2,
      radius: TANK_RADIUS,
      isAlive: true,
      isBot,
      fireCooldownMs: 0,
      boostRemainingMs: 0,
      boostCooldownMs: 0,
      respawnAtMs: 0,
      shieldHoldMs: 0,
      shieldCooldownMs: 0,
      isShieldActive: false,
      isChargingShot: false,
      chargeMs: 0,
    };

    this.playerJoinCounter += 1;
    this.players.set(playerId, player);
    this.latestInputs.set(playerId, EMPTY_INPUT);
    if (isBot) {
      this.botFireHeld.set(playerId, false);
      this.botNextShotAtMs.set(playerId, 0);
      this.botNextMineAtMs.set(playerId, 0);
      this.botNextPathPlanAtMs.set(playerId, 0);
      this.botPathWaypointIndex.set(playerId, 0);
      this.botPathWaypoints.set(playerId, []);
    }
  }

  public removePlayer(playerId: string): void {
    this.players.delete(playerId);
    this.latestInputs.delete(playerId);
    this.botFireHeld.delete(playerId);
    this.botNextShotAtMs.delete(playerId);
    this.botNextMineAtMs.delete(playerId);
    this.botNextPathPlanAtMs.delete(playerId);
    this.botPathWaypointIndex.delete(playerId);
    this.botPathWaypoints.delete(playerId);

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

  public ensureDefaultBots(): void {
    for (let index = 0; index < ENEMY_COUNT; index += 1) {
      this.addPlayer(`bot-${index + 1}`, true);
    }
  }

  public step(): void {
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

  public createSnapshot(): WorldSnapshot {
    const effects = [...this.pendingEffects];
    this.pendingEffects.length = 0;

    return {
      tick: this.tick,
      width: this.world.width,
      height: this.world.height,
      walls: this.world.walls,
      players: Array.from(this.players.values()).map((player) => ({
        id: player.id,
        tankType: player.tankType,
        x: player.x,
        y: player.y,
        bodyAngle: player.bodyAngle,
        turretAngle: player.turretAngle,
        radius: player.radius,
        isAlive: player.isAlive,
        isBot: player.isBot,
        bulletColor: player.bulletColor,
        isShieldActive: player.isShieldActive,
        isChargingShot: player.isChargingShot,
        chargeLevel: this.getChargeRatio(player),
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
    };
  }

  private updatePlayers(): void {
    const humans = Array.from(this.players.values()).filter((player) => !player.isBot && player.isAlive);

    for (const player of this.players.values()) {
      if (!player.isAlive) {
        continue;
      }

      const input = player.isBot ? this.computeBotInput(player, humans) : (this.latestInputs.get(player.id) ?? EMPTY_INPUT);
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

  private applyPlayerInput(player: PlayerEntity, input: TankInput): void {
    this.updateBoost(player, input);

    const shieldOvercharged = this.updateShieldState(player, input);
    if (shieldOvercharged) {
      this.destroyPlayer(player);
      return;
    }

    this.updateBodyRotation(player, input);
    this.updateMovement(player, input);
    this.updateTurret(player, input);

    player.fireCooldownMs = Math.max(0, player.fireCooldownMs - FIXED_TIMESTEP_SECONDS * 1000);

    const canFire = this.getActiveBulletCountForPlayer(player.id) < MAX_ACTIVE_BULLETS_PER_TANK;
    const chargeResult = this.updateChargeState(player, input, canFire);
    if (chargeResult.selfDestructed) {
      this.destroyPlayer(player);
      return;
    }

    if (chargeResult.firedBullet !== undefined) {
      this.bullets.push(chargeResult.firedBullet);
      this.queueTransientEffect('bullet-shot', player.x, player.y, 0, player.bulletColor, 0);
    }

    if (input.placeMinePressed) {
      this.tryPlaceMine(player);
    }

    if (input.detonatePressed) {
      this.tryDetonateOldestBulletForPlayer(player.id);
    }
  }

  private updateBoost(player: PlayerEntity, input: TankInput): void {
    const deltaMs = FIXED_TIMESTEP_SECONDS * 1000;

    if (player.boostRemainingMs > 0) {
      player.boostRemainingMs = Math.max(0, player.boostRemainingMs - deltaMs);
      if (player.boostRemainingMs === 0) {
        player.boostCooldownMs = TANK_BOOST_COOLDOWN_MS;
      }
    } else if (player.boostCooldownMs > 0) {
      player.boostCooldownMs = Math.max(0, player.boostCooldownMs - deltaMs);
    }

    if (input.boostPressed && player.boostRemainingMs === 0 && player.boostCooldownMs === 0) {
      player.boostRemainingMs = TANK_BOOST_DURATION_MS;
    }
  }

  private updateShieldState(player: PlayerEntity, input: TankInput): boolean {
    const deltaMs = FIXED_TIMESTEP_SECONDS * 1000;
    const wasShieldActive = player.isShieldActive;

    player.shieldCooldownMs = Math.max(0, player.shieldCooldownMs - deltaMs);

    if (!input.shieldHeld || player.shieldCooldownMs > 0) {
      if (wasShieldActive) {
        player.shieldCooldownMs = SHIELD_COOLDOWN_MS;
      }

      player.isShieldActive = false;
      player.shieldHoldMs = 0;
      return false;
    }

    player.isShieldActive = true;
    player.shieldHoldMs += deltaMs;

    if (player.shieldHoldMs < SHIELD_OVERCHARGE_MS) {
      return false;
    }

    player.isShieldActive = false;
    player.shieldHoldMs = 0;
    player.shieldCooldownMs = SHIELD_COOLDOWN_MS;
    return true;
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

  private updateChargeState(
    player: PlayerEntity,
    input: TankInput,
    canFire: boolean,
  ): { firedBullet: BulletEntity | undefined; selfDestructed: boolean } {
    const deltaMs = FIXED_TIMESTEP_SECONDS * 1000;

    if (!canFire && !player.isChargingShot) {
      return { firedBullet: undefined, selfDestructed: false };
    }

    if (player.isChargingShot && input.fireHeld) {
      player.chargeMs += deltaMs;
      if (player.chargeMs >= CHARGED_SHOT_OVERCHARGE_MS) {
        player.isChargingShot = false;
        player.chargeMs = 0;
        player.fireCooldownMs = FIRE_COOLDOWN_MS;
        return { firedBullet: undefined, selfDestructed: true };
      }
    }

    if (input.firePressed && canFire && player.fireCooldownMs === 0 && !player.isChargingShot) {
      player.isChargingShot = true;
      player.chargeMs = 0;
    }

    if (!player.isChargingShot) {
      return { firedBullet: undefined, selfDestructed: false };
    }

    if (!input.fireReleased) {
      return { firedBullet: undefined, selfDestructed: false };
    }

    if (!canFire || player.fireCooldownMs > 0) {
      player.isChargingShot = false;
      player.chargeMs = 0;
      return { firedBullet: undefined, selfDestructed: false };
    }

    const heldMs = player.chargeMs;
    const chargeRatio = this.getChargeRatio(player);
    const isChargedShot = heldMs >= CHARGED_SHOT_MIN_HOLD_MS;

    player.isChargingShot = false;
    player.chargeMs = 0;

    if (!isChargedShot) {
      player.fireCooldownMs = FIRE_COOLDOWN_MS;
      return {
        firedBullet: this.createBullet(player, {
          speed: BULLET_SPEED,
          explosionRadius: BULLET_EXPLOSION_RADIUS,
          maxBounces: BULLET_MAX_BOUNCES,
          explodeOnWallImpact: false,
          isCharged: false,
        }),
        selfDestructed: false,
      };
    }

    const speed = lerp(BULLET_SPEED, BULLET_SPEED * CHARGED_SHOT_MAX_SPEED_MULTIPLIER, chargeRatio);
    const explosionRadius = lerp(
      BULLET_EXPLOSION_RADIUS,
      BULLET_EXPLOSION_RADIUS * CHARGED_SHOT_MAX_EXPLOSION_MULTIPLIER,
      chargeRatio,
    );

    player.fireCooldownMs = CHARGED_SHOT_COOLDOWN_MS;

    return {
      firedBullet: this.createBullet(player, {
        speed,
        explosionRadius,
        maxBounces: 0,
        explodeOnWallImpact: true,
        isCharged: true,
      }),
      selfDestructed: false,
    };
  }

  private createBullet(
    player: PlayerEntity,
    config: {
      speed: number;
      explosionRadius: number;
      maxBounces: number;
      explodeOnWallImpact: boolean;
      isCharged: boolean;
    },
  ): BulletEntity {
    const spawnX = player.x + Math.cos(player.turretAngle) * MUZZLE_OFFSET;
    const spawnY = player.y + Math.sin(player.turretAngle) * MUZZLE_OFFSET;

    const bullet: BulletEntity = {
      id: `b-${this.bulletCounter}`,
      ownerPlayerId: player.id,
      color: player.bulletColor,
      x: spawnX,
      y: spawnY,
      vx: Math.cos(player.turretAngle) * config.speed,
      vy: Math.sin(player.turretAngle) * config.speed,
      radius: BULLET_RADIUS,
      lifetimeMs: 0,
      bouncesRemaining: config.maxBounces,
      explosionRadius: config.explosionRadius,
      explodeOnWallImpact: config.explodeOnWallImpact,
      isCharged: config.isCharged,
    };

    this.bulletCounter += 1;
    return bullet;
  }

  private updateBullets(): void {
    const deltaMs = FIXED_TIMESTEP_SECONDS * 1000;

    for (let index = this.bullets.length - 1; index >= 0; index -= 1) {
      const bullet = this.bullets[index];
      if (bullet === undefined) {
        continue;
      }

      bullet.lifetimeMs += deltaMs;
      if (bullet.lifetimeMs >= BULLET_LIFETIME_MS) {
        this.bullets.splice(index, 1);
        continue;
      }

      const nextX = bullet.x + bullet.vx * FIXED_TIMESTEP_SECONDS;
      const nextY = bullet.y + bullet.vy * FIXED_TIMESTEP_SECONDS;

      let bounced = false;
      if (this.intersectsAnyWall(nextX, bullet.y, bullet.radius)) {
        if (bullet.explodeOnWallImpact) {
          this.triggerBulletExplosion(index);
          continue;
        }
        bullet.vx *= -1;
        bounced = true;
      } else {
        bullet.x = nextX;
      }

      if (index >= this.bullets.length) {
        continue;
      }

      if (this.intersectsAnyWall(bullet.x, nextY, bullet.radius)) {
        if (bullet.explodeOnWallImpact) {
          this.triggerBulletExplosion(index);
          continue;
        }
        bullet.vy *= -1;
        bounced = true;
      } else {
        bullet.y = nextY;
      }

      if (bounced) {
        bullet.bouncesRemaining -= 1;
        if (bullet.bouncesRemaining < 0) {
          this.bullets.splice(index, 1);
        }
      }
    }
  }

  private resolveBulletBulletCollisions(): void {
    for (let i = 0; i < this.bullets.length; i += 1) {
      const first = this.bullets[i];
      if (first === undefined) {
        continue;
      }

      for (let j = i + 1; j < this.bullets.length; j += 1) {
        const second = this.bullets[j];
        if (second === undefined) {
          continue;
        }

        if (first.ownerPlayerId === second.ownerPlayerId) {
          continue;
        }

        const hitDistance = first.radius + second.radius;
        if (distance(first.x, first.y, second.x, second.y) > hitDistance) {
          continue;
        }

        const firstIndex = this.bullets.indexOf(first);
        if (firstIndex >= 0) {
          this.triggerBulletExplosion(firstIndex);
        }

        const secondIndex = this.bullets.indexOf(second);
        if (secondIndex >= 0) {
          this.triggerBulletExplosion(secondIndex);
        }

        break;
      }
    }
  }

  private resolveBulletImpacts(): void {
    for (let bulletIndex = this.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      if (bulletIndex >= this.bullets.length) {
        continue;
      }

      const bullet = this.bullets[bulletIndex];
      if (bullet === undefined) {
        continue;
      }
      let handled = false;

      for (let mineIndex = this.mines.length - 1; mineIndex >= 0; mineIndex -= 1) {
        const mine = this.mines[mineIndex];
        if (mine === undefined) {
          continue;
        }
        if (distance(bullet.x, bullet.y, mine.x, mine.y) > bullet.radius + mine.radius) {
          continue;
        }

        this.mines.splice(mineIndex, 1);
        this.triggerMineExplosion(mine.x, mine.y);
        this.bullets.splice(bulletIndex, 1);
        handled = true;
        break;
      }

      if (handled || bulletIndex >= this.bullets.length) {
        continue;
      }

      for (const player of this.players.values()) {
        if (!player.isAlive) {
          continue;
        }

        if (this.isBulletHittingShield(bullet, player)) {
          this.deflectBulletByShieldSurfaceNormal(bullet, player);
          handled = true;
          break;
        }

        if (distance(player.x, player.y, bullet.x, bullet.y) > player.radius + bullet.radius) {
          continue;
        }

        this.triggerBulletExplosion(bulletIndex);
        this.destroyPlayer(player);
        handled = true;
        break;
      }

      if (handled) {
        continue;
      }
    }
  }

  private resolveMineTriggers(): void {
    for (let mineIndex = this.mines.length - 1; mineIndex >= 0; mineIndex -= 1) {
      const mine = this.mines[mineIndex];
      if (mine === undefined) {
        continue;
      }
      if (mine.lifetimeMs < MINE_ARMING_DELAY_MS) {
        continue;
      }

      const owner = this.players.get(mine.ownerPlayerId);
      if (owner !== undefined && owner.isAlive) {
        const ownerOverlappingMine = distance(owner.x, owner.y, mine.x, mine.y) <= owner.radius + mine.radius;
        if (!ownerOverlappingMine) {
          mine.ownerHasClearedMine = true;
        }
      } else {
        mine.ownerHasClearedMine = true;
      }

      for (const player of this.players.values()) {
        if (!player.isAlive) {
          continue;
        }

        if (player.id === mine.ownerPlayerId && !mine.ownerHasClearedMine) {
          continue;
        }

        if (distance(player.x, player.y, mine.x, mine.y) > player.radius + mine.radius) {
          continue;
        }

        this.mines.splice(mineIndex, 1);
        this.triggerMineExplosion(mine.x, mine.y);
        break;
      }
    }
  }

  private updateMines(): void {
    const deltaMs = FIXED_TIMESTEP_SECONDS * 1000;

    for (let index = this.mines.length - 1; index >= 0; index -= 1) {
      const mine = this.mines[index];
      if (mine === undefined) {
        continue;
      }
      mine.lifetimeMs += deltaMs;

      if (mine.lifetimeMs < MINE_LIFETIME_MS) {
        continue;
      }

      this.mines.splice(index, 1);
      this.triggerMineExplosion(mine.x, mine.y);
    }
  }

  private triggerMineExplosion(x: number, y: number): void {
    this.queueExplosionEffect('mine-explosion', x, y, MINE_EXPLOSION_RADIUS, 0xfb7185, MINE_EXPLOSION_VISUAL_DURATION_MS);
    this.applyAreaExplosion(x, y, MINE_EXPLOSION_RADIUS);
  }

  private applyAreaExplosion(centerX: number, centerY: number, radius: number): void {
    for (const player of this.players.values()) {
      if (!player.isAlive || player.isShieldActive) {
        continue;
      }

      const withinRadius = distance(player.x, player.y, centerX, centerY) <= radius + player.radius;
      if (!withinRadius) {
        continue;
      }

      const blockedByWall = this.isExplosionBlockedByWall(centerX, centerY, player.x, player.y);
      if (!blockedByWall) {
        this.destroyPlayer(player);
      }
    }

    for (let mineIndex = this.mines.length - 1; mineIndex >= 0; mineIndex -= 1) {
      const mine = this.mines[mineIndex];
      if (mine === undefined) {
        continue;
      }
      const withinRadius = distance(mine.x, mine.y, centerX, centerY) <= radius + mine.radius;
      if (!withinRadius) {
        continue;
      }

      const blockedByWall = this.isExplosionBlockedByWall(centerX, centerY, mine.x, mine.y);
      if (blockedByWall) {
        continue;
      }

      this.mines.splice(mineIndex, 1);
      this.triggerMineExplosion(mine.x, mine.y);
    }

    for (let bulletIndex = this.bullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
      const bullet = this.bullets[bulletIndex];
      if (bullet === undefined) {
        continue;
      }
      if (distance(bullet.x, bullet.y, centerX, centerY) <= radius + bullet.radius) {
        this.bullets.splice(bulletIndex, 1);
      }
    }
  }

  private isExplosionBlockedByWall(startX: number, startY: number, endX: number, endY: number): boolean {
    for (const wall of this.world.walls) {
      if (segmentIntersectsRectangle(startX, startY, endX, endY, wall)) {
        return true;
      }
    }

    return false;
  }

  private tryPlaceMine(player: PlayerEntity): void {
    const activeMineCount = this.mines.filter((mine) => mine.ownerPlayerId === player.id).length;
    if (activeMineCount >= MAX_ACTIVE_MINES_PER_TANK) {
      return;
    }

    this.mines.push({
      id: `m-${this.mineCounter}`,
      ownerPlayerId: player.id,
      color: player.bulletColor,
      x: player.x,
      y: player.y,
      radius: MINE_RADIUS,
      lifetimeMs: 0,
      ownerHasClearedMine: false,
    });
    this.mineCounter += 1;
    this.queueTransientEffect('mine-place', player.x, player.y, MINE_RADIUS, player.bulletColor, 0);
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
    this.queueExplosionEffect(
      'bullet-explosion',
      bullet.x,
      bullet.y,
      bullet.explosionRadius,
      explosionColor,
      BULLET_EXPLOSION_VISUAL_DURATION_MS,
    );
    this.applyAreaExplosion(bullet.x, bullet.y, bullet.explosionRadius);
  }

  private isBulletHittingShield(bullet: BulletEntity, player: PlayerEntity): boolean {
    if (!player.isShieldActive) {
      return false;
    }

    const shieldCenter = this.getShieldCenter(player);
    const distanceToShieldCenter = distance(bullet.x, bullet.y, shieldCenter.x, shieldCenter.y);
    if (distanceToShieldCenter > bullet.radius + TANK_SHIELD_RADIUS) {
      return false;
    }

    const angleToBullet = Math.atan2(bullet.y - shieldCenter.y, bullet.x - shieldCenter.x);
    const delta = normalizeAngleRadians(angleToBullet - player.turretAngle);
    return Math.abs(delta) <= TANK_SHIELD_SECTOR_ANGLE_RADIANS * 0.5;
  }

  private deflectBulletByShieldSurfaceNormal(bullet: BulletEntity, player: PlayerEntity): void {
    const shieldCenter = this.getShieldCenter(player);
    let nx = bullet.x - shieldCenter.x;
    let ny = bullet.y - shieldCenter.y;

    const length = Math.sqrt(nx * nx + ny * ny);
    if (length <= Number.EPSILON) {
      const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
      if (speed > Number.EPSILON) {
        nx = -bullet.vx / speed;
        ny = -bullet.vy / speed;
      } else {
        nx = 1;
        ny = 0;
      }
    } else {
      nx /= length;
      ny /= length;
    }

    const speed = Math.max(Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy), Number.EPSILON);
    bullet.vx = nx * speed;
    bullet.vy = ny * speed;

    const safeDistance = TANK_SHIELD_RADIUS + bullet.radius + 0.5;
    bullet.x = shieldCenter.x + nx * safeDistance;
    bullet.y = shieldCenter.y + ny * safeDistance;
  }

  private getShieldCenter(player: PlayerEntity): { x: number; y: number } {
    return {
      x: player.x + Math.cos(player.turretAngle) * TANK_SHIELD_FORWARD_OFFSET,
      y: player.y + Math.sin(player.turretAngle) * TANK_SHIELD_FORWARD_OFFSET,
    };
  }

  private destroyPlayer(player: PlayerEntity): void {
    if (!player.isAlive) {
      return;
    }

    player.isAlive = false;
    this.queueTankDestructionEffect(player.x, player.y, player.bulletColor);
    player.respawnAtMs = this.nowMs + TANK_RESPAWN_DELAY_MS;
    player.isShieldActive = false;
    player.shieldHoldMs = 0;
    player.isChargingShot = false;
    player.chargeMs = 0;
  }

  private queueExplosionEffect(
    kind: 'explosion' | 'bullet-explosion' | 'mine-explosion',
    x: number,
    y: number,
    radius: number,
    color: number,
    durationMs: number,
  ): void {
    this.pendingEffects.push({
      id: `fx-${this.effectCounter}`,
      kind,
      x,
      y,
      radius,
      color,
      durationMs,
    });
    this.effectCounter += 1;
  }

  private queueTankDestructionEffect(x: number, y: number, color: number): void {
    this.pendingEffects.push({
      id: `fx-${this.effectCounter}`,
      kind: 'tank-destruction',
      x,
      y,
      radius: 48,
      color,
      durationMs: 430,
    });
    this.effectCounter += 1;
  }

  private queueTransientEffect(
    kind: 'bullet-shot' | 'mine-place',
    x: number,
    y: number,
    radius: number,
    color: number,
    durationMs: number,
  ): void {
    this.pendingEffects.push({
      id: `fx-${this.effectCounter}`,
      kind,
      x,
      y,
      radius,
      color,
      durationMs,
    });
    this.effectCounter += 1;
  }

  private processRespawns(): void {
    for (const player of this.players.values()) {
      if (player.isAlive || this.nowMs < player.respawnAtMs) {
        continue;
      }

      const spawn = this.pickAvailableSpawnPoint(player.id);
      if (spawn === undefined) {
        player.respawnAtMs = this.nowMs + 250;
        continue;
      }

      player.isAlive = true;
      player.x = spawn.x;
      player.y = spawn.y;
      player.bodyAngle = -Math.PI / 2;
      player.turretAngle = -Math.PI / 2;
      player.respawnAtMs = 0;
      player.fireCooldownMs = 0;
      player.boostRemainingMs = 0;
      player.boostCooldownMs = 0;
      player.shieldHoldMs = 0;
      player.shieldCooldownMs = 0;
      player.isShieldActive = false;
      player.isChargingShot = false;
      player.chargeMs = 0;
    }
  }

  private getActiveBulletCountForPlayer(playerId: string): number {
    return this.bullets.filter((bullet) => bullet.ownerPlayerId === playerId).length;
  }

  private getChargeRatio(player: PlayerEntity): number {
    if (!player.isChargingShot) {
      return 0;
    }

    const cappedChargeMs = Math.min(player.chargeMs, CHARGED_SHOT_MAX_HOLD_MS);
    const normalized = (cappedChargeMs - CHARGED_SHOT_MIN_HOLD_MS) / (CHARGED_SHOT_MAX_HOLD_MS - CHARGED_SHOT_MIN_HOLD_MS);
    return clamp(normalized, 0, 1);
  }

  private intersectsAnyWall(x: number, y: number, radius: number): boolean {
    for (const wall of this.world.walls) {
      if (circleIntersectsRect(x, y, radius, wall.x, wall.y, wall.width, wall.height)) {
        return true;
      }
    }

    return false;
  }

  private computeBotInput(bot: PlayerEntity, humans: PlayerEntity[]): TankInput {
    const profile = this.getBotDifficultyProfile();
    const target = this.findClosestTarget(bot, humans);
    if (target === undefined) {
      return {
        ...EMPTY_INPUT,
        pointerWorldX: bot.x + Math.cos(bot.bodyAngle) * 120,
        pointerWorldY: bot.y + Math.sin(bot.bodyAngle) * 120,
      };
    }

    const distanceToTarget = distance(bot.x, bot.y, target.x, target.y);
    const headingToTarget = Math.atan2(target.y - bot.y, target.x - bot.x);
    const turretAngleDelta = normalizeAngleRadians(headingToTarget - bot.turretAngle);
    const threat = this.findMostDangerousBullet(bot, profile);
    const shouldDodge = threat !== undefined && Math.random() <= profile.dodgeReactionChance;
    const lineOfFireThreat = this.detectLineOfFireThreat(bot, target, profile);
    const shouldAvoidLineOfFire = lineOfFireThreat !== undefined && Math.random() <= profile.lineOfFireAvoidanceChance;

    let desiredHeading: number;
    if (shouldDodge && threat !== undefined) {
      desiredHeading = this.computeDodgeHeading(bot, threat.bullet, profile);
    } else if (shouldAvoidLineOfFire && lineOfFireThreat !== undefined) {
      desiredHeading = this.computeLineOfFireDodgeHeading(bot, lineOfFireThreat, profile);
    } else {
      const navigationTarget = this.getBotNavigationTarget(bot, target, profile);
      const pathHeading = Math.atan2(navigationTarget.y - bot.y, navigationTarget.x - bot.x);
      desiredHeading = this.computeWallAwareHeading(bot, pathHeading, profile);
    }

    const angleDelta = normalizeAngleRadians(desiredHeading - bot.bodyAngle);
    const absAngleDelta = Math.abs(angleDelta);
    const turnLeft = absAngleDelta > profile.steeringDeadZoneRadians && angleDelta < 0;
    const turnRight = absAngleDelta > profile.steeringDeadZoneRadians && angleDelta > 0;

    const aimOnTarget = Math.abs(turretAngleDelta) < 0.22;
    const hasShotCapacity = this.getActiveBulletCountForPlayer(bot.id) < MAX_ACTIVE_BULLETS_PER_TANK;
    const lineOfSightToTarget = !this.isExplosionBlockedByWall(bot.x, bot.y, target.x, target.y);
    const safeDistanceToFire = distanceToTarget > Math.max(profile.preferredDistanceMin * 0.42, 75);
    const canShootByDistance = distanceToTarget <= profile.maxFireRange;
    const canShootByPrediction = aimOnTarget || distanceToTarget <= profile.maxFireRange * profile.suppressionFireRangeFactor;
    const canShootByDodgeState = !shouldDodge || profile.canShootWhileDodging;
    const fireReady =
      lineOfSightToTarget &&
      safeDistanceToFire &&
      hasShotCapacity &&
      canShootByDistance &&
      canShootByPrediction &&
      canShootByDodgeState;

    const nextShotAtMs = this.botNextShotAtMs.get(bot.id) ?? 0;
    const shouldShootNow = fireReady && this.nowMs >= nextShotAtMs;
    const firePressed = shouldShootNow;
    const fireReleased = shouldShootNow;
    this.botFireHeld.set(bot.id, false);

    if (shouldShootNow) {
      const cooldownMs = this.randomInRange(profile.fireCooldownMs.min, profile.fireCooldownMs.max);
      this.botNextShotAtMs.set(bot.id, this.nowMs + cooldownMs);
    }

    let moveForward = distanceToTarget > profile.preferredDistanceMax;
    let moveBackward = distanceToTarget < profile.preferredDistanceMin;

    if (shouldDodge || shouldAvoidLineOfFire) {
      moveForward = true;
      moveBackward = false;
    } else {
      const pushUntilDistance = profile.preferredDistanceMax * profile.pursuitRangeMultiplier;
      const reverseDistance = profile.preferredDistanceMin * profile.closeReverseDistanceMultiplier;
      moveForward = distanceToTarget > reverseDistance;
      moveBackward = distanceToTarget < reverseDistance;

      if (distanceToTarget > pushUntilDistance) {
        moveForward = true;
        moveBackward = false;
      }
    }

    const inPreferredEngagementBand =
      distanceToTarget >= profile.preferredDistanceMin &&
      distanceToTarget <= profile.preferredDistanceMax;
    const shouldHoldPosition =
      profile.holdWhenOnTarget &&
      aimOnTarget &&
      lineOfSightToTarget &&
      inPreferredEngagementBand;
    const placeMinePressed = this.shouldPlaceMine(bot, target, profile, distanceToTarget, shouldDodge, moveBackward);
    const detonatePressed = this.shouldDetonateOwnedBullet(bot, target, profile);
    const boostPressed =
      shouldDodge ||
      shouldAvoidLineOfFire ||
      (moveForward && distanceToTarget > profile.preferredDistanceMax * profile.chaseBoostDistanceMultiplier);

    return {
      moveForward: shouldHoldPosition ? false : moveForward,
      moveBackward,
      turnLeft,
      turnRight,
      shieldHeld: false,
      firePressed,
      fireHeld: false,
      fireReleased,
      detonatePressed,
      placeMinePressed,
      boostPressed,
      pointerWorldX: target.x,
      pointerWorldY: target.y,
    };
  }

  private shouldPlaceMine(
    bot: PlayerEntity,
    _target: PlayerEntity,
    profile: BotDifficultyProfile,
    distanceToTarget: number,
    shouldDodge: boolean,
    movingBackward: boolean,
  ): boolean {
    const nearTargetDistance = profile.preferredDistanceMin * profile.minePlacementDistanceFactor;
    const tacticalMineDrop = shouldDodge || movingBackward;
    if (!tacticalMineDrop || distanceToTarget > nearTargetDistance) {
      return false;
    }

    const nextMineAt = this.botNextMineAtMs.get(bot.id) ?? 0;
    if (this.nowMs < nextMineAt) {
      return false;
    }

    this.botNextMineAtMs.set(bot.id, this.nowMs + this.randomInRange(profile.minePlacementCooldownMs.min, profile.minePlacementCooldownMs.max));
    return true;
  }

  private shouldDetonateOwnedBullet(bot: PlayerEntity, target: PlayerEntity, profile: BotDifficultyProfile): boolean {
    const oldestOwnedBullet = this.bullets.find((bullet) => bullet.ownerPlayerId === bot.id);
    if (oldestOwnedBullet === undefined) {
      return false;
    }

    const detonationProximityFactor = 0.72;
    const targetDistance = distance(oldestOwnedBullet.x, oldestOwnedBullet.y, target.x, target.y);
    const targetReach = (BULLET_EXPLOSION_RADIUS + target.radius) * detonationProximityFactor + profile.detonationMargin;
    if (targetDistance > targetReach) {
      return false;
    }

    if (this.isExplosionBlockedByWall(oldestOwnedBullet.x, oldestOwnedBullet.y, target.x, target.y)) {
      return false;
    }

    const selfDistance = distance(oldestOwnedBullet.x, oldestOwnedBullet.y, bot.x, bot.y);
    const selfSafeDistance = BULLET_EXPLOSION_RADIUS + bot.radius + profile.selfPreservationMargin;
    if (selfDistance < selfSafeDistance) {
      return false;
    }

    return Math.random() <= profile.detonationTriggerChance;
  }

  private findMostDangerousBullet(bot: PlayerEntity, profile: BotDifficultyProfile): BulletThreat | undefined {
    const dangerRadius = bot.radius + BULLET_RADIUS + profile.dodgeMargin;
    const horizonSeconds = profile.bulletThreatHorizonMs / 1000;
    let bestThreat: BulletThreat | undefined;

    for (const bullet of this.bullets) {
      if (bullet.ownerPlayerId === bot.id) {
        continue;
      }

      const speedSquared = bullet.vx * bullet.vx + bullet.vy * bullet.vy;
      if (speedSquared <= Number.EPSILON) {
        continue;
      }

      const toBotX = bot.x - bullet.x;
      const toBotY = bot.y - bullet.y;
      const towardBot = toBotX * bullet.vx + toBotY * bullet.vy;
      if (towardBot <= 0) {
        continue;
      }

      const closestTime = clamp(towardBot / speedSquared, 0, horizonSeconds);
      const closestX = bullet.x + bullet.vx * closestTime;
      const closestY = bullet.y + bullet.vy * closestTime;
      const distanceAtClosest = distance(bot.x, bot.y, closestX, closestY);
      if (distanceAtClosest > dangerRadius) {
        continue;
      }

      if (bestThreat === undefined || closestTime < bestThreat.timeToClosest) {
        bestThreat = { bullet, timeToClosest: closestTime };
      }
    }

    return bestThreat;
  }

  private computeDodgeHeading(bot: PlayerEntity, incomingBullet: BulletEntity, profile: BotDifficultyProfile): number {
    const speed = Math.sqrt(incomingBullet.vx * incomingBullet.vx + incomingBullet.vy * incomingBullet.vy);
    if (speed <= Number.EPSILON) {
      return bot.bodyAngle;
    }

    const directionX = incomingBullet.vx / speed;
    const directionY = incomingBullet.vy / speed;
    const leftPerpendicularX = -directionY;
    const leftPerpendicularY = directionX;
    const rightPerpendicularX = directionY;
    const rightPerpendicularY = -directionX;

    const leftScore = this.evaluateDirectionClearance(bot, leftPerpendicularX, leftPerpendicularY, profile);
    const rightScore = this.evaluateDirectionClearance(bot, rightPerpendicularX, rightPerpendicularY, profile);

    return leftScore >= rightScore
      ? Math.atan2(leftPerpendicularY, leftPerpendicularX)
      : Math.atan2(rightPerpendicularY, rightPerpendicularX);
  }

  private detectLineOfFireThreat(bot: PlayerEntity, target: PlayerEntity, profile: BotDifficultyProfile): LineOfFireThreat | undefined {
    const aimDirectionX = Math.cos(target.turretAngle);
    const aimDirectionY = Math.sin(target.turretAngle);
    const fromPlayerToBotX = bot.x - target.x;
    const fromPlayerToBotY = bot.y - target.y;
    const forwardDistance = fromPlayerToBotX * aimDirectionX + fromPlayerToBotY * aimDirectionY;

    if (forwardDistance <= 0 || forwardDistance > profile.lineOfFireDangerMaxDistance) {
      return undefined;
    }

    const lateralDistance = Math.abs(fromPlayerToBotX * aimDirectionY - fromPlayerToBotY * aimDirectionX);
    const dangerLaneHalfWidth = bot.radius + BULLET_RADIUS + profile.lineOfFireMargin;
    if (lateralDistance > dangerLaneHalfWidth) {
      return undefined;
    }

    if (this.isExplosionBlockedByWall(target.x, target.y, bot.x, bot.y)) {
      return undefined;
    }

    return { aimDirectionX, aimDirectionY };
  }

  private computeLineOfFireDodgeHeading(bot: PlayerEntity, threat: LineOfFireThreat, profile: BotDifficultyProfile): number {
    const leftX = -threat.aimDirectionY;
    const leftY = threat.aimDirectionX;
    const rightX = threat.aimDirectionY;
    const rightY = -threat.aimDirectionX;

    const leftScore = this.evaluateDirectionClearance(bot, leftX, leftY, profile);
    const rightScore = this.evaluateDirectionClearance(bot, rightX, rightY, profile);

    return leftScore >= rightScore ? Math.atan2(leftY, leftX) : Math.atan2(rightY, rightX);
  }

  private computeWallAwareHeading(bot: PlayerEntity, desiredHeading: number, profile: BotDifficultyProfile): number {
    const frontBlocked = this.isDirectionBlocked(bot, desiredHeading, profile.wallProbeDistance);
    if (!frontBlocked) {
      return desiredHeading;
    }

    const leftHeading = normalizeAngleRadians(desiredHeading - profile.wallAvoidanceTurnBiasRadians);
    const rightHeading = normalizeAngleRadians(desiredHeading + profile.wallAvoidanceTurnBiasRadians);
    const leftScore = this.evaluateHeadingClearance(bot, leftHeading, profile);
    const rightScore = this.evaluateHeadingClearance(bot, rightHeading, profile);

    return leftScore >= rightScore ? leftHeading : rightHeading;
  }

  private evaluateDirectionClearance(bot: PlayerEntity, directionX: number, directionY: number, profile: BotDifficultyProfile): number {
    const heading = Math.atan2(directionY, directionX);
    return this.evaluateHeadingClearance(bot, heading, profile);
  }

  private evaluateHeadingClearance(bot: PlayerEntity, heading: number, profile: BotDifficultyProfile): number {
    const primaryProbe = this.isDirectionBlocked(bot, heading, profile.wallProbeDistance);
    const secondaryProbe = this.isDirectionBlocked(bot, heading, profile.wallProbeDistance * 0.55);

    if (primaryProbe) {
      return 0;
    }
    if (secondaryProbe) {
      return 0.5;
    }
    return 1;
  }

  private isDirectionBlocked(bot: PlayerEntity, heading: number, probeDistance: number): boolean {
    const probeX = bot.x + Math.cos(heading) * probeDistance;
    const probeY = bot.y + Math.sin(heading) * probeDistance;
    return this.intersectsAnyWall(probeX, probeY, bot.radius);
  }

  private getBotDifficultyProfile(): BotDifficultyProfile {
    const configuredDifficulty = parseBotDifficulty(ENEMY_AI_DIFFICULTY);
    return BOT_DIFFICULTY_PROFILES[configuredDifficulty];
  }

  private getBotNavigationTarget(bot: PlayerEntity, target: PlayerEntity, profile: BotDifficultyProfile): { x: number; y: number } {
    const waypoints = this.botPathWaypoints.get(bot.id) ?? [];
    const currentWaypointIndex = this.botPathWaypointIndex.get(bot.id) ?? 0;

    const currentWaypoint = waypoints[currentWaypointIndex];
    if (currentWaypoint !== undefined) {
      const reachedWaypoint = distance(bot.x, bot.y, currentWaypoint.x, currentWaypoint.y) <= TANK_RADIUS * 0.9;
      if (reachedWaypoint) {
        this.botPathWaypointIndex.set(bot.id, currentWaypointIndex + 1);
      }
    }

    if (this.shouldReplanPath(bot, target, profile, currentWaypointIndex)) {
      this.planPathForBot(bot, target, profile);
    }

    const refreshedPath = this.botPathWaypoints.get(bot.id) ?? [];
    const refreshedIndex = this.botPathWaypointIndex.get(bot.id) ?? 0;
    const waypoint = refreshedPath[refreshedIndex];

    if (waypoint === undefined) {
      return { x: target.x, y: target.y };
    }

    return waypoint;
  }

  private shouldReplanPath(
    bot: PlayerEntity,
    target: PlayerEntity,
    profile: BotDifficultyProfile,
    waypointIndex: number,
  ): boolean {
    const nextPathPlanAtMs = this.botNextPathPlanAtMs.get(bot.id) ?? 0;
    if (this.nowMs >= nextPathPlanAtMs) {
      return true;
    }

    const waypoints = this.botPathWaypoints.get(bot.id) ?? [];
    if (waypointIndex >= waypoints.length) {
      return true;
    }

    const nextWaypoint = waypoints[waypointIndex];
    if (nextWaypoint === undefined) {
      return true;
    }

    const directRouteBlocked = this.isExplosionBlockedByWall(bot.x, bot.y, target.x, target.y);
    const waypointRouteBlocked = this.isExplosionBlockedByWall(bot.x, bot.y, nextWaypoint.x, nextWaypoint.y);

    if (!directRouteBlocked) {
      return false;
    }

    if (waypointRouteBlocked) {
      return true;
    }

    const distanceToTarget = distance(bot.x, bot.y, target.x, target.y);
    return distanceToTarget < profile.preferredDistanceMax;
  }

  private planPathForBot(bot: PlayerEntity, target: PlayerEntity, profile: BotDifficultyProfile): void {
    const grid = this.getPathGrid(profile.pathCellSize);
    const path = findGridPath(grid, { x: bot.x, y: bot.y }, { x: target.x, y: target.y });

    const trimmedPath = path.slice(1).filter((point) => !this.intersectsAnyWall(point.x, point.y, bot.radius));
    this.botPathWaypoints.set(bot.id, trimmedPath);
    this.botPathWaypointIndex.set(bot.id, 0);
    this.botNextPathPlanAtMs.set(bot.id, this.nowMs + this.randomInRange(profile.pathReplanMs.min, profile.pathReplanMs.max));
  }

  private getPathGrid(cellSize: number): NavigationGrid {
    const cached = this.pathGridCache.get(cellSize);
    if (cached !== undefined) {
      return cached;
    }

    const grid = buildNavigationGrid(this.world.width, this.world.height, this.world.walls, TANK_RADIUS, cellSize);
    this.pathGridCache.set(cellSize, grid);
    return grid;
  }

  private randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private findClosestTarget(bot: PlayerEntity, humans: PlayerEntity[]): PlayerEntity | undefined {
    let best: PlayerEntity | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const human of humans) {
      const candidateDistance = distance(bot.x, bot.y, human.x, human.y);
      if (candidateDistance < bestDistance) {
        bestDistance = candidateDistance;
        best = human;
      }
    }

    return best;
  }

  private resolveTankTypeForNewPlayer(isBot: boolean): TankType {
    if (!isBot) {
      return PLAYER_TANK_TYPE;
    }

    const index = this.playerJoinCounter % ALL_TANK_TYPES.length;
    return ALL_TANK_TYPES[index];
  }

  private pickAvailableSpawnPoint(excludedPlayerId: string): { x: number; y: number } | undefined {
    const points = this.getCornerSpawnPoints();

    const startIndex = this.tick % points.length;
    for (let offset = 0; offset < points.length; offset += 1) {
      const spawn = points[(startIndex + offset) % points.length];
      if (!this.isSpawnPointBlocked(spawn.x, spawn.y, excludedPlayerId)) {
        return spawn;
      }
    }

    return undefined;
  }

  private getCornerSpawnPoints(): Array<{ x: number; y: number }> {
    const p = SPAWN_CORNER_PADDING;

    return [
      { x: this.bounds.left + p, y: this.bounds.top + p },
      { x: this.bounds.right - p, y: this.bounds.top + p },
      { x: this.bounds.left + p, y: this.bounds.bottom - p },
      { x: this.bounds.right - p, y: this.bounds.bottom - p },
    ];
  }

  private isSpawnPointBlocked(x: number, y: number, excludedPlayerId: string): boolean {
    for (const wall of this.world.walls) {
      const closestX = clamp(x, wall.x, wall.x + wall.width);
      const closestY = clamp(y, wall.y, wall.y + wall.height);
      const distanceSquared = (x - closestX) * (x - closestX) + (y - closestY) * (y - closestY);
      if (distanceSquared < TANK_RADIUS * TANK_RADIUS) {
        return true;
      }
    }

    for (const player of this.players.values()) {
      if (!player.isAlive || player.id === excludedPlayerId) {
        continue;
      }

      const minDistance = TANK_RADIUS + player.radius;
      if (distance(player.x, player.y, x, y) < minDistance) {
        return true;
      }
    }

    return false;
  }

  private computePlayableBounds(): PlayableBounds {
    const width = this.world.width;
    const height = this.world.height;
    const epsilon = 0.001;
    const fullWidthThreshold = width * 0.95;
    const fullHeightThreshold = height * 0.95;

    let leftInset = 0;
    let rightInset = 0;
    let topInset = 0;
    let bottomInset = 0;

    for (const wall of this.world.walls) {
      const touchesLeft = Math.abs(wall.x) <= epsilon;
      const touchesTop = Math.abs(wall.y) <= epsilon;
      const touchesRight = Math.abs(wall.x + wall.width - width) <= epsilon;
      const touchesBottom = Math.abs(wall.y + wall.height - height) <= epsilon;

      const isVerticalBorder = wall.height >= fullHeightThreshold;
      const isHorizontalBorder = wall.width >= fullWidthThreshold;

      if (touchesLeft && isVerticalBorder) {
        leftInset = Math.max(leftInset, wall.width);
      }
      if (touchesTop && isHorizontalBorder) {
        topInset = Math.max(topInset, wall.height);
      }
      if (touchesRight && isVerticalBorder) {
        rightInset = Math.max(rightInset, wall.width);
      }
      if (touchesBottom && isHorizontalBorder) {
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
}

interface GridCell {
  column: number;
  row: number;
}

interface NavigationGrid {
  width: number;
  height: number;
  cellSize: number;
  walkable: boolean[];
}

function parseBotDifficulty(value: string): BotDifficulty {
  switch (value) {
    case 'easy':
    case 'medium':
    case 'hard':
      return value;
    default:
      return 'medium';
  }
}

function buildNavigationGrid(
  width: number,
  height: number,
  walls: ReadonlyArray<{ x: number; y: number; width: number; height: number }>,
  tankRadius: number,
  cellSize: number,
): NavigationGrid {
  const columns = Math.max(1, Math.floor(width / cellSize));
  const rows = Math.max(1, Math.floor(height / cellSize));
  const walkable = new Array<boolean>(columns * rows).fill(true);

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const center = cellToWorld(column, row, cellSize);
      if (intersectsAnyWall(center.x, center.y, tankRadius, walls)) {
        walkable[row * columns + column] = false;
      }
    }
  }

  return {
    width: columns,
    height: rows,
    cellSize,
    walkable,
  };
}

function findGridPath(grid: NavigationGrid, startWorld: { x: number; y: number }, goalWorld: { x: number; y: number }): Array<{ x: number; y: number }> {
  const start = clampToWalkable(grid, worldToCell(startWorld.x, startWorld.y, grid.cellSize));
  const goal = clampToWalkable(grid, worldToCell(goalWorld.x, goalWorld.y, grid.cellSize));

  if (start === undefined || goal === undefined) {
    return [];
  }

  const startIndex = toIndex(start.column, start.row, grid.width);
  const goalIndex = toIndex(goal.column, goal.row, grid.width);

  const openSet = new Set<number>([startIndex]);
  const cameFrom = new Map<number, number>();
  const gScore = new Map<number, number>([[startIndex, 0]]);
  const fScore = new Map<number, number>([[startIndex, heuristic(start, goal)]]);

  while (openSet.size > 0) {
    const current = getBestOpenNode(openSet, fScore);
    if (current === goalIndex) {
      return reconstructPath(cameFrom, current, grid);
    }

    openSet.delete(current);
    const currentCell = toCell(current, grid.width);

    for (const neighborCell of getNeighbors(currentCell, grid.width, grid.height)) {
      if (!isWalkable(grid, neighborCell.column, neighborCell.row)) {
        continue;
      }

      const neighborIndex = toIndex(neighborCell.column, neighborCell.row, grid.width);
      const tentativeG = (gScore.get(current) ?? Number.POSITIVE_INFINITY) +
        Math.hypot(neighborCell.column - currentCell.column, neighborCell.row - currentCell.row);

      if (tentativeG >= (gScore.get(neighborIndex) ?? Number.POSITIVE_INFINITY)) {
        continue;
      }

      cameFrom.set(neighborIndex, current);
      gScore.set(neighborIndex, tentativeG);
      fScore.set(neighborIndex, tentativeG + heuristic(neighborCell, goal));
      openSet.add(neighborIndex);
    }
  }

  return [];
}

function reconstructPath(cameFrom: Map<number, number>, endIndex: number, grid: NavigationGrid): Array<{ x: number; y: number }> {
  const totalPath: number[] = [endIndex];
  let current = endIndex;

  while (cameFrom.has(current)) {
    const parent = cameFrom.get(current);
    if (parent === undefined) {
      break;
    }
    current = parent;
    totalPath.push(current);
  }

  totalPath.reverse();
  return totalPath.map((index) => {
    const cell = toCell(index, grid.width);
    return cellToWorld(cell.column, cell.row, grid.cellSize);
  });
}

function getBestOpenNode(openSet: Set<number>, fScore: Map<number, number>): number {
  let bestNode: number | undefined;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const node of openSet) {
    const score = fScore.get(node) ?? Number.POSITIVE_INFINITY;
    if (score < bestScore) {
      bestScore = score;
      bestNode = node;
    }
  }

  return bestNode ?? [...openSet][0];
}

function getNeighbors(cell: GridCell, width: number, height: number): GridCell[] {
  const neighbors: GridCell[] = [];

  for (let dRow = -1; dRow <= 1; dRow += 1) {
    for (let dColumn = -1; dColumn <= 1; dColumn += 1) {
      if (dRow === 0 && dColumn === 0) {
        continue;
      }

      const nextColumn = cell.column + dColumn;
      const nextRow = cell.row + dRow;

      if (nextColumn < 0 || nextRow < 0 || nextColumn >= width || nextRow >= height) {
        continue;
      }

      neighbors.push({ column: nextColumn, row: nextRow });
    }
  }

  return neighbors;
}

function clampToWalkable(grid: NavigationGrid, cell: GridCell): GridCell | undefined {
  if (isWalkable(grid, cell.column, cell.row)) {
    return cell;
  }

  const maxRadius = Math.max(grid.width, grid.height);
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let row = cell.row - radius; row <= cell.row + radius; row += 1) {
      for (let column = cell.column - radius; column <= cell.column + radius; column += 1) {
        if (column < 0 || row < 0 || column >= grid.width || row >= grid.height) {
          continue;
        }

        if (isWalkable(grid, column, row)) {
          return { column, row };
        }
      }
    }
  }

  return undefined;
}

function worldToCell(worldX: number, worldY: number, cellSize: number): GridCell {
  return {
    column: Math.max(0, Math.floor(worldX / cellSize)),
    row: Math.max(0, Math.floor(worldY / cellSize)),
  };
}

function cellToWorld(column: number, row: number, cellSize: number): { x: number; y: number } {
  return {
    x: (column + 0.5) * cellSize,
    y: (row + 0.5) * cellSize,
  };
}

function toIndex(column: number, row: number, width: number): number {
  return row * width + column;
}

function toCell(index: number, width: number): GridCell {
  return {
    column: index % width,
    row: Math.floor(index / width),
  };
}

function isWalkable(grid: NavigationGrid, column: number, row: number): boolean {
  return grid.walkable[toIndex(column, row, grid.width)] === true;
}

function heuristic(a: GridCell, b: GridCell): number {
  return Math.hypot(a.column - b.column, a.row - b.row);
}

function intersectsAnyWall(
  x: number,
  y: number,
  radius: number,
  walls: ReadonlyArray<{ x: number; y: number; width: number; height: number }>,
): boolean {
  for (const wall of walls) {
    const closestX = clamp(x, wall.x, wall.x + wall.width);
    const closestY = clamp(y, wall.y, wall.y + wall.height);
    const distanceSquared = (x - closestX) * (x - closestX) + (y - closestY) * (y - closestY);

    if (distanceSquared < radius * radius) {
      return true;
    }
  }

  return false;
}

function getTankBulletColor(tankType: TankType): number {
  switch (tankType) {
    case 'PolPot':
      return 0x22c55e;
    case 'Hightillery':
      return 0xdc2626;
    case 'SSugar':
      return 0xf8fafc;
    case 'Fantanyl':
      return 0xfacc15;
    default:
      return 0x22c55e;
  }
}

function sanitizeInput(input: TankInput): TankInput {
  return {
    moveForward: Boolean(input.moveForward),
    moveBackward: Boolean(input.moveBackward),
    turnLeft: Boolean(input.turnLeft),
    turnRight: Boolean(input.turnRight),
    shieldHeld: Boolean(input.shieldHeld),
    firePressed: Boolean(input.firePressed),
    fireHeld: Boolean(input.fireHeld),
    fireReleased: Boolean(input.fireReleased),
    detonatePressed: Boolean(input.detonatePressed),
    placeMinePressed: Boolean(input.placeMinePressed),
    boostPressed: Boolean(input.boostPressed),
    pointerWorldX: Number.isFinite(input.pointerWorldX) ? input.pointerWorldX : 0,
    pointerWorldY: Number.isFinite(input.pointerWorldY) ? input.pointerWorldY : 0,
  };
}

function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function segmentIntersectsRectangle(
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

  const xResult = clipSegmentAxis(startX, dx, rect.x, rect.x + rect.width, tMin, tMax);
  if (xResult === undefined) {
    return false;
  }
  tMin = xResult.tMin;
  tMax = xResult.tMax;

  const yResult = clipSegmentAxis(startY, dy, rect.y, rect.y + rect.height, tMin, tMax);
  if (yResult === undefined) {
    return false;
  }

  tMin = yResult.tMin;
  tMax = yResult.tMax;
  return tMin <= tMax && tMax >= 0 && tMin <= 1;
}

function clipSegmentAxis(
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

  let t1 = (min - start) / delta;
  let t2 = (max - start) / delta;

  if (t1 > t2) {
    const temp = t1;
    t1 = t2;
    t2 = temp;
  }

  const tMin = Math.max(currentTMin, t1);
  const tMax = Math.min(currentTMax, t2);

  if (tMin > tMax) {
    return undefined;
  }

  return { tMin, tMax };
}
