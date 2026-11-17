import type { IncomingMessage, ServerResponse } from 'node:http';

export function handleHealthCheck(
  req: IncomingMessage,
  res: ServerResponse,
  startTime: number
): void {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

  const payload = {
    success: true,
    data: {
      status: 'UP',
      service: 'nexspace-mock-rest-server',
      version: '1.0.0',
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    }
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload, null, 2));
}
