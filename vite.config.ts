// vite.config.ts

// Vite configuration file for the project.
// When running Vite web server, the server will
// - listen on all network interfaces (0.0.0.0)
// - be accessible on port 5173.
// Moreover, any requests to the '/ws' endpoint will be proxied to a WebSocket server
// running on localhost at port 8080.

import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
});
