import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('🚀 Starting NexSpace Full Development Environment (Mock API + Vite)...');

const mockProcess: ChildProcess = spawn(
  process.execPath,
  ['--experimental-strip-types', path.join(rootDir, 'mock-server/server.ts')],
  {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' }
  }
);

const viteProcess: ChildProcess = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'dev'],
  {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env }
  }
);

function cleanup() {
  console.log('\n🛑 Shutting down NexSpace development services...');
  mockProcess.kill('SIGTERM');
  viteProcess.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

mockProcess.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[MOCK] Mock server exited with error code ${code}`);
  }
});

viteProcess.on('exit', (code) => {
  if (code && code !== 0) {
    console.error(`[VITE] Vite dev server exited with error code ${code}`);
  }
});
