// server/index.ts

// This file implements the authoritative server for Shellbounce game,
// which manages the game state, processes player inputs, and sends updates to clients.
// The server uses WebSockets for real-time communication with clients,
// allowing for low-latency interactions and a responsive gaming experience.

import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { TICK_RATE } from '../shared/constants.js';
import { AuthoritativeSimulation } from '../shared/simulation.js';
import { ALL_TANK_TYPES, type ClientJoinMessage, type ClientMessage, type ServerMessage, type TankInput } from '../shared/types.js';


// TODO: Currently, a single AuthoritativeSimulation instance is used for all N clients,
// in an N to 1 relationship.
// Extend to support multiple game rooms or instances in the future (N to M relationship),
// as fixed number of M servers with:
// - "join" requests rate limiting
// - logout of inactive clients
// - client authentication

// TODO: Implement multiplayer game modes, such as:
// - free-for-all deathmatch
// - team-based play
// - capture the flag
// - campaign/co-op against bots

// TODO: Implement in-game chat bind to button C.


// ClientSession tracks the WebSocket connection 
// and player information for each connected client.
interface ClientSession {
  socket: WebSocket;
  playerId: string;
  latestSeq: number;
}

// Network port that the server listens on for incoming connections
const port = Number(process.env.PORT ?? 8080);

// Create the authoritative simulation instance that will manage game state and logic.
const simulation = new AuthoritativeSimulation();

// Ensure that default bots are added to the simulation
// before accepting client connections.
simulation.ensureDefaultBots();

// Create an HTTP server to handle basic requests
// Required because WebSocket connections are established through an initial HTTP handshake,
// so having an HTTP server allows to accept WebSocket upgrade requests 
// and manage real-time communication with clients.
const httpServer = createServer((_, response) => {
  response.statusCode = 200;
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  response.end('Shellbounce authoritative server is running.');
});
// Create a WebSocket server that listens for upgrade requests on the HTTP server
// and handles real-time communication with clients.
const webSocketServer = new WebSocketServer({
  server: httpServer,
  path: '/ws',
});

// Map to track active client sessions, keyed by their WebSocket connection.
// Sessions represent the active connections to clients,
// mapping each WebSocket to a ClientSession that contains
//  - the player's ID
//  - the latest input sequence number received from that client.
// This allows the server to manage multiple clients, track their state,
// and send targeted messages back to them.
const sessions = new Map<WebSocket, ClientSession>();
// Set to track observer WebSocket connections that receive game state updates
// without participating as players.
const observers = new Set<WebSocket>();

// Handle new WebSocket connections from clients, set up message handlers, and manage disconnections.
// When a client connects to the server via WebSocket, this event handler is triggered.
// The socket parameter represents the connection to the client, which can be used to send
// and receive messages.
webSocketServer.on('connection', (socket) => {

  // Set up a message handler for incoming messages from the client,
  // which will process player inputs and other commands.
  // Whenever a message is received from the client (such as player input or join requests),
  // this event handler is triggered.
  socket.on('message', (rawMessage) => {
    handleClientMessage(socket, rawMessage.toString());
  });
  
  // Handle client disconnection by removing the player
  // from the simulation and cleaning up the session.
  socket.on('close', () => {
    const session = sessions.get(socket);
    if (session !== undefined) {
      simulation.removePlayer(session.playerId);
      sessions.delete(socket);
    }

    observers.delete(socket);
  });
});

// Main game loop that advances the simulation state at a fixed tick rate 
// and sends state updates to all connected clients.
// setInterval is used to schedule asynchronous execution of the game loop
// at a regular interval defined by TICK_RATE,
// which determines how many times per second the simulation state is updated and sent to clients.
setInterval(() => {
  
  // Advance the simulation state by one tick, which processes all game logic,
  // such as player movements, collisions, and other interactions.
  simulation.step();

  // Create a snapshot of the current world state, which will be sent to clients.
  const snapshot = simulation.createSnapshot();
  
  // Broadcast the current world snapshot to all connected clients,
  // allowing them to update their local game state.
  for (const session of sessions.values()) {
    if (session.socket.readyState !== session.socket.OPEN) {
      continue;
    }
    
    // Construct a state message containing the client's player ID and the current world snapshot,
    // and send it to the client over the WebSocket connection.
    
    // TODO Send also to different clients

    const stateMessage: ServerMessage = {
      type: 'state',
      youId: session.playerId,
      snapshot,
    };
    session.socket.send(JSON.stringify(stateMessage));
  }
  
  // Send the current world snapshot to all observer clients,
  // which receive updates without participating as players.
  for (const observerSocket of observers.values()) {
    if (observerSocket.readyState !== observerSocket.OPEN) {
      continue;
    }

    observerSocket.send(JSON.stringify({
      type: 'state',
      snapshot,
    }));
  }
}, Math.round(1000 / TICK_RATE));

// Start the HTTP server and listen for incoming connections on the specified port.
// Runs continuously and concurrently with the simulation loop,
// allowing the server to handle client connections and game state updates simultaneously.
// Request flow:
//   HTTP Server --> WebSocketServer --> Handles corresponding events (connection, message, close)
// Simulation loop runs independently and sends updates to clients.
httpServer.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://0.0.0.0:${port}`);
});

