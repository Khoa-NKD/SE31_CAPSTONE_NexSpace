import http from 'node:http';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { nitro } from 'nitro/vite';

/**
 * Early connect middleware proxy for NexSpace Mock REST Server.
 * Executes BEFORE TanStack Start's dev server middleware to prevent
 * {"error":"Only HTML requests are supported here"} on /api routes.
 */
function mockApiProxyPlugin(): Plugin {
  return {
    name: 'nexspace-mock-api-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/api/') || url === '/api') {
          const springRequest = url.startsWith('/api/auth/') || url.startsWith('/api/organizer/');
          const targetPort = springRequest ? '8080' : process.env.MOCK_SERVER_PORT || '4000';
          const targetBase = springRequest
            ? process.env.VITE_SPRING_API_PROXY_TARGET || 'http://localhost:8080'
            : process.env.VITE_API_PROXY_TARGET || `http://localhost:${targetPort}`;
          const targetUrl = new URL(url, targetBase);
          const proxyReq = http.request(
            {
              hostname: targetUrl.hostname,
              port: targetUrl.port || targetPort,
              path: targetUrl.pathname + targetUrl.search,
              method: req.method,
              headers: {
                ...req.headers,
                host: `${targetUrl.hostname}:${targetUrl.port || targetPort}`
              }
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
              proxyRes.pipe(res);
            }
          );
          proxyReq.on('error', (err) => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: false,
                error: 'BadGateway',
                message: `API server unavailable: ${err.message}`
              })
            );
          });
          req.pipe(proxyReq);
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:4000',
        changeOrigin: true
      }
    }
  },
  plugins: [
    mockApiProxyPlugin(),
    tsconfigPaths(),
    tailwindcss(),
    tanstackStart(),
    nitro({ preset: process.env.SERVER_PRESET }),
    viteReact()
  ],
  build: {
    rollupOptions: {
      external: [/^maplibre-gl/]
    }
  }
});
