import { clamp, distance, normalizeAngleRadians } from '../../shared/math.js';
import { EMPTY_INPUT, type TankInput } from '../../shared/types.js';
import { DEFAULT_BULLET_RADIUS, type BulletEntity } from './bullet.js';
import type { NavigationGrid } from './grid.js';
import { buildNavigationGrid, findGridPath } from './grid.js';
import type { PlayerEntity } from './player.js';
import type { BotDifficultyProfile } from './bot.js';
import type { SimulationContext } from '../systems/simulationContext.js';

interface BulletThreat {
  bullet: BulletEntity;
  timeToClosest: number;
}

interface LineOfFireThreat {
  aimDirectionX: number;
  aimDirectionY: number;
}

export class BotController {
  private readonly botNextShotAtMs = new Map<string, number>();
  private readonly botNextMineAtMs = new Map<string, number>();
  private readonly botNextPathPlanAtMs = new Map<string, number>();
  private readonly botPathWaypointIndex = new Map<string, number>();
  private readonly botPathWaypoints = new Map<string, Array<{ x: number; y: number }>>();
  private readonly pathGridCache = new Map<string, NavigationGrid>();

  public onBotAdded(botId: string): void {
    this.botNextShotAtMs.set(botId, 0);
    this.botNextMineAtMs.set(botId, 0);
    this.botNextPathPlanAtMs.set(botId, 0);
    this.botPathWaypointIndex.set(botId, 0);
    this.botPathWaypoints.set(botId, []);
  }

  public onBotRemoved(botId: string): void {
    this.botNextShotAtMs.delete(botId);
    this.botNextMineAtMs.delete(botId);
    this.botNextPathPlanAtMs.delete(botId);
    this.botPathWaypointIndex.delete(botId);
    this.botPathWaypoints.delete(botId);
  }

  public computeInput(
    bot: PlayerEntity,
    humans: PlayerEntity[],
    profile: BotDifficultyProfile,
    context: SimulationContext,
  ): TankInput {
    const target = this.findClosestTarget(bot, humans);
    if (target === undefined) {
      return {
        ...EMPTY_INPUT,
        pointerWorldX: bot.tank.x + Math.cos(bot.tank.bodyAngle) * 120,
        pointerWorldY: bot.tank.y + Math.sin(bot.tank.bodyAngle) * 120,
      };
    }

    const distanceToTarget = distance(bot.tank.x, bot.tank.y, target.tank.x, target.tank.y);
    const headingToTarget = Math.atan2(target.tank.y - bot.tank.y, target.tank.x - bot.tank.x);
    const turretAngleDelta = normalizeAngleRadians(headingToTarget - bot.tank.turretAngle);
    const threat = this.findMostDangerousBullet(bot, profile, context.bullets);
    const shouldDodge = threat !== undefined && Math.random() <= profile.dodgeReactionChance;
    const lineOfFireThreat = this.detectLineOfFireThreat(bot, target, profile, context.isExplosionBlockedByWall);
    const shouldAvoidLineOfFire = lineOfFireThreat !== undefined && Math.random() <= profile.lineOfFireAvoidanceChance;

    let desiredHeading: number;
    if (shouldDodge && threat !== undefined) {
      desiredHeading = this.computeDodgeHeading(bot, threat.bullet, profile, context.intersectsAnyWall);
    } else if (shouldAvoidLineOfFire && lineOfFireThreat !== undefined) {
      desiredHeading = this.computeLineOfFireDodgeHeading(bot, lineOfFireThreat, profile, context.intersectsAnyWall);
    } else {
      const navigationTarget = this.getBotNavigationTarget(bot, target, profile, context);
      const pathHeading = Math.atan2(navigationTarget.y - bot.tank.y, navigationTarget.x - bot.tank.x);
      desiredHeading = this.computeWallAwareHeading(bot, pathHeading, profile, context.intersectsAnyWall);
    }

    const angleDelta = normalizeAngleRadians(desiredHeading - bot.tank.bodyAngle);
    const absAngleDelta = Math.abs(angleDelta);
    const turnLeft = absAngleDelta > profile.steeringDeadZoneRadians && angleDelta < 0;
    const turnRight = absAngleDelta > profile.steeringDeadZoneRadians && angleDelta > 0;

    const aimOnTarget = Math.abs(turretAngleDelta) < 0.22;
    const hasShotCapacity =
      context.getActiveBulletCountForPlayer(bot.id) < context.getMaxActiveBulletsForPlayer(bot.id);
    const lineOfSightToTarget = !context.isExplosionBlockedByWall(bot.tank.x, bot.tank.y, target.tank.x, target.tank.y);
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
    const shouldShootNow = fireReady && context.nowMs >= nextShotAtMs;
    const firePressed = shouldShootNow;
    const fireReleased = shouldShootNow;

    if (shouldShootNow) {
      const cooldownMs = this.randomInRange(profile.fireCooldownMs.min, profile.fireCooldownMs.max);
      this.botNextShotAtMs.set(bot.id, context.nowMs + cooldownMs);
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
    const placeMinePressed = this.shouldPlaceMine(bot, profile, distanceToTarget, shouldDodge, moveBackward, context.nowMs);
    const detonatePressed = this.shouldDetonateOwnedBullet(bot, target, profile, context.bullets, context.isExplosionBlockedByWall);
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
      pointerWorldX: target.tank.x,
      pointerWorldY: target.tank.y,
    };
  }

