import type {
  TankInput,
  ShieldLimits,
  ShieldLimitsByType,
  WeaponLimits,
  WeaponLimitsByType,
  TankLimits,
  TankType,
  TankSetupInputByType,
  ShieldType,
  ShieldSetupInputByType,
  WeaponType,
  WeaponSetupInputByType,
} from './types';

export const ALL_TANK_TYPES: readonly TankType[] = [
  'PolPot',
  'Hightillery',
  'SSugar',
  'Fantanyl',
];

export const ALL_WEAPON_TYPES: readonly WeaponType[] = [
  'SimpleGun',
  'MitosisGun',
  'MachineGun',
  'GrappleGun',
  'LaserWhipGun',
];

export const ALL_SHIELD_TYPES: readonly ShieldType[] = [
  'StandardShield',
  'OmniDirShield',
];

export const DEFAULT_WEAPON_BY_TANK: Record<TankType, WeaponType> = {
  PolPot: 'MitosisGun',
  Hightillery: 'MachineGun',
  SSugar: 'LaserWhipGun',
  Fantanyl: 'GrappleGun',
};

export const DEFAULT_SHIELD_BY_TANK: Record<TankType, ShieldType> = {
  PolPot: 'StandardShield',
  Hightillery: 'StandardShield',
  SSugar: 'StandardShield',
  Fantanyl: 'StandardShield',
};

export const EMPTY_INPUT: TankInput = {
  moveForward: false,
  moveBackward: false,
  turnLeft: false,
  turnRight: false,
  shieldHeld: false,
  firePressed: false,
  fireHeld: false,
  fireReleased: false,
  detonatePressed: false,
  placeMinePressed: false,
  boostPressed: false,
  pointerWorldX: 0,
  pointerWorldY: 0,
};

export const TICK_RATE = 60;
export const FIXED_TIMESTEP_SECONDS = 1 / TICK_RATE;

export const TANK_RESPAWN_DELAY_MS = 3000;
export const TANK_RESPAWN_PROTECTION_MS = 1800;
export const SPAWN_CORNER_PADDING = 56;

export const SHOT_PREVIEW_BULLET_RADIUS = 5;
export const SHOT_PREVIEW_REFLECTIONS = 1;
export const SHOT_PREVIEW_MAX_DISTANCE = 720;

export const BULLET_EXPLOSION_VISUAL_DURATION_MS = 160;

export const DEFAULT_CHARGED_SHOT_MIN_HOLD_MS = 150;
export const DEFAULT_CHARGED_SHOT_MAX_HOLD_MS = 1200;
export const DEFAULT_CHARGED_SHOT_OVERCHARGE_MS = 2400;

export const MINE_EXPLOSION_RADIUS = 118;
export const MINE_EXPLOSION_VISUAL_DURATION_MS = 210;

export const DEFAULT_WORLD_WIDTH = 3200;
export const DEFAULT_WORLD_HEIGHT = 2133;

export const TANK_LIMITS: Record<TankType, TankLimits> = {
  PolPot: {
    moveSpeed: { min: 200, max: 300 },
    rotationSpeedPiFactor: { min: 1.2, max: 3 },
    boostMultiplier: { min: 1.75, max: 2.5 },
    boostDurationMs: { min: 1000, max: 1500 },
  },
  Hightillery: {
    moveSpeed: { min: 200, max: 300 },
    rotationSpeedPiFactor: { min: 1.2, max: 3 },
    boostMultiplier: { min: 1.75, max: 2.5 },
    boostDurationMs: { min: 1000, max: 1500 },
  },
  SSugar: {
    moveSpeed: { min: 200, max: 300 },
    rotationSpeedPiFactor: { min: 1.2, max: 3 },
    boostMultiplier: { min: 1.75, max: 2.5 },
    boostDurationMs: { min: 1000, max: 1500 },
  },
  Fantanyl: {
    moveSpeed: { min: 200, max: 300 },
    rotationSpeedPiFactor: { min: 1.2, max: 3 },
    boostMultiplier: { min: 1.75, max: 2.5 },
    boostDurationMs: { min: 1000, max: 1500 },
  },
};

