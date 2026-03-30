import type {
  ClientMessage,
  ServerErrorMessage,
  ServerMessage,
  ServerStateMessage,
  ServerWelcomeMessage,
  TankType,
  TankInput,
  WorldSnapshot,
} from '../../shared/types';

export interface ClientJoinProfile {
  playerId: string;
  tankType: TankType;
}

export class GameClient {
  private socket: WebSocket | undefined;
  private seq = 0;
  private snapshot: WorldSnapshot | undefined;
  private youId: string | undefined;
  private connectionState: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  public constructor(private readonly wsUrl: string) {}

  public connect(joinProfile: ClientJoinProfile): void {
    if (this.connectionState !== 'disconnected') {
      return;
    }

    this.connectionState = 'connecting';
    this.socket = new WebSocket(this.wsUrl);

    this.socket.onopen = () => {
      const joinMessage: ClientMessage = {
        type: 'join',
        playerId: joinProfile.playerId,
        tankType: joinProfile.tankType,
      };
      this.socket?.send(JSON.stringify(joinMessage));
    };

    this.socket.onmessage = (event) => {
      this.handleServerMessage(event.data);
    };

    this.socket.onclose = () => {
      this.connectionState = 'disconnected';
    };

    this.socket.onerror = () => {
      this.connectionState = 'disconnected';
    };
  }

  public sendInput(input: TankInput): void {
    if (this.connectionState !== 'connected' || this.socket === undefined || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    this.seq += 1;
    const message: ClientMessage = {
      type: 'input',
      seq: this.seq,
      input,
    };

    this.socket.send(JSON.stringify(message));
  }

  public getLatestSnapshot(): WorldSnapshot | undefined {
    return this.snapshot;
  }

  public getPlayerId(): string | undefined {
    return this.youId;
  }

  public getConnectionState(): 'disconnected' | 'connecting' | 'connected' {
    return this.connectionState;
  }

  private handleServerMessage(payload: string): void {
    let message: unknown;

    try {
      message = JSON.parse(payload);
    } catch {
      return;
    }

    if (!isServerMessage(message)) {
      return;
    }

    if (message.type === 'welcome') {
      this.handleWelcome(message);
      return;
    }

    if (message.type === 'state') {
      this.handleState(message);
      return;
    }

    this.handleError(message);
  }

  private handleWelcome(message: ServerWelcomeMessage): void {
    this.youId = message.playerId;
    this.connectionState = 'connected';
  }

  private handleState(message: ServerStateMessage): void {
    this.snapshot = message.snapshot;
    this.youId = message.youId;
  }

  private handleError(_message: ServerErrorMessage): void {
    this.connectionState = 'disconnected';
  }
}

function isServerMessage(value: unknown): value is ServerMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<ServerMessage>;
  return candidate.type === 'welcome' || candidate.type === 'state' || candidate.type === 'error';
}
