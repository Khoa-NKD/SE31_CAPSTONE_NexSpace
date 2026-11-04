/** Browser-only contract fixture. Never a replacement for the Spring API or a persistence test. */
import http from 'node:http';
import { setTimeout } from 'node:timers/promises';

if (process.env.NEXSPACE_UI_FIXTURE !== '1') throw new Error('Explicit NEXSPACE_UI_FIXTURE=1 is required');
let submissions = 0;
const account = { id: 7, userName: 'test.applicant', firstName: 'Test', lastName: 'Applicant', fullName: 'Test Applicant', email: 'applicant@example.test', role: 'USER', status: 'ACTIVE', verified: true };
const server = http.createServer(async (req, res) => {
  const send = (status: number, data: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  if (req.url === '/test/stats') { send(200, { submissions }); return; }
  if (req.url === '/api/auth/login' && req.method === 'POST') {
    req.resume();
    send(200, { success: true, statusCode: 200, data: { accessToken: 'browser-fixture-token', tokenType: 'Bearer', expiresAt: '2999-01-01T00:00:00Z', user: account } });
    return;
  }
  if (req.headers.authorization !== 'Bearer browser-fixture-token') {
    send(401, { success: false, statusCode: 401, message: 'Test session required' });
    return;
  }
  if (req.url === '/api/auth/me') { send(200, { success: true, data: account }); return; }
  if (req.url === '/api/auth/logout' && req.method === 'POST') { send(200, { success: true }); return; }
  if (req.url === '/api/organizer/applications' && req.method === 'POST') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks);
    const request = new Request('http://localhost/api/organizer/applications', {
      method: 'POST', headers: { 'Content-Type': req.headers['content-type'] ?? '' }, body
    });
    const data = await request.formData();
    if (!(data.get('application') instanceof Blob) || !(data.get('businessLicense') instanceof File)) {
      send(400, { success: false, message: 'Missing multipart parts' }); return;
    }
    submissions++;
    await setTimeout(400);
    send(201, { success: true, statusCode: 201, data: { id: 42, status: 'PENDING_REVIEW', submittedAt: '2026-11-03T01:00:00' } });
    return;
  }
  send(404, { success: false, message: 'Unknown fixture endpoint' });
});
server.listen(4087, '127.0.0.1', () => process.stdout.write('Isolated in-memory UI fixture listening on port 4087\n'));
