# shellbounce

A tank arena web game built with:

- Phaser
- TypeScript
- Vite
- WebSocket

..and Codex, of course.

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+ (comes with modern Node.js)
- Git

Check your versions:

```bash
node -v
npm -v
git --version
```

## Install

Clone and enter the project:

```bash
git clone <this-repo-url>
cd shellbounce
```

Install dependencies:

```bash
npm install
```

## Architecture

- Client app: browser rendering + input capture only (`src/client`)
- Server app: authoritative fixed-timestep simulation (`src/server`)
- Shared domain package: simulation types and rules (`src/shared`)

The browser does not drive core mechanics. The server is the source of truth and streams snapshots to all connected clients.

## Quickstart (Development)

1. Start the authoritative server first:

```bash
npm run dev:server
```

2. In a second terminal, start the browser client:

```bash
npm run dev:client
```

3. Open the client URL printed by Vite (usually `http://localhost:5173`).

If needed, override the WebSocket URL for the client:

```bash
VITE_SERVER_WS_URL=ws://localhost:8080/ws npm run dev:client
```

## Useful Scripts

- `npm run dev`: Alias for Vite client dev server
- `npm run build`: Type-check client and build production assets
- `npm run build:server`: Type-check server and build production assets
- `npm run preview`: Preview production client build locally
- `npm run typecheck:server`: Type-check server and shared packages
- `npm run dev:client`: Start browser client dev server
- `npm run dev:server`: Start authoritative server in watch mode
- `npm run prod:client`: Start browser client from production assets
- `npm run prod:server`: Start authoritative server from production assets

## Development Notes

- Main browser entry point is `src/main.ts` -> `src/client/main.ts`
- Authoritative server entry point is `src/server/index.ts`
- Shared simulation code is under `src/shared`