export const WEAPON_LIMITS: WeaponLimitsByType = {
  SimpleGun: {
    maxActiveBullets: { min: 3, max: 3 },
    normalShotCooldownMs: { min: 150, max: 150 },
    chargedShotCooldownMs: { min: 2000, max: 2000 },
    normalShotSpeed: { min: 450, max: 600 },
    normalShotExplosionRadius: { min: 55, max: 70 },
    normalShotMaxBounces: { min: 3, max: 3 },
    normalShotRadius: { min: 6, max: 6 },
    normalShotMaxLifetimeMs: { min: 4000, max: 5000 },
    chargedSpeedMultiplier: { min: 2, max: 2.75 },
    chargedExplosionRadiusMultiplier: { min: 1.5, max: 2.25 },
    chargedMaxBounces: { min: 1, max: 1 },
  },
  MitosisGun: {
    maxActiveBullets: { min: 3, max: 3 },
    normalShotCooldownMs: { min: 200, max: 200 },
    chargedShotCooldownMs: { min: 2500, max: 2500 },
    normalShotSpeed: { min: 400, max: 500 },
    normalShotExplosionRadius: { min: 50, max: 70 },
    normalShotMaxBounces: { min: 3, max: 3 },
    normalShotRadius: { min: 6, max: 6 },
    normalShotMaxLifetimeMs: { min: 4000, max: 5000 },
    chargedSpeedMultiplier: { min: 2, max: 2.5 },
    chargedExplosionRadiusMultiplier: { min: 1.5, max: 2 },
    chargedMaxBounces: { min: 0, max: 0 },
  },
  MachineGun: {
    maxActiveBullets: { min: 6, max: 6 },
    normalShotCooldownMs: { min: 100, max: 100 },
    chargedShotCooldownMs: { min: 100, max: 100 },
    normalShotSpeed: { min: 600, max: 750 },
    normalShotExplosionRadius: { min: 45, max: 45 },
    normalShotMaxBounces: { min: 0, max: 0 },
    normalShotRadius: { min: 4, max: 4 },
    normalShotMaxLifetimeMs: { min: 400, max: 500 },
    chargedSpeedMultiplier: { min: 2, max: 2.5 },
    chargedExplosionRadiusMultiplier: { min: 1.5, max: 2 },
    chargedMaxBounces: { min: 0, max: 0 },
    holdToRapidFireMs: { min: 200, max: 400 },
  },
  GrappleGun: {
    maxActiveBullets: { min: 6, max: 6 },
    normalShotCooldownMs: { min: 200, max: 200 },
    chargedShotCooldownMs: { min: 2500, max: 2500 },
    normalShotSpeed: { min: 375, max: 550 },
    normalShotExplosionRadius: { min: 55, max: 70 },
    normalShotMaxBounces: { min: 1, max: 1 },
    normalShotRadius: { min: 8, max: 8 },
    normalShotMaxLifetimeMs: { min: 2000, max: 3000 },
    chargedSpeedMultiplier: { min: 2, max: 2.5 },
    chargedExplosionRadiusMultiplier: { min: 1.75, max: 2.5 },
    chargedMaxBounces: { min: 0, max: 0 },
    grappleArmedDetonationDelayMs: { min: 2000, max: 3500 },
    grappleManualDetonationMinDelayMs: { min: 800, max: 1000 },
    volleyAngleOffsetRadians: { min: -1.2, max: 1.2 },
    volleyAngleOffsetsCount: { min: 1, max: 7 },
  },
  LaserWhipGun: {
    maxActiveBullets: { min: 1, max: 1 },
    normalShotCooldownMs: { min: 125, max: 125 },
    chargedShotCooldownMs: { min: 2000, max: 2000 },
    normalShotSpeed: { min: 1200, max: 1400 },
    normalShotExplosionRadius: { min: 50, max: 50 },
    normalShotMaxBounces: { min: 1, max: 1 },
    normalShotRadius: { min: 6, max: 6 },
    normalShotMaxLifetimeMs: { min: 2000, max: 3000 },
    chargedSpeedMultiplier: { min: 1.5, max: 2 },
    chargedExplosionRadiusMultiplier: { min: 1.5, max: 2.5 },
    chargedMaxBounces: { min: 0, max: 0 },
    normalShotLaserLength: { min: 90, max: 90 },
    whipPullStepDistance: { min: 40, max: 40 },
  },
} satisfies Record<WeaponType, WeaponLimits>;

export const SHIELD_LIMITS: ShieldLimitsByType = {
  StandardShield: {
    radius: { min: 35, max: 35 },
    cooldownMs: { min: 2000, max: 3000 },
    overchargeMs: { min: 2000, max: 3500 },
    forwardOffset: { min: 15, max: 15 },
    sectorAngleRadians: { min: 2, max: 3 },
  },
  OmniDirShield: {
    radius: { min: 35, max: 35 },
    cooldownMs: { min: 3000, max: 4000 },
    overchargeMs: { min: 1500, max: 2000 },
  },
} satisfies Record<ShieldType, ShieldLimits>;

