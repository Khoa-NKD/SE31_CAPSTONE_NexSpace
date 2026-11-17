import type { IncomingMessage, ServerResponse } from 'node:http';
import { storage } from '../storage.ts';

export async function handleDevReset(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // Disallow in production environments
  if (process.env.NODE_ENV === 'production') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          success: false,
          error: 'Forbidden',
          message: 'Reset endpoint is strictly disabled in production environments.',
          timestamp: new Date().toISOString()
        },
        null,
        2
      )
    );
    return;
  }

  try {
    const restored = await storage.resetToSeeds();
    const payload = {
      success: true,
      message: 'Runtime mock data reset to seed fixtures successfully.',
      data: {
        restoredFiles: restored,
        count: restored.length,
        timestamp: new Date().toISOString()
      }
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload, null, 2));
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown reset error';
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          success: false,
          error: 'InternalServerError',
          message: `Failed to reset mock data: ${errorMessage}`,
          timestamp: new Date().toISOString()
        },
        null,
        2
      )
    );
  }
}