  private shouldPlaceMine(
    bot: PlayerEntity,
    profile: BotDifficultyProfile,
    distanceToTarget: number,
    shouldDodge: boolean,
    movingBackward: boolean,
    nowMs: number,
  ): boolean {
    const nearTargetDistance = profile.preferredDistanceMin * profile.minePlacementDistanceFactor;
    const tacticalMineDrop = shouldDodge || movingBackward;
    if (!tacticalMineDrop || distanceToTarget > nearTargetDistance) {
      return false;
    }

    const nextMineAt = this.botNextMineAtMs.get(bot.id) ?? 0;
    if (nowMs < nextMineAt) {
      return false;
    }

    this.botNextMineAtMs.set(bot.id, nowMs + this.randomInRange(profile.minePlacementCooldownMs.min, profile.minePlacementCooldownMs.max));
    return true;
  }

  private shouldDetonateOwnedBullet(
    bot: PlayerEntity,
    target: PlayerEntity,
    profile: BotDifficultyProfile,
    bullets: ReadonlyArray<BulletEntity>,
    isExplosionBlockedByWall: (startX: number, startY: number, endX: number, endY: number) => boolean,
  ): boolean {
    const oldestOwnedBullet = bullets.find((bullet) => bullet.ownerPlayerId === bot.id);
    if (oldestOwnedBullet === undefined) {
      return false;
    }

    const detonationProximityFactor = 0.72;
    const targetDistance = distance(oldestOwnedBullet.x, oldestOwnedBullet.y, target.tank.x, target.tank.y);
    const targetReach = (oldestOwnedBullet.explosionRadius + target.tank.radius)
      * detonationProximityFactor + profile.detonationMargin;
    if (targetDistance > targetReach) {
      return false;
    }

    if (isExplosionBlockedByWall(oldestOwnedBullet.x, oldestOwnedBullet.y, target.tank.x, target.tank.y)) {
      return false;
    }

    const selfDistance = distance(oldestOwnedBullet.x, oldestOwnedBullet.y, bot.tank.x, bot.tank.y);
    const selfSafeDistance = oldestOwnedBullet.explosionRadius + bot.tank.radius + profile.selfPreservationMargin;
    if (selfDistance < selfSafeDistance) {
      return false;
    }

    return Math.random() <= profile.detonationTriggerChance;
  }

  private findMostDangerousBullet(
    bot: PlayerEntity,
    profile: BotDifficultyProfile,
    bullets: ReadonlyArray<BulletEntity>,
  ): BulletThreat | undefined {
    const dangerRadius = bot.tank.radius + DEFAULT_BULLET_RADIUS + profile.dodgeMargin;
    const horizonSeconds = profile.bulletThreatHorizonMs / 1000;
    let bestThreat: BulletThreat | undefined;

    for (const bullet of bullets) {
      if (bullet.ownerPlayerId === bot.id) {
        continue;
      }

      const speedSquared = bullet.vx * bullet.vx + bullet.vy * bullet.vy;
      if (speedSquared <= Number.EPSILON) {
        continue;
      }

      const toBotX = bot.tank.x - bullet.x;
      const toBotY = bot.tank.y - bullet.y;
      const towardBot = toBotX * bullet.vx + toBotY * bullet.vy;
      if (towardBot <= 0) {
        continue;
      }

      const closestTime = clamp(towardBot / speedSquared, 0, horizonSeconds);
      const closestX = bullet.x + bullet.vx * closestTime;
      const closestY = bullet.y + bullet.vy * closestTime;
      const distanceAtClosest = distance(bot.tank.x, bot.tank.y, closestX, closestY);
      if (distanceAtClosest > dangerRadius) {
        continue;
      }

      if (bestThreat === undefined || closestTime < bestThreat.timeToClosest) {
        bestThreat = { bullet, timeToClosest: closestTime };
      }
    }

    return bestThreat;
  }