function handleClientMessage(socket: WebSocket, payload: string): void {
  
  // This function processes incoming messages from clients, which can be either
  // join requests or player input commands. 

  let message: unknown;
  
  // Attempt to parse the incoming message as JSON. If parsing fails, send an error response back to the client.
  try {
    message = JSON.parse(payload);
  } catch {
    sendError(socket, 'Malformed JSON payload.');
    return;
  }

  if (isObserveMessage(message)) {
    handleObserve(socket);
    return;
  }

  // Validate that the parsed message conforms to the expected ClientMessage structure.
  if (!isClientMessage(message)) {
    sendError(socket, 'Unsupported message payload.');
    return;
  }
  
  // Handle join messages by creating a new player session and adding the player to the simulation.
  if (message.type === 'join') {
    handleJoin(socket, message);
    return;
  }
  
  // Get session for the client sending input messages
  const session = sessions.get(socket);
  if (session === undefined) {
    sendError(socket, 'Join first before sending input.');
    return;
  }
  // Check the sequence number of the incoming input message to ensure 
  // it is newer than the latest processed input for that client.
  // This prevents processing out-of-order or duplicate input messages,
  // which could lead to inconsistent game state.
  if (message.seq <= session.latestSeq) {
    return;
  }
  // Update the latest sequence number for the client session to the current message's sequence number:
  // this informs the server that this input has been processed
  session.latestSeq = message.seq;
   
  // Sanitize the incoming player input to ensure it is valid and safe,
  // then update the simulation with the new input for the corresponding player.
  simulation.setPlayerInput(session.playerId, sanitizeInput(message.input));
}

function handleObserve(socket: WebSocket): void {
  // This function handles requests from clients to become observers,
  // which allows them to receive game state updates without participating as players.
  if (sessions.has(socket)) {
    sendError(socket, 'Already joined as player. Open a new socket to observe.');
    return;
  }

  observers.add(socket);
}

function handleJoin(socket: WebSocket, message: ClientJoinMessage): void {
  // This function handles join requests from clients.
  // It checks if the client is already in a session, and if not,
  // it creates a new player ID, adds the player to the simulation,
  // and sends a welcome message back to the client.

  if (sessions.has(socket)) {
    return;
  }
  
  const playerId = sanitizePlayerId(message.playerId);
  if (playerId.length === 0) {
    sendError(socket, 'Player name cannot be empty.');
    return;
  }

  if (playerId.length > 24) {
    sendError(socket, 'Player name must be 24 characters or fewer.');
    return;
  }

  if (!ALL_TANK_TYPES.includes(message.tankType)) {
    sendError(socket, `Invalid tank type. Allowed: ${ALL_TANK_TYPES.join(', ')}`);
    return;
  }

  if (isPlayerIdTaken(playerId)) {
    sendError(socket, 'Player name already taken. Choose a different name.');
    return;
  }
  
  // Add the new player to the simulation with the generated player ID.
  simulation.addPlayer(playerId, false, message.tankType);
  
  // Create a new client session and store it in the sessions map, keyed by the WebSocket connection.
  sessions.set(socket, {
    socket,
    playerId,
    latestSeq: 0,
  });
  
  // Send a welcome message back to the client, including their assigned player ID and the server's tick rate.
  const welcomeMessage: ServerMessage = {
    type: 'welcome',
    playerId,
    tickRate: TICK_RATE,
  };
  socket.send(JSON.stringify(welcomeMessage));
}

function sendError(socket: WebSocket, message: string): void {
  // This function sends an error message back to the client in a standardized format.
  const errorMessage: ServerMessage = {
    type: 'error',
    message,
  };

  socket.send(JSON.stringify(errorMessage));
}

function isClientMessage(value: unknown): value is ClientMessage {
  // This type guard checks if the incoming message from the client
  // matches the expected structure of a ClientMessage,
  // which can be either a join message or an input message.
  // It ensures that the message has the correct type and required properties.
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<ClientMessage>;
  if (candidate.type === 'join') {
    return typeof candidate.playerId === 'string' && typeof candidate.tankType === 'string';
  }

  return candidate.type === 'input' && typeof candidate.seq === 'number' && typeof candidate.input === 'object';
}

function isObserveMessage(value: unknown): value is { type: 'observe' } {
  // This type guard checks if the incoming message from the client is an observe message,
  // which indicates that the client wants to receive game state updates
  // without participating as a player.
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as { type?: string };
  return candidate.type === 'observe';
}

function sanitizePlayerId(playerId: string): string {
  return playerId.trim();
}

function isPlayerIdTaken(playerId: string): boolean {
  for (const session of sessions.values()) {
    if (session.playerId === playerId) {
      return true;
    }
  }

  return false;
}

function sanitizeInput(input: TankInput): TankInput {
  // This function ensures that the incoming player input is valid and safe to use.
  // It converts all boolean-like values to actual booleans and ensures numeric values are finite numbers.
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
