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
}

export interface BulletState {
  id: string;
  ownerPlayerId: string;
  x: number;
  y: number;
  radius: number;
  color: number;
  isCharged: boolean;
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
