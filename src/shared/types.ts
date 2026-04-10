// shared/types.ts

// This file defines the shared TypeScript types and interfaces
// used across both the client and server parts of the application.
// It includes definitions for game entities, player input,
// and the structure of messages exchanged between clients and the server.


// Wall represents a rectangular obstacle in the arena,
// defined by its top-left corner (x, y) and its dimensions (width, height).
export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The MapName type represents the valid map identifiers
// that can be used to select different arena layouts.
export type MapName = 'map1' | 'map2' | 'map3';

export type TankType = 'PolPot' | 'Hightillery' | 'SSugar' | 'Fantanyl';
export const ALL_TANK_TYPES: readonly TankType[] = ['PolPot', 'Hightillery', 'SSugar', 'Fantanyl'];

export type WeaponType = 'SimpleGun' | 'MitosisGun' | 'MachineGun' | 'GrappleGun' | 'LaserWhipGun';
export const ALL_WEAPON_TYPES: readonly WeaponType[] = [
  'SimpleGun',
  'MitosisGun',
  'MachineGun',
  'GrappleGun',
  'LaserWhipGun',
];

export const DEFAULT_WEAPON_BY_TANK: Record<TankType, WeaponType> = {
  PolPot: 'MitosisGun',
  Hightillery: 'MachineGun',
  SSugar: 'LaserWhipGun',
  Fantanyl: 'GrappleGun',
};

export type ShieldType = 'StandardShield' | 'OmniDirShield';
export const ALL_SHIELD_TYPES: readonly ShieldType[] = [
  'StandardShield',
  'OmniDirShield',
];

export const DEFAULT_SHIELD_BY_TANK: Record<TankType, ShieldType> = {
  PolPot: 'StandardShield',
  Hightillery: 'StandardShield',
  SSugar: 'StandardShield',
  Fantanyl: 'StandardShield',
};

export interface TankSetupInput {
  moveSpeed: number;
  rotationSpeedPiFactor: number;
  boostMultiplier: number;
  boostDurationMs: number;
}

