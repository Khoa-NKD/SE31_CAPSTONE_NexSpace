import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { startServer } from '../server.ts';

const TEST_PORT = 4128;

describe('AI Chatbot Service Integration Tests', () => {
  let server: http.Server;
  let apiClient: any;

  before(async () => {
    process.env.INTERNAL_API_URL = `http://127.0.0.1:${TEST_PORT}/api/v1`;
    server = await startServer(TEST_PORT, '127.0.0.1');
    const clientModule = await import('../../src/lib/api-client.ts');
    apiClient = clientModule.apiClient;
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  test('POST /public/chat via apiClient unwraps envelope and returns AI response', async () => {
    const res = await apiClient.post('/public/chat', {
      message: 'Quy trình đặt chỗ tại NexSpace thế nào?'
    });

    assert.ok(res, 'Response should not be null');
    assert.ok(typeof res.reply === 'string' && res.reply.length > 0, 'Reply should be a non-empty string');
    assert.ok(res.reply.includes('NexBot'), 'Reply should identify as NexBot');
    assert.ok(Array.isArray(res.suggestedQuestions), 'Suggested questions should be an array');
    assert.ok(res.suggestedQuestions.length > 0, 'Suggested questions should not be empty');
  });
});
