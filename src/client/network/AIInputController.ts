import type { TankInput } from '../../shared/types';
import { EMPTY_INPUT } from '../../shared/types';

export class AIInputController {
  private latestInput: TankInput = EMPTY_INPUT;
  private socket: WebSocket | undefined;
  private destroyed = false;

  public constructor(private readonly streamUrl: string) {
    this.connect();
  }

  public read(): TankInput {
    return this.latestInput;
  }

  public destroy(): void {
    this.destroyed = true;
    this.socket?.close();
    this.socket = undefined;
  }

  private connect(): void {
    this.socket = new WebSocket(this.streamUrl);

    this.socket.onmessage = (event: MessageEvent<string>) => {
      this.handleIncomingMessage(event.data);
    };

    this.socket.onclose = () => {
      this.socket = undefined;
      if (this.destroyed) {
        return;
      }

      window.setTimeout(() => {
        if (this.destroyed) {
          return;
        }

        this.connect();
      }, 1000);
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  private handleIncomingMessage(payload: string): void {
    let candidate: unknown;

    try {
      candidate = JSON.parse(payload);
    } catch {
      return;
    }

    if (!isTankInput(candidate)) {
      return;
    }

    this.latestInput = sanitizeInput(candidate);
  }
}

function isTankInput(value: unknown): value is TankInput {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<TankInput>;
  return (
    typeof candidate.moveForward === 'boolean' &&
    typeof candidate.moveBackward === 'boolean' &&
    typeof candidate.turnLeft === 'boolean' &&
    typeof candidate.turnRight === 'boolean' &&
    typeof candidate.shieldHeld === 'boolean' &&
    typeof candidate.firePressed === 'boolean' &&
    typeof candidate.fireHeld === 'boolean' &&
    typeof candidate.fireReleased === 'boolean' &&
    typeof candidate.detonatePressed === 'boolean' &&
    typeof candidate.placeMinePressed === 'boolean' &&
    typeof candidate.boostPressed === 'boolean' &&
    typeof candidate.pointerWorldX === 'number' &&
    typeof candidate.pointerWorldY === 'number'
  );
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