export const DEFAULT_TANK_SETUP_BY_TANK: Record<TankType, TankSetupInput> = {
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

export interface WeaponBulletSetupInput {
  speed: number;
  explosionRadius: number;
  maxBounces: number;
  explodeOnWallImpact: boolean;
  isCharged: boolean;
  radius?: number;
  maxLifetimeMs?: number;
}

export interface WeaponSetupBase {
  maxActiveBullets: number;
  normalShotCooldownMs: number;
  chargedShotCooldownMs: number;
}

export interface ChargedShotScalingSetup {
  speedMultiplier: number;
  explosionRadiusMultiplier: number;
  maxBounces: number;
  explodeOnWallImpact: boolean;
  isCharged: boolean;
}

export interface ChargedBulletWeaponSetupInput extends WeaponSetupBase {
  normalShot: WeaponBulletSetupInput;
  chargedShot: ChargedShotScalingSetup;
}

export interface VolleyWeaponSetupInput extends ChargedBulletWeaponSetupInput {
  volleyAngleOffsetsRadians: number[];
  requiresEmptyChamberToShoot: boolean;
  grappleArmedDetonationDelayMs?: number;
  grappleManualDetonationMinDelayMs?: number;
}

export interface MachineGunWeaponSetupInput extends WeaponSetupBase {
  bullet: WeaponBulletSetupInput;
  holdToRapidFireMs: number;
}

export interface LaserWhipWeaponSetupInput extends WeaponSetupBase {
  normalShot: {
    speed: number;
    explosionRadius: number;
    maxBounces: number;
    laserLength: number;
    radius: number;
    maxLifetimeMs: number;
  };
  chargedShot: {
    speedMultiplier: number;
    maxBounces: number;
    isCharged: boolean;
  };
  whip: {
    pullStepDistance: number;
  };
}

export interface WeaponSetupInputByWeaponType {
  SimpleGun: ChargedBulletWeaponSetupInput;
  MitosisGun: ChargedBulletWeaponSetupInput;
  MachineGun: MachineGunWeaponSetupInput;
  GrappleGun: VolleyWeaponSetupInput;
  LaserWhipGun: LaserWhipWeaponSetupInput;
}

export type WeaponSetupInput = WeaponSetupInputByWeaponType[WeaponType];

export const DEFAULT_WEAPON_SETUP_BY_WEAPON: WeaponSetupInputByWeaponType = {
  SimpleGun: {
    maxActiveBullets: 4,
    normalShotCooldownMs: 100,
    chargedShotCooldownMs: 2400,
    normalShot: {
      speed: 420,
      explosionRadius: 84,
      maxBounces: 3,
      explodeOnWallImpact: false,
      isCharged: false,
      maxLifetimeMs: 4000,
    },
    chargedShot: {
      speedMultiplier: 2.5,
      explosionRadiusMultiplier: 1.5,
      maxBounces: 1,
      explodeOnWallImpact: false,
      isCharged: true,
    },
  },
  MitosisGun: {
    maxActiveBullets: 3,
    normalShotCooldownMs: 100,
    chargedShotCooldownMs: 2400,
    normalShot: {
      speed: 420,
      explosionRadius: 84,
      maxBounces: 3,
      explodeOnWallImpact: false,
      isCharged: false,
      maxLifetimeMs: 4000,
    },
    chargedShot: {
      speedMultiplier: 2.5,
      explosionRadiusMultiplier: 1.5,
      maxBounces: 0,
      explodeOnWallImpact: true,
      isCharged: true,
    },
  },
  MachineGun: {
    maxActiveBullets: 6,
    normalShotCooldownMs: 130,
    chargedShotCooldownMs: 40,
    holdToRapidFireMs: 180,
    bullet: {
      speed: 520,
      explosionRadius: 56,
      maxBounces: 1,
      explodeOnWallImpact: false,
      isCharged: true,
      radius: 3,
      maxLifetimeMs: 550,
    },
  },
  GrappleGun: {
    maxActiveBullets: 6,
    normalShotCooldownMs: 200,
    chargedShotCooldownMs: 2500,
    normalShot: {
      speed: 420,
      explosionRadius: 45,
      maxBounces: 3,
      explodeOnWallImpact: false,
      isCharged: false,
      maxLifetimeMs: 4000,
    },
    chargedShot: {
      speedMultiplier: 2.5,
      explosionRadiusMultiplier: 1.5,
      maxBounces: 0,
      explodeOnWallImpact: true,
      isCharged: true,
    },
    volleyAngleOffsetsRadians: [-(Math.PI / 15), 0, Math.PI / 15],
    requiresEmptyChamberToShoot: false,
    grappleArmedDetonationDelayMs: 2500,
    grappleManualDetonationMinDelayMs: 1000,
  },
  LaserWhipGun: {
    maxActiveBullets: 1,
    normalShotCooldownMs: 130,
    chargedShotCooldownMs: 250,
    normalShot: {
      speed: 1200,
      explosionRadius: 70,
      maxBounces: 1,
      laserLength: 90,
      radius: 4,
      maxLifetimeMs: 2300,
    },
    chargedShot: {
      speedMultiplier: 2.2,
      maxBounces: 0,
      isCharged: true,
    },
    whip: {
      pullStepDistance: 28,
    },
  },
};

// TankInput represents the player's input state for a single game tick,
// including movement commands, firing actions, and pointer position.
export interface TankInput {
  moveForward: boolean;
  moveBackward: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  shieldHeld: boolean;
  firePressed: boolean;
  fireHeld: boolean;
  fireReleased: boolean;
  detonatePressed: boolean;
  placeMinePressed: boolean;
  boostPressed: boolean;
  pointerWorldX: number;
  pointerWorldY: number;
}

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

export interface PlayerState {
  id: string;
  tankType: TankType;
  weaponType: WeaponType;
  shieldType: ShieldType;
  shieldMode: 'sector' | 'omnidirectional';
  kills: number;
  deaths: number;
  score: number;
  x: number;
  y: number;
  bodyAngle: number;
  turretAngle: number;
  radius: number;
  isAlive: boolean;
  isBot: boolean;
  bulletColor: number;
  isShieldActive: boolean;
  isSpawnProtected: boolean;
  shieldCooldownBlocked: boolean;
  fireCooldownBlocked: boolean;
  isChargingShot: boolean;
  chargeLevel: number;
  muzzleOffset: number;
  shieldRadius: number;
  shieldForwardOffset: number;
  shieldSectorAngleRadians: number;
  respawnShieldRadius: number;
}

export interface BulletState {
  id: string;
  ownerPlayerId: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  isCharged: boolean;
  kind: 'standard' | 'mitosis' | 'laser' | 'grapple';
  isMitosisSplit: boolean;
  laserLength?: number;
  laserAngle?: number;
  isGrappleArmed?: boolean;
}

export interface MineState {
  id: string;
  ownerPlayerId: string;
  x: number;
  y: number;
  radius: number;
  armed: boolean;
  color: number;
}

export interface EffectEvent {
  id: string;
  kind: 'explosion' | 'tank-destruction' | 'bullet-shot' | 'mine-place' | 'bullet-explosion' | 'mine-explosion' | 'boost';
  x: number;
  y: number;
  radius: number;
  color: number;
  durationMs: number;
  angle?: number;
}

export interface ShotPreviewSegmentState {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface ShotPreviewState {
  playerId: string;
  segments: ShotPreviewSegmentState[];
}

export interface WorldSnapshot {
  tick: number;
  width: number;
  height: number;
  walls: Wall[];
  elapsedMs: number; // Elapsed time in ms since game start
  players: PlayerState[];
  bullets: BulletState[];
  mines: MineState[];
  effects: EffectEvent[];
  shotPreviews?: ShotPreviewState[];
}

// ConnectionState class to avoid magic strings for connection state
export class ConnectionState {
  static readonly Disconnected = 'disconnected';
  static readonly Connecting = 'connecting';
  static readonly Connected = 'connected';

  static values(): string[] {
    return [
      ConnectionState.Disconnected,
      ConnectionState.Connecting,
      ConnectionState.Connected,
    ];
  }
}

// ClientMessage represents the structure of messages sent from clients to the server,
// which can be either a join request or player input commands.
export interface ClientJoinMessage {
  type: 'join';
  playerId: string;
  tankType: TankType;
  weaponType: WeaponType;
  shieldType: ShieldType;
  tankSetup?: TankSetupInput;
  weaponSetup?: WeaponSetupInput;
}
// ClientInputMessage represents the structure of player input messages sent from clients to the server,
// containing the input state and a sequence number for ordering.
export interface ClientInputMessage {
  type: 'input';
  seq: number;  // This sequence number helps the server process inputs in the correct order and ignore outdated messages.
  input: TankInput;
}
// ClientMessage is a union type that encompasses all possible message types that a client can send to the server,
// allowing for type-safe handling of different message structures based on the 'type' field.
export type ClientMessage = ClientJoinMessage | ClientInputMessage;

// ServerMessage represents the structure of messages sent from the server to clients,
// which can be a welcome message, a state update, or an error message.
export interface ServerWelcomeMessage {
  type: 'welcome';
  playerId: string;
  tickRate: number;
}
// ServerStateMessage represents the structure of state update messages sent from the server to clients,
// containing the latest world snapshot and the player's own ID for client-side processing.
export interface ServerStateMessage {
  type: 'state';
  youId: string;
  snapshot: WorldSnapshot;
}
// ServerErrorMessage represents the structure of error messages sent from the server to clients,
// containing an error message string that can be displayed to the user or used for debugging.
export interface ServerErrorMessage {
  type: 'error';
  message: string;
}
// ServerMessage is a union type that encompasses all possible message types that the server can send to clients,
// allowing for type-safe handling of different message structures based on the 'type' field.
export type ServerMessage = ServerWelcomeMessage | ServerStateMessage | ServerErrorMessage;
