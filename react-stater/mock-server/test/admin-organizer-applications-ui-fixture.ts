/** Isolated UI fixture. All accounts/applications are synthetic and live only in RAM. */
import http from 'node:http';
import { setTimeout } from 'node:timers/promises';

if (process.env.NEXSPACE_ADMIN_APPLICATION_FIXTURE !== '1')
  throw new Error('Explicit NEXSPACE_ADMIN_APPLICATION_FIXTURE=1 is required');
const applications = Array.from({ length: 41 }, (_, index) => {
  const id = index + 1;
  const status =
    id <= 36
      ? 'PENDING_REVIEW'
      : id <= 38
        ? 'APPROVED'
        : id === 39
          ? 'REJECTED'
          : id === 40
            ? 'REVISION_REQUESTED'
            : 'DRAFT';
  return {
    id,
    legalName: `Da Nang Workspace ${String(id).padStart(2, '0')}`,
    businessType: 'LIMITED_LIABILITY',
    applicantId: id + 100,
    applicantUserName: `applicant.${id}`,
    applicantEmail: `applicant${id}@example.test`,
    status,
    submittedAt: status === 'DRAFT' ? null : '2026-11-05T08:00:00',
    reviewedAt: ['APPROVED', 'REJECTED', 'REVISION_REQUESTED'].includes(status)
      ? '2026-11-05T09:00:00'
      : null
  };
});
let failNext = false;
const reads: Record<string, string>[] = [];
const actor = (role: string) => ({
  id: role === 'ADMIN' ? 1 : role === 'ORGANIZER' ? 2 : 3,
  userName: `fixture.${role.toLowerCase()}`,
  firstName: 'Fixture',
  lastName: role,
  email: `${role.toLowerCase()}@example.test`,
  role,
  status: 'ACTIVE',
  verified: true
});
http
  .createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://fixture.test');
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (url.pathname === '/test/stats') {
      send(200, { reads });
      return;
    }
    if (url.pathname === '/test/fail-next' && req.method === 'POST') {
      req.resume();
      failNext = true;
      send(200, { enabled: true });
      return;
    }
    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const input = JSON.parse(Buffer.concat(chunks).toString());
      const role = String(input.username).startsWith('user')
        ? 'USER'
        : String(input.username).startsWith('organizer')
          ? 'ORGANIZER'
          : 'ADMIN';
      send(200, {
        success: true,
        data: { accessToken: `admin-list-fixture-${role}`, tokenType: 'Bearer', user: actor(role) }
      });
      return;
    }
    const role = ['ADMIN', 'USER', 'ORGANIZER'].find(
      (value) => req.headers.authorization === `Bearer admin-list-fixture-${value}`
    );
    if (!role) {
      send(401, { message: 'Fixture sign-in required' });
      return;
    }
    if (url.pathname === '/api/auth/me') {
      send(200, { success: true, data: actor(role) });
      return;
    }
    if (url.pathname === '/api/auth/logout') {
      req.resume();
      send(200, { success: true });
      return;
    }
    if (url.pathname === '/api/admin/organizer-applications') {
      if (role !== 'ADMIN') {
        send(403, { message: 'Administrator access required' });
        return;
      }
      if (req.method !== 'GET') {
        send(405, { message: 'Read-only list' });
        return;
      }
      reads.push(Object.fromEntries(url.searchParams));
      await setTimeout(350);
      if (failNext) {
        failNext = false;
        send(500, { message: 'Simulated application query failure' });
        return;
      }
      const page = Number(url.searchParams.get('page') || 1),
        size = Number(url.searchParams.get('size') || 20);
      const status = url.searchParams.get('status'),
        search = url.searchParams.get('search')?.toLowerCase() || '';
      const field = url.searchParams.get('sortBy') || 'submittedAt',
        direction = url.searchParams.get('sortDir') === 'asc' ? 1 : -1;
      const filtered = applications.filter(
        (row) =>
          row.submittedAt !== null &&
          row.status !== 'DRAFT' &&
          (!status || row.status === status) &&
          [row.legalName, row.applicantUserName, row.applicantEmail].some((value) =>
            value.toLowerCase().includes(search)
          )
      );
      filtered.sort((left, right) => {
        const a = left[field as keyof typeof left],
          b = right[field as keyof typeof right];
        const compare =
          typeof a === 'number' && typeof b === 'number'
            ? a - b
            : String(a ?? '').localeCompare(String(b ?? ''));
        return compare * direction || right.id - left.id;
      });
      const totalRecords = filtered.length,
        totalPages = Math.ceil(totalRecords / size);
      send(200, {
        success: true,
        statusCode: 200,
        data: {
          listObjects: filtered.slice((page - 1) * size, page * size),
          pageNumber: page,
          pageSize: size,
          totalRecords,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1
        }
      });
      return;
    }
    send(404, { message: 'Unknown fixture route' });
  })
  .listen(4091, '127.0.0.1', () =>
    process.stdout.write('Admin applications RAM fixture listening on port 4091\n')
  );
