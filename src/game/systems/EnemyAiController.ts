import Phaser from 'phaser';
import type { Tank } from '../entities/Tank';
import type { Bullet } from '../entities/Bullet';
import type { TankInput } from './InputController';
import { normalizeAngleRadians } from '../utils/math';
import type { Wall } from '../map/types';
import {
  BULLET_EXPLOSION_RADIUS,
  BULLET_RADIUS,
  SHOT_PREVIEW_MAX_DISTANCE,
  SHOT_PREVIEW_REFLECTIONS,
} from '../constants';
import { getClosestDistanceToTrajectory, predictBulletTrajectory } from '../utils/shotPrediction';
import { buildNavigationGrid, findPath } from '../utils/pathfinding';

export type EnemyAiDifficulty = 'easy' | 'medium' | 'hard';

interface DifficultyProfile {
  aimErrorRadians: number;
  steeringDeadZoneRadians: number;
  preferredDistanceMin: number;
  preferredDistanceMax: number;
  searchStepRadians: number;
  useRicochetChance: number;
  holdWhenOnTarget: boolean;
  targetHitSlack: number;
  bulletThreatHorizonMs: number;
  dodgeMargin: number;
  dodgeReactionChance: number;
  canShootWhileDodging: boolean;
  wallProbeDistance: number;
  wallAvoidanceTurnBiasRadians: number;
  decisionIntervalMs: { min: number; max: number };
  fireCooldownMs: { min: number; max: number };
  maxFireRange: number;
  detonationMargin: number;
  selfPreservationMargin: number;
  pathCellSize: number;
  pathReplanMs: { min: number; max: number };
  minePlacementDistanceFactor: number;
  minePlacementCooldownMs: { min: number; max: number };
}

const DIFFICULTY_PROFILES: Record<EnemyAiDifficulty, DifficultyProfile> = {
  easy: {
    aimErrorRadians: 0.45,
    steeringDeadZoneRadians: 0.3,
    preferredDistanceMin: 180,
    preferredDistanceMax: 340,
    searchStepRadians: Phaser.Math.DegToRad(16),
    useRicochetChance: 0.45,
    holdWhenOnTarget: false,
    targetHitSlack: 10,
    bulletThreatHorizonMs: 550,
    dodgeMargin: 20,
    dodgeReactionChance: 0.45,
    canShootWhileDodging: false,
    wallProbeDistance: 75,
    wallAvoidanceTurnBiasRadians: Phaser.Math.DegToRad(30),
    decisionIntervalMs: { min: 420, max: 700 },
    fireCooldownMs: { min: 600, max: 980 },
    maxFireRange: 460,
    detonationMargin: 12,
    selfPreservationMargin: 14,
    pathCellSize: 56,
    pathReplanMs: { min: 500, max: 850 },
    minePlacementDistanceFactor: 0.92,
    minePlacementCooldownMs: { min: 2200, max: 3400 },
  },
  medium: {
    aimErrorRadians: 0.23,
    steeringDeadZoneRadians: 0.2,
    preferredDistanceMin: 150,
    preferredDistanceMax: 310,
    searchStepRadians: Phaser.Math.DegToRad(10),
    useRicochetChance: 0.8,
    holdWhenOnTarget: true,
    targetHitSlack: 6,
    bulletThreatHorizonMs: 850,
    dodgeMargin: 26,
    dodgeReactionChance: 0.78,
    canShootWhileDodging: true,
    wallProbeDistance: 95,
    wallAvoidanceTurnBiasRadians: Phaser.Math.DegToRad(42),
    decisionIntervalMs: { min: 260, max: 440 },
    fireCooldownMs: { min: 360, max: 620 },
    maxFireRange: 520,
    detonationMargin: 8,
    selfPreservationMargin: 10,
    pathCellSize: 44,
    pathReplanMs: { min: 320, max: 560 },
    minePlacementDistanceFactor: 1.02,
    minePlacementCooldownMs: { min: 1700, max: 2800 },
  },
  hard: {
    aimErrorRadians: 0.08,
    steeringDeadZoneRadians: 0.1,
    preferredDistanceMin: 130,
    preferredDistanceMax: 280,
    searchStepRadians: Phaser.Math.DegToRad(5),
    useRicochetChance: 1,
    holdWhenOnTarget: true,
    targetHitSlack: 3,
    bulletThreatHorizonMs: 1200,
    dodgeMargin: 34,
    dodgeReactionChance: 1,
    canShootWhileDodging: true,
    wallProbeDistance: 110,
    wallAvoidanceTurnBiasRadians: Phaser.Math.DegToRad(55),
    decisionIntervalMs: { min: 110, max: 220 },
    fireCooldownMs: { min: 180, max: 320 },
    maxFireRange: 640,
    detonationMargin: 4,
    selfPreservationMargin: 6,
    pathCellSize: 32,
    pathReplanMs: { min: 170, max: 300 },
    minePlacementDistanceFactor: 1.15,
    minePlacementCooldownMs: { min: 1300, max: 2200 },
  },
};

