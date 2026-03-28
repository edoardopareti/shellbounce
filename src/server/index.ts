import { createServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { TICK_RATE } from '../shared/constants.js';
import { AuthoritativeSimulation } from '../shared/simulation.js';
import type { ClientMessage, ServerMessage, TankInput } from '../shared/types.js';

interface ClientSession {
  socket: WebSocket;
  playerId: string;
  latestSeq: number;
}

const port = Number(process.env.PORT ?? 8080);
const simulation = new AuthoritativeSimulation();
simulation.ensureDefaultBots();

const httpServer = createServer((_, response) => {
  response.statusCode = 200;
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  response.end('Shellbounce authoritative server is running.');
});

const webSocketServer = new WebSocketServer({
  server: httpServer,
  path: '/ws',
});

const sessions = new Map<WebSocket, ClientSession>();
let nextPlayerId = 1;

webSocketServer.on('connection', (socket) => {
  socket.on('message', (rawMessage) => {
    handleClientMessage(socket, rawMessage.toString());
  });

  socket.on('close', () => {
    const session = sessions.get(socket);
    if (session !== undefined) {
      simulation.removePlayer(session.playerId);
      sessions.delete(socket);
    }
  });
});

setInterval(() => {
  simulation.step();
  const snapshot = simulation.createSnapshot();

  for (const session of sessions.values()) {
    if (session.socket.readyState !== session.socket.OPEN) {
      continue;
    }

    const stateMessage: ServerMessage = {
      type: 'state',
      youId: session.playerId,
      snapshot,
    };
    session.socket.send(JSON.stringify(stateMessage));
  }
}, Math.round(1000 / TICK_RATE));

httpServer.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on http://0.0.0.0:${port}`);
});

function handleClientMessage(socket: WebSocket, payload: string): void {
  let message: unknown;

  try {
    message = JSON.parse(payload);
  } catch {
    sendError(socket, 'Malformed JSON payload.');
    return;
  }

  if (!isClientMessage(message)) {
    sendError(socket, 'Unsupported message payload.');
    return;
  }

  if (message.type === 'join') {
    handleJoin(socket);
    return;
  }

  const session = sessions.get(socket);
  if (session === undefined) {
    sendError(socket, 'Join first before sending input.');
    return;
  }

  if (message.seq <= session.latestSeq) {
    return;
  }
  session.latestSeq = message.seq;

  simulation.setPlayerInput(session.playerId, sanitizeInput(message.input));
}

function handleJoin(socket: WebSocket): void {
  if (sessions.has(socket)) {
    return;
  }

  const playerId = `player-${nextPlayerId}`;
  nextPlayerId += 1;

  simulation.addPlayer(playerId, false);

  sessions.set(socket, {
    socket,
    playerId,
    latestSeq: 0,
  });

  const welcomeMessage: ServerMessage = {
    type: 'welcome',
    playerId,
    tickRate: TICK_RATE,
  };

  socket.send(JSON.stringify(welcomeMessage));
}

function sendError(socket: WebSocket, message: string): void {
  const errorMessage: ServerMessage = {
    type: 'error',
    message,
  };

  socket.send(JSON.stringify(errorMessage));
}

function isClientMessage(value: unknown): value is ClientMessage {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<ClientMessage>;
  if (candidate.type === 'join') {
    return true;
  }

  return candidate.type === 'input' && typeof candidate.seq === 'number' && typeof candidate.input === 'object';
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
