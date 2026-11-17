/** Explicitly enabled browser fixture. All writes are confined to this process's memory. */
import http from 'node:http';
import { setTimeout } from 'node:timers/promises';

if (process.env.NEXSPACE_UI_FIXTURE !== '1')
  throw new Error('Explicit NEXSPACE_UI_FIXTURE=1 is required');
const account = {
  id: 7,
  userName: 'fixture.organizer',
  firstName: 'Test',
  fullName: 'Test Organizer',
  email: 'owner@example.test',
  role: 'ORGANIZER',
  status: 'ACTIVE',
  verified: true
};
let profile = {
  id: 42,
  legalName: 'Example Company',
  businessType: 'LIMITED_LIABILITY',
  taxId: 'TEST-TAX-123',
  representativeName: 'Test Representative',
  address: '123 Example Street',
  contactEmail: 'contact@example.test',
  contactPhone: '0901234567'
};
let saves = 0;
let failNext = false;
const server = http.createServer(async (req, res) => {
  const send = (status: number, data: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  if (req.url === '/test/stats') {
    send(200, { saves, profile });
    return;
  }
  if (req.url === '/test/fail-next' && req.method === 'POST') {
    failNext = true;
    req.resume();
    send(200, { enabled: true });
    return;
  }
  if (req.url === '/api/auth/login' && req.method === 'POST') {
    req.resume();
    send(200, {
      success: true,
      data: { accessToken: 'business-profile-browser-fixture', tokenType: 'Bearer', user: account }
    });
    return;
  }
  if (req.headers.authorization !== 'Bearer business-profile-browser-fixture') {
    send(401, { success: false, message: 'Fixture session required' });
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
  if (req.url === '/api/organizer/business-profile') {
    if (req.method === 'GET') {
      await setTimeout(400);
      send(200, { success: true, data: profile });
      return;
    }
    if (req.method === 'PUT') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
      saves++;
      await setTimeout(700);
      if (failNext) {
        failNext = false;
        send(500, { success: false, message: 'Simulated save failure. Please try again.' });
        return;
      }
      const keys = Object.keys(input);
      if (
        keys.length !== 3 ||
        keys.some((key) => !['address', 'contactEmail', 'contactPhone'].includes(key))
      ) {
        send(400, { success: false, message: 'Only contact fields are editable' });
        return;
      }
      profile = {
        ...profile,
        address: String(input.address),
        contactEmail: String(input.contactEmail),
        contactPhone: String(input.contactPhone)
      };
      send(200, { success: true, data: profile });
      return;
    }
  }
  send(404, { success: false, message: 'Unknown browser fixture endpoint' });
});
server.listen(4088, '127.0.0.1', () =>
  process.stdout.write('In-memory business profile fixture listening on port 4088\n')
);