interface AimSolution {
  pointerTarget: Phaser.Math.Vector2;
  predictedHit: boolean;
}

interface BulletThreat {
  bullet: Bullet;
  timeToClosest: number;
}

export class EnemyAiController {
  private readonly profile: DifficultyProfile;
  private aimSolution: AimSolution | undefined;
  private nextDecisionAtMs = 0;
  private nextAllowedShotAtMs = 0;
  private nextAllowedMineAtMs = 0;
  private nextPathPlanAtMs = 0;
  private pathWaypoints: Phaser.Math.Vector2[] = [];
  private pathWaypointIndex = 0;

  public constructor(public readonly difficulty: EnemyAiDifficulty) {
    this.profile = DIFFICULTY_PROFILES[difficulty];
  }

  public readInput(
    nowMs: number,
    enemyTank: Tank,
    targetTank: Tank | undefined,
    walls: readonly Wall[],
    bullets: readonly Bullet[],
  ): TankInput {
    if (targetTank === undefined) {
      const fallbackX = enemyTank.x + Math.cos(enemyTank.bodyAngle) * 120;
      const fallbackY = enemyTank.y + Math.sin(enemyTank.bodyAngle) * 120;

      return {
        moveForward: true,
        moveBackward: false,
        turnLeft: false,
        turnRight: false,
        firePressed: false,
        fireHeld: false,
        fireReleased: false,
        detonatePressed: false,
        placeMinePressed: false,
        boostPressed: false,
        pointerWorldX: fallbackX,
        pointerWorldY: fallbackY,
      };
    }
    
    // The following logic determines the AI's actions based on the current game state,
    // including the position of the enemy tank, the target tank, the walls, and the bullets.
    // The AI will make decisions about movement, turning, firing, dodging, and other actions 
    // based on its difficulty profile and the current situation in the game.

    if (nowMs >= this.nextDecisionAtMs) {
      this.aimSolution = this.computeAimSolution(enemyTank, targetTank, walls);
      this.nextDecisionAtMs = nowMs + this.randomInRange(this.profile.decisionIntervalMs.min, this.profile.decisionIntervalMs.max);
    }

    if (this.aimSolution === undefined) {
      this.aimSolution = this.computeAimSolution(enemyTank, targetTank, walls);
    }

    const threat = this.findMostDangerousBullet(enemyTank, bullets);
    const shouldDodge = threat !== undefined && Math.random() <= this.profile.dodgeReactionChance;

    let desiredHeading = Phaser.Math.Angle.Between(enemyTank.x, enemyTank.y, targetTank.x, targetTank.y);
    if (shouldDodge && threat !== undefined) {
      desiredHeading = this.computeDodgeHeading(enemyTank, threat.bullet, walls);
    } else {
      const pathHeading = this.computePathAwareHeading(nowMs, enemyTank, targetTank, walls);
      desiredHeading = this.computeWallAwareHeading(enemyTank, pathHeading, walls);
    }

    const headingDelta = normalizeAngleRadians(desiredHeading - enemyTank.bodyAngle);
    const absHeadingDelta = Math.abs(headingDelta);

    const turnLeft = absHeadingDelta > this.profile.steeringDeadZoneRadians && headingDelta < 0;
    const turnRight = absHeadingDelta > this.profile.steeringDeadZoneRadians && headingDelta > 0;

    const distanceToTarget = Phaser.Math.Distance.Between(enemyTank.x, enemyTank.y, targetTank.x, targetTank.y);
    const hasPredictedShot = this.aimSolution.predictedHit;

    let moveForward =
      distanceToTarget > this.profile.preferredDistanceMax ||
      (this.hasPendingPathWaypoint(enemyTank) && distanceToTarget > this.profile.preferredDistanceMin);
    let moveBackward = distanceToTarget < this.profile.preferredDistanceMin;

    if (shouldDodge) {
      moveForward = true;
      moveBackward = false;
    }

    const shouldHoldPosition = hasPredictedShot && this.profile.holdWhenOnTarget;

    const canShootByDistance = distanceToTarget <= this.profile.maxFireRange;
    const canShootByPrediction = hasPredictedShot || this.difficulty === 'easy';
    const canShootByDodgeState = !shouldDodge || this.profile.canShootWhileDodging;
    const shouldBoostForDodge = shouldDodge;
    const chaseDistanceThresholdMultiplier = this.difficulty === 'hard' ? 1.15 : this.difficulty === 'medium' ? 1.3 : 1.6;
    const shouldBoostForChase = distanceToTarget > this.profile.preferredDistanceMax * chaseDistanceThresholdMultiplier;

    let firePressed = false;
    if (canShootByPrediction && canShootByDistance && canShootByDodgeState && nowMs >= this.nextAllowedShotAtMs) {
      firePressed = true;
      this.nextAllowedShotAtMs =
        nowMs + this.randomInRange(this.profile.fireCooldownMs.min, this.profile.fireCooldownMs.max);
    }

    const fireHeld = false;
    const fireReleased = firePressed;

    const detonatePressed = this.shouldDetonateOwnedBullet(enemyTank, targetTank, bullets);
    const placeMinePressed = this.shouldPlaceMine(nowMs, distanceToTarget, shouldDodge, moveBackward);
    const boostPressed = shouldBoostForDodge || shouldBoostForChase;

    return {
      moveForward: shouldHoldPosition ? false : moveForward,
      moveBackward,
      turnLeft,
      turnRight,
      firePressed,
      fireHeld,
      fireReleased,
      detonatePressed,
      placeMinePressed,
      boostPressed,
      pointerWorldX: this.aimSolution.pointerTarget.x,
      pointerWorldY: this.aimSolution.pointerTarget.y,
    };
  }

