import type {
  ClientMessage,
  ShieldType,
  ServerErrorMessage,
  ServerMessage,
  ServerStateMessage,
  ServerWelcomeMessage,
  TankType,
  WeaponType,
  TankInput,
  WorldSnapshot,
} from '../../shared/types';
import { ConnectionState } from '../../shared/types';

export interface ClientJoinProfile {
  playerId: string;  // The player's chosen name or identifier to be used in the game.
  tankType: TankType;  // The type of tank the player wants to use.
  weaponType: WeaponType;
  shieldType: ShieldType;
}

export class GameClient {

  // GameClient is responsible for managing the WebSocket connection to the game server,
  // sending player input, and maintaining the latest game state snapshot received from the server.

  private socket: WebSocket | undefined;
  private seq = 0;
  private snapshot: WorldSnapshot | undefined;
  private youId: string | undefined;
  private connectionState: string = ConnectionState.Disconnected;

  public constructor(private readonly wsUrl: string) {}

  public connect(joinProfile: ClientJoinProfile): void {
    // This method establishes a WebSocket connection to the game server
    // and sends a join message with the player's profile information.
    
    // If the client is already connected or in the process of connecting, we do not attempt to connect again.
    if (this.connectionState !== ConnectionState.Disconnected) {
      return;
    }
    this.connectionState = ConnectionState.Connecting;

    // Create a new WebSocket connection to the server using the provided URL.
    this.socket = new WebSocket(this.wsUrl);
    
    // Set up event handlers for the WebSocket connection
    // to handle open, message, close, and error events.

    // When the connection is successfully opened, send a join message
    // to the server with the player's ID and chosen tank type.
    this.socket.onopen = () => {
      const joinMessage: ClientMessage = {
        type: 'join',
        playerId: joinProfile.playerId,
        tankType: joinProfile.tankType,
        weaponType: joinProfile.weaponType,
        shieldType: joinProfile.shieldType,
      };
      this.socket?.send(JSON.stringify(joinMessage));
    };
    
    // When a message is received from the server, handle it using the handleServerMessage method.
    this.socket.onmessage = (event) => {
      this.handleServerMessage(event.data);
    };
    
    // If the connection is closed or an error occurs, update the connection state to 'disconnected'.
    this.socket.onclose = () => {
      this.connectionState = ConnectionState.Disconnected;
    };
    this.socket.onerror = () => {
      this.connectionState = ConnectionState.Disconnected;
    };
  }

  public sendInput(input: TankInput): void {
    
    // This method sends player input to the server as a ClientInputMessage.

    if (this.connectionState !== ConnectionState.Connected || this.socket === undefined || this.socket.readyState !== WebSocket.OPEN) {
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

  public getConnectionState(): string {
    return this.connectionState;
  }
  
  private handleServerMessage(payload: string): void {

    // This method processes incoming messages from the server.

    let message: unknown;

    try {
      // Attempt to parse the incoming message as JSON. If parsing fails, we ignore the message.
      message = JSON.parse(payload);
    } catch {
      return;
    }
    
    // Check if the parsed message conforms to the expected ServerMessage structure.
    if (!isServerMessage(message)) {
      return;
    }
    
    // Handle a 'welcome' message by updating the player's ID and connection state.
    if (message.type === 'welcome') {
      this.handleWelcome(message);
      return;
    }
    
    // Handle a 'state' message by updating the latest game snapshot and the player's ID.
    if (message.type === 'state') {
      this.handleState(message);
      return;
    }
    
    // Handle an 'error' message by updating the connection state to 'disconnected'.
    this.handleError(message);
  }

  private handleWelcome(message: ServerWelcomeMessage): void {
    // Handle a welcome message from the server
    this.youId = message.playerId;
    this.connectionState = ConnectionState.Connected;
  }

  private handleState(message: ServerStateMessage): void {
    // Handle a state update message from the server
    this.snapshot = message.snapshot;
    this.youId = message.youId;
  }

  private handleError(_message: ServerErrorMessage): void {
    // Handle an error message from the server
    this.connectionState = ConnectionState.Disconnected;
  }
}

function isServerMessage(value: unknown): value is ServerMessage {
  // This function checks if a given value conforms to the ServerMessage type.

  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<ServerMessage>;
  return candidate.type === 'welcome' || candidate.type === 'state' || candidate.type === 'error';
}
