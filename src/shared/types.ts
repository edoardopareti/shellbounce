export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type MapName = 'map1' | 'map2' | 'map3';

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

export type TankType = 'PolPot' | 'Hightillery' | 'SSugar' | 'Fantanyl';

export const ALL_TANK_TYPES: readonly TankType[] = ['PolPot', 'Hightillery', 'SSugar', 'Fantanyl'];

export interface PlayerState {
  id: string;
  tankType: TankType;
  x: number;
  y: number;
  bodyAngle: number;
  turretAngle: number;
  radius: number;
  isAlive: boolean;
  isBot: boolean;
  bulletColor: number;
  isShieldActive: boolean;
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
  kind: 'explosion' | 'tank-destruction' | 'bullet-shot' | 'mine-place' | 'bullet-explosion' | 'mine-explosion';
  x: number;
  y: number;
  radius: number;
  color: number;
  durationMs: number;
}

export interface WorldSnapshot {
  tick: number;
  width: number;
  height: number;
  walls: Wall[];
  players: PlayerState[];
  bullets: BulletState[];
  mines: MineState[];
  effects: EffectEvent[];
}

export interface ClientJoinMessage {
  type: 'join';
}

export interface ClientInputMessage {
  type: 'input';
  seq: number;
  input: TankInput;
}

export type ClientMessage = ClientJoinMessage | ClientInputMessage;

export interface ServerWelcomeMessage {
  type: 'welcome';
  playerId: string;
  tickRate: number;
}

export interface ServerStateMessage {
  type: 'state';
  youId: string;
  snapshot: WorldSnapshot;
}

export interface ServerErrorMessage {
  type: 'error';
  message: string;
}

export type ServerMessage = ServerWelcomeMessage | ServerStateMessage | ServerErrorMessage;

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