  private shouldPlaceMine(nowMs: number, distanceToTarget: number, shouldDodge: boolean, movingBackward: boolean): boolean {
    const nearTargetDistance = this.profile.preferredDistanceMin * this.profile.minePlacementDistanceFactor;
    const tacticalMineDrop = shouldDodge || movingBackward;

    if (!tacticalMineDrop || distanceToTarget > nearTargetDistance) {
      return false;
    }

    if (nowMs < this.nextAllowedMineAtMs) {
      return false;
    }

    this.nextAllowedMineAtMs =
      nowMs + this.randomInRange(this.profile.minePlacementCooldownMs.min, this.profile.minePlacementCooldownMs.max);
    return true;
  }

  private shouldDetonateOwnedBullet(enemyTank: Tank, targetTank: Tank, bullets: readonly Bullet[]): boolean {
    const oldestOwnedBullet = bullets.find((bullet) => bullet.isAlive && bullet.ownerTankId === enemyTank.id);
    if (oldestOwnedBullet === undefined) {
      return false;
    }

    const targetDistance = Phaser.Math.Distance.Between(oldestOwnedBullet.x, oldestOwnedBullet.y, targetTank.x, targetTank.y);
    const targetReach = BULLET_EXPLOSION_RADIUS + targetTank.radius + this.profile.detonationMargin;
    if (targetDistance > targetReach) {
      return false;
    }

    const selfDistance = Phaser.Math.Distance.Between(oldestOwnedBullet.x, oldestOwnedBullet.y, enemyTank.x, enemyTank.y);
    const selfSafeDistance = BULLET_EXPLOSION_RADIUS + enemyTank.radius + this.profile.selfPreservationMargin;
    if (selfDistance < selfSafeDistance) {
      return false;
    }

    return true;
  }

  private computePathAwareHeading(
    nowMs: number,
    enemyTank: Tank,
    targetTank: Tank,
    walls: readonly Wall[],
  ): number {
    if (nowMs >= this.nextPathPlanAtMs || this.pathWaypoints.length === 0) {
      this.recomputePath(nowMs, enemyTank, targetTank, walls);
    }

    this.advancePathWaypointIfNeeded(enemyTank);

    const waypoint = this.pathWaypoints[this.pathWaypointIndex];
    if (waypoint === undefined) {
      return Phaser.Math.Angle.Between(enemyTank.x, enemyTank.y, targetTank.x, targetTank.y);
    }

    return Phaser.Math.Angle.Between(enemyTank.x, enemyTank.y, waypoint.x, waypoint.y);
  }

