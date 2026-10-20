import http from 'node:http';
import { handleRequest } from './router.ts';
import { storage } from './storage.ts';

const PORT = parseInt(process.env.MOCK_SERVER_PORT || '4000', 10);
const HOST = process.env.MOCK_SERVER_HOST || '127.0.0.1';

export async function startServer(port = PORT, host = HOST): Promise<http.Server> {
  const startTime = Date.now();

  // Initialize storage (copies seeds if runtime files are missing, preserves existing)
  const initResult = await storage.initialize();
  console.log('---------------------------------------------------------');
  console.log('⚡ NexSpace Centralized Mock REST API Server');
  console.log('---------------------------------------------------------');
  console.log(`📂 Runtime Store:  ${storage.getRuntimeFilePath('')}`);
  console.log(`🌱 Seed Fixtures:  ${storage.getSeedFilePath('')}`);
  if (initResult.initialized.length > 0) {
    console.log(`✨ Initialized runtime files: ${initResult.initialized.join(', ')}`);
  }
  if (initResult.preserved.length > 0) {
    console.log(`💾 Preserved existing runtime files (${initResult.preserved.length}): ${initResult.preserved.join(', ')}`);
  }

  const server = http.createServer((req, res) => {
    console.log(`[MockServer] ${req.method} ${req.url}`);
    handleRequest(req, res, startTime).catch((err: unknown) => {
      console.error('[MockServer] Unhandled request exception:', err);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            error: 'InternalServerError',
            message: 'An unexpected internal error occurred in the mock server.',
            timestamp: new Date().toISOString()
          })
        );
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, host, () => {
      console.log(`🚀 Mock API running on: http://localhost:${port}/api/v1`);
      console.log(`🩺 Health endpoint:   http://localhost:${port}/api/v1/health`);
      console.log(`🧪 Demo users list:   http://localhost:${port}/api/v1/demo/users`);
      console.log('---------------------------------------------------------');
      resolve(server);
    });
  });
}

// Auto-start when executed directly
const isDirectExecution =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('mock-server/server.ts') ||
  process.argv[1]?.endsWith('mock-server/server.js');

if (isDirectExecution) {
  startServer().catch((err) => {
    console.error('[MockServer] Failed to start mock server:', err);
    process.exit(1);
  });
}
