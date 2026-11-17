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
// Reviewed scenarios populate the same nullable fields returned by the real read-only API.
const reviewFeedbackById: Record<number, string> = {
  37: 'Business registration, legal representative and contact details match the submitted documents.',
  39: 'The business license does not show the complete registration number. A valid, legible copy is required.',
  40: 'Please clarify the registered address.'
};
const documentFeedbackById: Record<number, string> = {
  37: 'Company name and tax ID match the application. The license is legible.',
  39: 'The registration number is cropped from the uploaded scan.',
  40: 'The license address differs from the application address. Please clarify the discrepancy.'
};
function demoPdf(): Buffer {
  const text =
    'BT /F1 18 Tf 40 760 Td (NexSpace - Synthetic verification document) Tj 0 -30 Td /F1 12 Tf (Demo data only. Not a legal business license.) Tj ET';
  const secondPage = 'BT /F1 18 Tf 40 760 Td (Page 2 - Synthetic supporting evidence) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    `<< /Length ${Buffer.byteLength(secondPage)} >>\nstream\n${secondPage}\nendstream`
  ];
  let file = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(file));
    file += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(file);
  file += `xref\n0 8\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
    .join('')}trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(file);
}
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
    const contentMatch = url.pathname.match(
      /^\/api\/admin\/organizer-applications\/(\d+)\/documents\/(\d+)\/content$/
    );
    if (contentMatch) {
      if (role !== 'ADMIN') {
        send(403, { message: 'Administrator access required' });
        return;
      }
      if (req.method !== 'GET') {
        send(405, { message: 'Read-only file' });
        return;
      }
      const applicationId = Number(contentMatch[1]),
        documentId = Number(contentMatch[2]);
      if (
        !applications.some((row) => row.id === applicationId && row.submittedAt !== null) ||
        applicationId === 38 ||
        ![8, 9].includes(documentId)
      ) {
        send(404, { message: 'Verification document file not found' });
        return;
      }
      if (failNext) {
        failNext = false;
        send(502, {
          message: 'Verification document is temporarily unavailable. Please try again later'
        });
        return;
      }
      await setTimeout(400);
      const png = documentId === 8;
      const bytes = png
        ? Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFj8AAAAASUVORK5CYII=',
            'base64'
          )
        : demoPdf();
      res.writeHead(200, {
        'Content-Type': png ? 'image/png' : 'application/pdf',
        'Content-Length': bytes.length,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `${url.searchParams.get('download') === 'true' ? 'attachment' : 'inline'}; filename="${png ? 'previous-license.png' : 'business-license.pdf'}"`
      });
      res.end(bytes);
      return;
    }
    if (/^\/api\/admin\/organizer-applications\/[^/]+$/.test(url.pathname)) {
      if (role !== 'ADMIN') {
        send(403, { message: 'Administrator access required' });
        return;
      }
      if (req.method !== 'GET') {
        send(405, { message: 'Read-only detail' });
        return;
      }
      await setTimeout(700);
      if (failNext) {
        failNext = false;
        send(500, { message: 'Simulated detail query failure' });
        return;
      }
      const rawId = url.pathname.split('/').pop() ?? '';
      if (!/^[1-9]\d*$/.test(rawId)) {
        send(400, { message: 'Invalid application ID' });
        return;
      }
      const row = applications.find(
        (item) => item.id === Number(rawId) && item.submittedAt !== null && item.status !== 'DRAFT'
      );
      if (!row) {
        send(404, { message: 'Submitted organizer application not found' });
        return;
      }
      send(200, {
        success: true,
        statusCode: 200,
        data: {
          id: row.id,
          legalName: row.legalName,
          businessType: row.businessType,
          taxId: '0400000123',
          representativeName: 'Test Representative',
          address: '12 Test Street, Da Nang',
          contactEmail: 'contact@example.test',
          contactPhone: '0900000123',
          applicant: {
            id: row.applicantId,
            userName: row.applicantUserName,
            email: row.applicantEmail,
            fullName: 'Test Applicant'
          },
          status: row.status,
          submittedAt: row.submittedAt,
          reviewedAt: row.reviewedAt,
          reviewFeedback: reviewFeedbackById[row.id] ?? null,
          documents:
            row.id === 38
              ? []
              : [
                  {
                    id: 9,
                    documentType: 'BUSINESS_LICENSE',
                    fileName: 'business-license.pdf',
                    status: row.id === 37 ? 'VERIFIED' : row.id >= 39 ? 'REJECTED' : 'PENDING',
                    uploadedAt: row.submittedAt,
                    current: true,
                    adminFeedback: documentFeedbackById[row.id] ?? null
                  },
                  {
                    id: 8,
                    documentType: 'BUSINESS_LICENSE',
                    fileName: 'previous-license.png',
                    status: 'REJECTED',
                    uploadedAt: row.submittedAt,
                    current: false,
                    adminFeedback: 'Unclear scan.'
                  }
                ]
        }
      });
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