  private recomputePath(nowMs: number, enemyTank: Tank, targetTank: Tank, walls: readonly Wall[]): void {
    let worldWidth = 0;
    let worldHeight = 0;

    for (const wall of walls) {
      worldWidth = Math.max(worldWidth, wall.x + wall.width);
      worldHeight = Math.max(worldHeight, wall.y + wall.height);
    }

    const navGrid = buildNavigationGrid(
      walls,
      worldWidth,
      worldHeight,
      enemyTank.radius,
      this.profile.pathCellSize,
    );

    this.pathWaypoints = findPath(
      navGrid,
      new Phaser.Math.Vector2(enemyTank.x, enemyTank.y),
      new Phaser.Math.Vector2(targetTank.x, targetTank.y),
    );
    this.pathWaypointIndex = this.pathWaypoints.length > 1 ? 1 : 0;
    this.nextPathPlanAtMs =
      nowMs + this.randomInRange(this.profile.pathReplanMs.min, this.profile.pathReplanMs.max);
  }

  private advancePathWaypointIfNeeded(enemyTank: Tank): void {
    while (this.pathWaypointIndex < this.pathWaypoints.length) {
      const waypoint = this.pathWaypoints[this.pathWaypointIndex];
      const distance = Phaser.Math.Distance.Between(enemyTank.x, enemyTank.y, waypoint.x, waypoint.y);
      if (distance > this.profile.pathCellSize * 0.45) {
        break;
      }

      this.pathWaypointIndex += 1;
    }
  }

  private hasPendingPathWaypoint(enemyTank: Tank): boolean {
    const waypoint = this.pathWaypoints[this.pathWaypointIndex];
    if (waypoint === undefined) {
      return false;
    }

    return Phaser.Math.Distance.Between(enemyTank.x, enemyTank.y, waypoint.x, waypoint.y) > this.profile.pathCellSize * 0.35;
  }

  private computeAimSolution(enemyTank: Tank, targetTank: Tank, walls: readonly Wall[]): AimSolution {
    const directAngle = Phaser.Math.Angle.Between(enemyTank.x, enemyTank.y, targetTank.x, targetTank.y);
    const shouldUseRicochet = Math.random() <= this.profile.useRicochetChance;

    const candidateAngles = shouldUseRicochet
      ? this.buildAngleCandidates(directAngle, this.profile.searchStepRadians)
      : [directAngle];

    const muzzle = enemyTank.getMuzzlePosition();
    const targetCenter = new Phaser.Math.Vector2(targetTank.x, targetTank.y);
    const requiredDistance = targetTank.radius + BULLET_RADIUS + this.profile.targetHitSlack;

    let bestAngle = directAngle;
    let bestMissDistance = Number.POSITIVE_INFINITY;

    for (const candidateAngle of candidateAngles) {
      const noisyAngle = candidateAngle + Phaser.Math.FloatBetween(-this.profile.aimErrorRadians, this.profile.aimErrorRadians);
      const trajectory = predictBulletTrajectory(
        muzzle,
        noisyAngle,
        walls,
        BULLET_RADIUS,
        SHOT_PREVIEW_REFLECTIONS,
        SHOT_PREVIEW_MAX_DISTANCE,
      );

      const missDistance = getClosestDistanceToTrajectory(targetCenter, trajectory);
      if (missDistance < bestMissDistance) {
        bestMissDistance = missDistance;
        bestAngle = noisyAngle;
      }
    }

    const pointerTarget = new Phaser.Math.Vector2(
      enemyTank.x + Math.cos(bestAngle) * 800,
      enemyTank.y + Math.sin(bestAngle) * 800,
    );

    return {
      pointerTarget,
      predictedHit: bestMissDistance <= requiredDistance,
    };
  }

  private findMostDangerousBullet(enemyTank: Tank, bullets: readonly Bullet[]): BulletThreat | undefined {
    const enemyPosition = new Phaser.Math.Vector2(enemyTank.x, enemyTank.y);
    const dangerRadius = enemyTank.radius + BULLET_RADIUS + this.profile.dodgeMargin;
    const horizonSeconds = this.profile.bulletThreatHorizonMs / 1000;

    let bestThreat: BulletThreat | undefined;

    for (const bullet of bullets) {
      if (!bullet.isAlive || bullet.speed <= Number.EPSILON) {
        continue;
      }

      const bulletPosition = new Phaser.Math.Vector2(bullet.x, bullet.y);
      const bulletVelocity = new Phaser.Math.Vector2(bullet.velocityX, bullet.velocityY);
      const toEnemy = enemyPosition.clone().subtract(bulletPosition);

      if (toEnemy.dot(bulletVelocity) <= 0) {
        continue;
      }

      const speedSquared = bulletVelocity.lengthSq();
      const closestTime = Phaser.Math.Clamp(toEnemy.dot(bulletVelocity) / speedSquared, 0, horizonSeconds);
      const closestPoint = bulletPosition.clone().add(bulletVelocity.scale(closestTime));
      const distanceAtClosest = Phaser.Math.Distance.Between(enemyPosition.x, enemyPosition.y, closestPoint.x, closestPoint.y);

      if (distanceAtClosest > dangerRadius) {
        continue;
      }

      if (bestThreat === undefined || closestTime < bestThreat.timeToClosest) {
        bestThreat = { bullet, timeToClosest: closestTime };
      }
    }

    return bestThreat;
  }

