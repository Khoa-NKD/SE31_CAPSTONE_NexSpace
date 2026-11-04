/** Browser fixture: no real documents, disk storage or database writes. */
import http from 'node:http';
import { setTimeout } from 'node:timers/promises';
import type { ApplicationDetails } from '../../src/features/organizer-application/api/application.ts';

if (process.env.NEXSPACE_UI_FIXTURE !== '1')
  throw new Error('Explicit NEXSPACE_UI_FIXTURE=1 is required');
const account = {
  id: 7,
  userName: 'fixture.applicant',
  fullName: 'Test Applicant',
  email: 'applicant@example.test',
  role: 'USER',
  status: 'ACTIVE',
  verified: true
};
const supportedDocumentTypes = [
  'BUSINESS_LICENSE',
  'ID_CARD_FRONT',
  'ID_CARD_BACK',
  'TAX_CERTIFICATE',
  'OTHER'
];
const documents = [
  {
    id: 1,
    documentType: 'BUSINESS_LICENSE',
    fileName: 'existing-license.pdf',
    status: 'PENDING',
    uploadedAt: '2026-11-04T08:00:00'
  }
];
let uploadAllowed = true;
let attempts = 0;
let failNext = false;
const draftMode = process.env.NEXSPACE_DRAFT_FIXTURE === '1';
let application: ApplicationDetails | null = null;
let submissions = 0;
if (draftMode) documents.length = 0;
http
  .createServer(async (req, res) => {
    const send = (status: number, data: unknown) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };
    if (req.url === '/test/stats') {
      send(200, { attempts, documents, uploadAllowed, application, submissions });
      return;
    }
    if (req.method === 'POST' && req.url === '/test/claim-front') {
      req.resume();
      if (!documents.some((document) => document.documentType === 'ID_CARD_FRONT')) {
        documents.unshift({
          id: documents.length + 1,
          documentType: 'ID_CARD_FRONT',
          fileName: 'concurrent-evidence.pdf',
          status: 'PENDING',
          uploadedAt: '2026-11-04T09:00:00'
        });
      }
      send(200, { claimed: true });
      return;
    }
    if (req.method === 'POST' && req.url === '/test/fail-next') {
      req.resume();
      failNext = true;
      send(200, { enabled: true });
      return;
    }
    if (req.method === 'POST' && req.url === '/test/lock-profile') {
      req.resume();
      uploadAllowed = false;
      send(200, { uploadAllowed });
      return;
    }
    if (req.url === '/api/auth/login' && req.method === 'POST') {
      req.resume();
      send(200, {
        success: true,
        data: { accessToken: 'documents-browser-fixture', tokenType: 'Bearer', user: account }
      });
      return;
    }
    if (req.headers.authorization !== 'Bearer documents-browser-fixture') {
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
    if (draftMode && req.url?.startsWith('/api/organizer/applications/')) {
      if (req.url.endsWith('/current')) {
        send(
          application ? 200 : 404,
          application ? { success: true, data: application } : { message: 'No application yet' }
        );
        return;
      }
      if (req.url.endsWith('/draft') && req.method === 'POST') {
        application ??= { id: 42, status: 'DRAFT' };
        send(200, { success: true, data: application });
        return;
      }
      if (!application || application.status !== 'DRAFT') {
        send(409, { message: 'Only DRAFT profiles can be changed' });
        return;
      }
      if (req.url.endsWith('/draft') && req.method === 'PUT') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const snapshot = JSON.parse(Buffer.concat(chunks).toString());
        application = { ...snapshot, id: 42, status: 'DRAFT' };
        send(200, { success: true, data: application });
        return;
      }
      if (req.url.endsWith('/submit') && req.method === 'POST') {
        const errors: Record<string, string> = {};
        for (const field of [
          'legalName',
          'businessType',
          'taxId',
          'representativeName',
          'address',
          'contactPhone',
          'contactEmail'
        ] as const) {
          if (!application[field]?.trim()) errors[field] = `${field} is required`;
        }
        if (!documents.some((document) => document.documentType === 'BUSINESS_LICENSE'))
          errors.businessLicense = 'Upload a current business license before submitting';
        if (Object.keys(errors).length) {
          send(400, { message: 'Application incomplete', errors });
          return;
        }
        submissions++;
        application.status = 'PENDING_REVIEW';
        application.submittedAt = '2026-11-04T10:00:00';
        uploadAllowed = false;
        send(200, {
          success: true,
          data: {
            id: application.id,
            status: application.status,
            submittedAt: application.submittedAt
          }
        });
        return;
      }
    }
    if (req.url === '/api/organizer/verification-documents') {
      if (req.method === 'GET') {
        await setTimeout(300);
        send(200, {
          success: true,
          data: {
            profileId: 42,
            uploadAllowed,
            maxFileSizeBytes: 5 * 1024 * 1024,
            supportedDocumentTypes,
            documents
          }
        });
        return;
      }
      if (req.method === 'POST') {
        attempts++;
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        const request = new Request('http://localhost/api/organizer/verification-documents', {
          method: 'POST',
          headers: { 'Content-Type': req.headers['content-type'] ?? '' },
          body: Buffer.concat(chunks)
        });
        const payload = await request.formData();
        const type = String(payload.get('documentType'));
        const file = payload.get('file');
        await setTimeout(700);
        if (failNext) {
          failNext = false;
          send(500, { success: false, message: 'Simulated upload failure. Please try again.' });
          return;
        }
        if (!uploadAllowed || documents.some((document) => document.documentType === type)) {
          send(409, {
            success: false,
            message: 'Upload is not permitted for this profile or type.'
          });
          return;
        }
        if (!(file instanceof File) || !supportedDocumentTypes.includes(type)) {
          send(400, { success: false, message: 'Invalid multipart fields' });
          return;
        }
        const document = {
          id: documents.length + 1,
          documentType: type,
          fileName: file.name,
          status: 'PENDING',
          uploadedAt: '2026-11-04T09:00:00'
        };
        documents.unshift(document);
        send(201, { success: true, data: document });
        return;
      }
    }
    send(404, { success: false, message: 'Unknown fixture endpoint' });
  })
  .listen(4089, '127.0.0.1', () =>
    process.stdout.write('In-memory verification document fixture listening on port 4089\n')
  );