  private computeDodgeHeading(
    bot: PlayerEntity,
    incomingBullet: BulletEntity,
    profile: BotDifficultyProfile,
    intersectsAnyWall: (x: number, y: number, radius: number) => boolean,
  ): number {
    const speed = Math.sqrt(incomingBullet.vx * incomingBullet.vx + incomingBullet.vy * incomingBullet.vy);
    if (speed <= Number.EPSILON) {
      return bot.tank.bodyAngle;
    }

    const directionX = incomingBullet.vx / speed;
    const directionY = incomingBullet.vy / speed;
    const leftPerpendicularX = -directionY;
    const leftPerpendicularY = directionX;
    const rightPerpendicularX = directionY;
    const rightPerpendicularY = -directionX;

    const leftScore = this.evaluateDirectionClearance(bot, leftPerpendicularX, leftPerpendicularY, profile, intersectsAnyWall);
    const rightScore = this.evaluateDirectionClearance(bot, rightPerpendicularX, rightPerpendicularY, profile, intersectsAnyWall);

    return leftScore >= rightScore
      ? Math.atan2(leftPerpendicularY, leftPerpendicularX)
      : Math.atan2(rightPerpendicularY, rightPerpendicularX);
  }

  private detectLineOfFireThreat(
    bot: PlayerEntity,
    target: PlayerEntity,
    profile: BotDifficultyProfile,
    isExplosionBlockedByWall: (startX: number, startY: number, endX: number, endY: number) => boolean,
  ): LineOfFireThreat | undefined {
    const aimDirectionX = Math.cos(target.tank.turretAngle);
    const aimDirectionY = Math.sin(target.tank.turretAngle);
    const fromPlayerToBotX = bot.tank.x - target.tank.x;
    const fromPlayerToBotY = bot.tank.y - target.tank.y;
    const forwardDistance = fromPlayerToBotX * aimDirectionX + fromPlayerToBotY * aimDirectionY;

    if (forwardDistance <= 0 || forwardDistance > profile.lineOfFireDangerMaxDistance) {
      return undefined;
    }

    const lateralDistance = Math.abs(fromPlayerToBotX * aimDirectionY - fromPlayerToBotY * aimDirectionX);
    const dangerLaneHalfWidth = bot.tank.radius + DEFAULT_BULLET_RADIUS + profile.lineOfFireMargin;
    if (lateralDistance > dangerLaneHalfWidth) {
      return undefined;
    }

    if (isExplosionBlockedByWall(target.tank.x, target.tank.y, bot.tank.x, bot.tank.y)) {
      return undefined;
    }

    return { aimDirectionX, aimDirectionY };
  }

  private computeLineOfFireDodgeHeading(
    bot: PlayerEntity,
    threat: LineOfFireThreat,
    profile: BotDifficultyProfile,
    intersectsAnyWall: (x: number, y: number, radius: number) => boolean,
  ): number {
    const leftX = -threat.aimDirectionY;
    const leftY = threat.aimDirectionX;
    const rightX = threat.aimDirectionY;
    const rightY = -threat.aimDirectionX;

    const leftScore = this.evaluateDirectionClearance(bot, leftX, leftY, profile, intersectsAnyWall);
    const rightScore = this.evaluateDirectionClearance(bot, rightX, rightY, profile, intersectsAnyWall);

    return leftScore >= rightScore ? Math.atan2(leftY, leftX) : Math.atan2(rightY, rightX);
  }

  private computeWallAwareHeading(
    bot: PlayerEntity,
    desiredHeading: number,
    profile: BotDifficultyProfile,
    intersectsAnyWall: (x: number, y: number, radius: number) => boolean,
  ): number {
    const frontBlocked = this.isDirectionBlocked(bot, desiredHeading, profile.wallProbeDistance, intersectsAnyWall);
    if (!frontBlocked) {
      return desiredHeading;
    }

    const leftHeading = normalizeAngleRadians(desiredHeading - profile.wallAvoidanceTurnBiasRadians);
    const rightHeading = normalizeAngleRadians(desiredHeading + profile.wallAvoidanceTurnBiasRadians);
    const leftScore = this.evaluateHeadingClearance(bot, leftHeading, profile, intersectsAnyWall);
    const rightScore = this.evaluateHeadingClearance(bot, rightHeading, profile, intersectsAnyWall);

    return leftScore >= rightScore ? leftHeading : rightHeading;
  }

  private evaluateDirectionClearance(
    bot: PlayerEntity,
    directionX: number,
    directionY: number,
    profile: BotDifficultyProfile,
    intersectsAnyWall: (x: number, y: number, radius: number) => boolean,
  ): number {
    const heading = Math.atan2(directionY, directionX);
    return this.evaluateHeadingClearance(bot, heading, profile, intersectsAnyWall);
  }

  private evaluateHeadingClearance(
    bot: PlayerEntity,
    heading: number,
    profile: BotDifficultyProfile,
    intersectsAnyWall: (x: number, y: number, radius: number) => boolean,
  ): number {
    const primaryProbe = this.isDirectionBlocked(bot, heading, profile.wallProbeDistance, intersectsAnyWall);
    const secondaryProbe = this.isDirectionBlocked(bot, heading, profile.wallProbeDistance * 0.55, intersectsAnyWall);

    if (primaryProbe) {
      return 0;
    }
    if (secondaryProbe) {
      return 0.5;
    }
    return 1;
  }

