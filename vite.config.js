import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The API is reached through a dev proxy rather than directly:
 *  · the browser stays same-origin, so there is no CORS negotiation
 *  · the ngrok interstitial is skipped via a request header
 *  · switching tunnels is one .env change, no code edit
 *
 * Set VITE_API_TARGET in .env.local to point at a different backend.
 *
 * ── Sharing a public link ──────────────────────────────────────
 * Tunnel `vite preview` (after `npm run build`), never `vite dev`. The dev
 * server ships every module unbundled, so a cold load is several hundred
 * round-trips; over ngrok they time out and the app never mounts. The preview
 * server serves the same bundle a deploy would, and carries the proxy config
 * below so /api keeps working.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_TARGET || 'http://localhost:8080';

  // Vite refuses requests whose Host header it does not recognise, which is
  // every tunnel. A leading dot matches the domain and its subdomains, so a new
  // ngrok URL needs no code change - unlike `true`, which would switch the
  // check off for any host at all.
  const allowedHosts = ['.ngrok-free.app', '.ngrok.app', '.ngrok-free.dev', '.ngrok.io'];

  const proxy = {
    '/api': {
      target,
      changeOrigin: true,
      secure: true,
      headers: { 'ngrok-skip-browser-warning': 'true' },
      configure(proxyServer) {
        proxyServer.on('proxyReq', (proxyReq) => {
          // Through a tunnel the browser sends Origin: https://<id>.ngrok-free.app,
          // which is not in the backend's CORS allow-list, so every API call comes
          // back 403 "Invalid CORS request" - the app loads and then does nothing.
          //
          // `changeOrigin` only rewrites Host, not this. Dropping Origin is the
          // honest fix rather than whitelisting each new tunnel URL: this hop is
          // server-to-server, not a cross-origin browser request, so there is no
          // origin for the backend to police.
          proxyReq.removeHeader('origin');
        });
      },
    },
  };

  return {
    plugins: [react()],
    server: { allowedHosts, proxy },
    preview: { allowedHosts, proxy },
  };
});
