/** Isolated browser fixture: synthetic metadata in RAM, no database or storage providers. */
import http from 'node:http';

if (process.env.NEXSPACE_STATUS_FIXTURE !== '1')
  throw new Error('Explicit NEXSPACE_STATUS_FIXTURE=1 is required');
const states = [
  'DRAFT',
  'PENDING_REVIEW',
  'REVISION_REQUESTED',
  'APPROVED',
  'REJECTED',
  'empty',
  'error',
  'forbidden'
];
let scenario = 'PENDING_REVIEW';
let reads = 0;
const account = {
  id: 7,
  userName: 'fixture.applicant',
  fullName: 'Fixture Applicant',
  email: 'applicant@example.test',
  role: 'USER',
  status: 'ACTIVE',
  verified: true
};
http
  .createServer((req, res) => {
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.url?.startsWith('/test/scenario/') && req.method === 'POST') {
      const requested = req.url.split('/').pop() ?? '';
      if (!states.includes(requested)) {
        send(400, { message: 'Unknown scenario' });
        return;
      }
      scenario = requested;
      req.resume();
      send(200, { scenario });
      return;
    }
    if (req.url === '/test/stats') {
      send(200, { scenario, reads });
      return;
    }
    if (req.url === '/api/auth/login' && req.method === 'POST') {
      req.resume();
      send(200, {
        success: true,
        data: { accessToken: 'status-browser-fixture', tokenType: 'Bearer', user: account }
      });
      return;
    }
    if (req.headers.authorization !== 'Bearer status-browser-fixture') {
      send(401, { message: 'Fixture sign-in required' });
      return;
    }
    if (req.url === '/api/auth/me') {
      send(200, { success: true, data: account });
      return;
    }
    if (req.url === '/api/auth/logout') {
      req.resume();
      send(200, { success: true });
      return;
    }
    if (req.url === '/api/organizer/applications/current' && req.method === 'GET') {
      reads++;
      if (scenario === 'empty') {
        send(404, { message: 'Organizer profile not found' });
        return;
      }
      if (scenario === 'error') {
        send(500, { message: 'Simulated read failure. Please try again.' });
        return;
      }
      if (scenario === 'forbidden') {
        send(403, { message: 'An active, email-verified account is required' });
        return;
      }
      send(200, {
        success: true,
        data: {
          id: 42,
          status: scenario,
          legalName: 'Da Nang Creative Workspace Company Limited',
          submittedAt: scenario === 'DRAFT' ? null : '2026-11-04T08:00:00',
          reviewedAt: ['APPROVED', 'REJECTED', 'REVISION_REQUESTED'].includes(scenario)
            ? '2026-11-04T09:00:00'
            : null,
          reviewFeedback: ['REJECTED', 'REVISION_REQUESTED'].includes(scenario)
            ? 'Please provide a clearer business license.\nThe submitted image is unreadable.'
            : null
        }
      });
      return;
    }
    send(404, { message: 'Unknown fixture route' });
  })
  .listen(4090, '127.0.0.1', () =>
    process.stdout.write('Status browser fixture listening on port 4090\n')
  );
