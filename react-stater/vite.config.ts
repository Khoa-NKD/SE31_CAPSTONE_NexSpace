import http from 'node:http';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { nitro } from 'nitro/vite';

/**
 * Early connect middleware proxy for NexSpace API Server.
 * Executes BEFORE TanStack Start's dev server middleware to prevent
 * {"error":"Only HTML requests are supported here"} on /api routes.
 */
function mockApiProxyPlugin(proxyTarget: string): Plugin {
  return {
    name: 'nexspace-mock-api-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/api/') || url === '/api') {
          const targetUrl = new URL(url, proxyTarget);
          const port = targetUrl.port || (targetUrl.protocol === 'https:' ? '443' : '80');
          const proxyReq = http.request(
            {
              hostname: targetUrl.hostname,
              port,
              path: targetUrl.pathname + targetUrl.search,
              method: req.method,
              headers: {
                ...req.headers,
                host: `${targetUrl.hostname}:${port}`
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
                message: `Failed to proxy to backend API at ${proxyTarget}: ${err.message}`
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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || process.env.VITE_API_PROXY_TARGET || 'http://localhost:8080';

  return {
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true
        }
      }
    },
    plugins: [
      mockApiProxyPlugin(proxyTarget),
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
  };
});
