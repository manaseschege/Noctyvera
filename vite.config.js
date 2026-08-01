import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The API is reached through a dev proxy rather than directly:
 *  · the browser stays same-origin, so there is no CORS negotiation
 *  · the ngrok interstitial is skipped via a request header
 *  · switching tunnels is one .env change, no code edit
 *
 * Set VITE_API_TARGET in .env.local to point at a different backend.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_TARGET || 'http://localhost:8080';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          secure: true,
          headers: { 'ngrok-skip-browser-warning': 'true' },
        },
      },
    },
  };
});