export const DEFAULT_TANK_SETUP_BY_TANK: TankSetupInputByType = {
  PolPot: {
    moveSpeed: 225,
    rotationSpeedPiFactor: 2.0,
    boostMultiplier: 2.15,
    boostDurationMs: 1100,
  },
  Hightillery: {
    moveSpeed: 215,
    rotationSpeedPiFactor: 2.0,
    boostMultiplier: 2.0,
    boostDurationMs: 1100,
  },
  SSugar: {
    moveSpeed: 245,
    rotationSpeedPiFactor: 2.25,
    boostMultiplier: 2.3,
    boostDurationMs: 1000,
  },
  Fantanyl: {
    moveSpeed: 205,
    rotationSpeedPiFactor: 1.5,
    boostMultiplier: 2.2,
    boostDurationMs: 1250,
  },
};

export const DEFAULT_WEAPON_SETUP_BY_WEAPON: WeaponSetupInputByType = {
  SimpleGun: {
    maxActiveBullets: 3,
    normalShotCooldownMs: 150,
    chargedShotCooldownMs: 2000,
    normalShot: {
      speed: 450,
      explosionRadius: 55,
      maxBounces: 3,
      explodeOnWallImpact: false,
      isCharged: false,
      maxLifetimeMs: 4000,
    },
    chargedShot: {
      speedMultiplier: 2,
      explosionRadiusMultiplier: 1.5,
      maxBounces: 1,
      explodeOnWallImpact: false,
      isCharged: true,
    },
  },
  MitosisGun: {
    maxActiveBullets: 3,
    normalShotCooldownMs: 200,
    chargedShotCooldownMs: 2500,
    normalShot: {
      speed: 400,
      explosionRadius: 50,
      maxBounces: 3,
      explodeOnWallImpact: false,
      isCharged: false,
      maxLifetimeMs: 4000,
    },
    chargedShot: {
      speedMultiplier: 2,
      explosionRadiusMultiplier: 1.5,
      maxBounces: 0,
      explodeOnWallImpact: true,
      isCharged: true,
    },
  },
  MachineGun: {
    maxActiveBullets: 6,
    normalShotCooldownMs: 100,
    chargedShotCooldownMs: 100,
    holdToRapidFireMs: 200,
    bullet: {
      speed: 600,
      explosionRadius: 45,
      maxBounces: 0,
      explodeOnWallImpact: true,
      isCharged: false,
      radius: 4,
      maxLifetimeMs: 400,
    },
  },
  GrappleGun: {
    maxActiveBullets: 6,
    normalShotCooldownMs: 200,
    chargedShotCooldownMs: 2500,
    normalShot: {
      speed: 375,
      explosionRadius: 55,
      maxBounces: 1,
      explodeOnWallImpact: false,
      isCharged: false,
      maxLifetimeMs: 2000,
    },
    chargedShot: {
      speedMultiplier: 2,
      explosionRadiusMultiplier: 1.75,
      maxBounces: 0,
      explodeOnWallImpact: true,
      isCharged: true,
    },
    volleyAngleOffsetsRadians: [-(Math.PI / 15), 0, Math.PI / 15],
    requiresEmptyChamberToShoot: false,
    grappleArmedDetonationDelayMs: 3500,
    grappleManualDetonationMinDelayMs: 1000,
  },
  LaserWhipGun: {
    maxActiveBullets: 1,
    normalShotCooldownMs: 125,
    chargedShotCooldownMs: 2000,
    normalShot: {
      speed: 1200,
      explosionRadius: 50,
      maxBounces: 1,
      laserLength: 90,
      radius: 6,
      maxLifetimeMs: 2000,
    },
    chargedShot: {
      speedMultiplier: 1.5,
      maxBounces: 0,
      isCharged: true,
    },
    whip: {
      pullStepDistance: 40,
    },
  },
};

export const DEFAULT_SHIELD_SETUP_BY_SHIELD: ShieldSetupInputByType = {
  StandardShield: {
    radius: 35,
    forwardOffset: 15,
    sectorAngleRadians: 2,
    cooldownMs: 3000,
    overchargeMs: 2000,
  },
  OmniDirShield: {
    radius: 35,
    cooldownMs: 4000,
    overchargeMs: 1500,
  },
};