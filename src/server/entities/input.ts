import type { TankInput } from '../../shared/types.js';

export function sanitizeInput(input: TankInput): TankInput {
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