  private isDirectionBlocked(
    bot: PlayerEntity,
    heading: number,
    probeDistance: number,
    intersectsAnyWall: (x: number, y: number, radius: number) => boolean,
  ): boolean {
    const probeX = bot.tank.x + Math.cos(heading) * probeDistance;
    const probeY = bot.tank.y + Math.sin(heading) * probeDistance;
    return intersectsAnyWall(probeX, probeY, bot.tank.radius);
  }

  private getBotNavigationTarget(
    bot: PlayerEntity,
    target: PlayerEntity,
    profile: BotDifficultyProfile,
    context: SimulationContext,
  ): { x: number; y: number } {
    const waypoints = this.botPathWaypoints.get(bot.id) ?? [];
    const currentWaypointIndex = this.botPathWaypointIndex.get(bot.id) ?? 0;

    const currentWaypoint = waypoints[currentWaypointIndex];
    if (currentWaypoint !== undefined) {
      const reachedWaypoint = distance(bot.tank.x, bot.tank.y, currentWaypoint.x, currentWaypoint.y) <= bot.tank.radius * 0.9;
      if (reachedWaypoint) {
        this.botPathWaypointIndex.set(bot.id, currentWaypointIndex + 1);
      }
    }

    if (this.shouldReplanPath(bot, target, profile, currentWaypointIndex, context)) {
      this.planPathForBot(bot, target, profile, context);
    }

    const refreshedPath = this.botPathWaypoints.get(bot.id) ?? [];
    const refreshedIndex = this.botPathWaypointIndex.get(bot.id) ?? 0;
    const waypoint = refreshedPath[refreshedIndex];

    if (waypoint === undefined) {
      return { x: target.tank.x, y: target.tank.y };
    }

    return waypoint;
  }

  private shouldReplanPath(
    bot: PlayerEntity,
    target: PlayerEntity,
    profile: BotDifficultyProfile,
    waypointIndex: number,
    context: SimulationContext,
  ): boolean {
    const nextPathPlanAtMs = this.botNextPathPlanAtMs.get(bot.id) ?? 0;
    if (context.nowMs >= nextPathPlanAtMs) {
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

    const directRouteBlocked = context.isExplosionBlockedByWall(bot.tank.x, bot.tank.y, target.tank.x, target.tank.y);
    const waypointRouteBlocked = context.isExplosionBlockedByWall(bot.tank.x, bot.tank.y, nextWaypoint.x, nextWaypoint.y);

    if (!directRouteBlocked) {
      return false;
    }

    if (waypointRouteBlocked) {
      return true;
    }

    const distanceToTarget = distance(bot.tank.x, bot.tank.y, target.tank.x, target.tank.y);
    return distanceToTarget < profile.preferredDistanceMax;
  }

  private planPathForBot(
    bot: PlayerEntity,
    target: PlayerEntity,
    profile: BotDifficultyProfile,
    context: SimulationContext,
  ): void {
    const grid = this.getPathGrid(profile.pathCellSize, bot.tank.radius, context.world);
    const path = findGridPath(grid, { x: bot.tank.x, y: bot.tank.y }, { x: target.tank.x, y: target.tank.y });

    const trimmedPath = path.slice(1).filter((point) => !context.intersectsAnyWall(point.x, point.y, bot.tank.radius));
    this.botPathWaypoints.set(bot.id, trimmedPath);
    this.botPathWaypointIndex.set(bot.id, 0);
    this.botNextPathPlanAtMs.set(bot.id, context.nowMs + this.randomInRange(profile.pathReplanMs.min, profile.pathReplanMs.max));
  }

  private getPathGrid(
    cellSize: number,
    tankRadius: number,
    world: { width: number; height: number; walls: ReadonlyArray<{ x: number; y: number; width: number; height: number }> },
  ): NavigationGrid {
    const cacheKey = `${cellSize}:${tankRadius}`;
    const cached = this.pathGridCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const grid = buildNavigationGrid(world.width, world.height, world.walls, tankRadius, cellSize);
    this.pathGridCache.set(cacheKey, grid);
    return grid;
  }

  private randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private findClosestTarget(bot: PlayerEntity, humans: PlayerEntity[]): PlayerEntity | undefined {
    let best: PlayerEntity | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const human of humans) {
      const candidateDistance = distance(bot.tank.x, bot.tank.y, human.tank.x, human.tank.y);
      if (candidateDistance < bestDistance) {
        bestDistance = candidateDistance;
        best = human;
      }
    }

    return best;
  }
}
