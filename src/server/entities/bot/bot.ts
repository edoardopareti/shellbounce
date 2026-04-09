export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface BotDifficultyProfile {
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

export const BOT_DIFFICULTY_PROFILES: Record<BotDifficulty, BotDifficultyProfile> = {
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

export function parseBotDifficulty(value: string): BotDifficulty {
  switch (value) {
    case 'easy':
    case 'medium':
    case 'hard':
      return value;
    default:
      return 'medium';
  }
}