  private computeDodgeHeading(enemyTank: Tank, incomingBullet: Bullet, walls: readonly Wall[]): number {
    const velocity = new Phaser.Math.Vector2(incomingBullet.velocityX, incomingBullet.velocityY).normalize();
    if (velocity.lengthSq() <= Number.EPSILON) {
      return enemyTank.bodyAngle;
    }

    const leftPerpendicular = new Phaser.Math.Vector2(-velocity.y, velocity.x);
    const rightPerpendicular = new Phaser.Math.Vector2(velocity.y, -velocity.x);

    const leftScore = this.evaluateDirectionClearance(enemyTank, leftPerpendicular, walls);
    const rightScore = this.evaluateDirectionClearance(enemyTank, rightPerpendicular, walls);

    const chosen = leftScore >= rightScore ? leftPerpendicular : rightPerpendicular;
    return Phaser.Math.Angle.Between(0, 0, chosen.x, chosen.y);
  }

  private computeWallAwareHeading(enemyTank: Tank, desiredHeading: number, walls: readonly Wall[]): number {
    const frontBlocked = this.isDirectionBlocked(enemyTank, desiredHeading, walls, this.profile.wallProbeDistance);
    if (!frontBlocked) {
      return desiredHeading;
    }

    const leftHeading = normalizeAngleRadians(desiredHeading - this.profile.wallAvoidanceTurnBiasRadians);
    const rightHeading = normalizeAngleRadians(desiredHeading + this.profile.wallAvoidanceTurnBiasRadians);

    const leftScore = this.evaluateHeadingClearance(enemyTank, leftHeading, walls);
    const rightScore = this.evaluateHeadingClearance(enemyTank, rightHeading, walls);

    return leftScore >= rightScore ? leftHeading : rightHeading;
  }

  private evaluateDirectionClearance(enemyTank: Tank, direction: Phaser.Math.Vector2, walls: readonly Wall[]): number {
    const heading = Phaser.Math.Angle.Between(0, 0, direction.x, direction.y);
    return this.evaluateHeadingClearance(enemyTank, heading, walls);
  }

  private evaluateHeadingClearance(enemyTank: Tank, heading: number, walls: readonly Wall[]): number {
    const primaryProbe = this.isDirectionBlocked(enemyTank, heading, walls, this.profile.wallProbeDistance);
    const secondaryProbe = this.isDirectionBlocked(enemyTank, heading, walls, this.profile.wallProbeDistance * 0.55);

    if (primaryProbe) {
      return 0;
    }
    if (secondaryProbe) {
      return 0.5;
    }

    return 1;
  }

  private isDirectionBlocked(enemyTank: Tank, heading: number, walls: readonly Wall[], distance: number): boolean {
    const probeX = enemyTank.x + Math.cos(heading) * distance;
    const probeY = enemyTank.y + Math.sin(heading) * distance;
    const radius = enemyTank.radius;

    for (const wall of walls) {
      const closestX = Phaser.Math.Clamp(probeX, wall.x, wall.x + wall.width);
      const closestY = Phaser.Math.Clamp(probeY, wall.y, wall.y + wall.height);
      const distanceSquared = Phaser.Math.Distance.Squared(probeX, probeY, closestX, closestY);
      if (distanceSquared < radius * radius) {
        return true;
      }
    }

    return false;
  }

  private buildAngleCandidates(directAngle: number, stepRadians: number): number[] {
    const candidates: number[] = [directAngle];

    for (let offset = stepRadians; offset <= Math.PI; offset += stepRadians) {
      candidates.push(normalizeAngleRadians(directAngle + offset));
      candidates.push(normalizeAngleRadians(directAngle - offset));
    }

    return candidates;
  }

  private randomInRange(min: number, max: number): number {
    return Phaser.Math.Between(min, max);
  }
}
