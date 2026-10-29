import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleHealthCheck } from './routes/health.ts';
import { handleDevReset } from './routes/dev.ts';
import {
  handleGetDemoUsers,
  handleGetDemoUserById,
  handleCreateDemoUser,
  handleUpdateDemoUser
} from './routes/demo.ts';
import {
  handleGetAdminUsers,
  handleGetAdminUserById,
  handleUpdateAdminUserStatus
} from './routes/admin-users.ts';
import {
  handleGetRolePermissions,
  handleGetRoleKpis,
  handleUpdateRolePermissions,
  handlePatchRolePermissionByKey
} from './routes/admin-roles.ts';
import {
  handleGetWorkspaces,
  handleGetWorkspaceById,
  handleGetPublicWorkspaces,
  handleGetPublicWorkspaceById,
  handleGetAdminWorkspaceKpis,
  handleCreateWorkspace,
  handleUpdateWorkspace,
  handleWorkspaceLifecycle,
  handleWorkspaceSubmit,
  handleAdminReviewWorkspace,
  handleAdminModerationWorkspace
} from './routes/workspaces.ts';
import {
  handleMediaUpload,
  handleGetMedia
} from './routes/media.ts';

export async function parseJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      // Guard against payload flood
      if (body.length > 5 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload too large: exceeds 5MB limit'));
      }
    });
    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err: unknown) {
        const syntaxErr = err instanceof SyntaxError ? err : new SyntaxError('Malformed JSON payload');
        reject(syntaxErr);
      }
    });
    req.on('error', (err) => reject(err));
  });
}

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  startTime: number
): Promise<void> {
  const method = req.method?.toUpperCase() || 'GET';
  const rawUrl = req.url || '/';
  const urlObj = new URL(rawUrl, `http://${req.headers.host || 'localhost:4000'}`);
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  // Handle CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With, X-Organizer-Id, X-Mock-User-Id, X-Mock-Role',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  // Set Default CORS Headers on all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, X-Organizer-Id, X-Mock-User-Id, X-Mock-Role');

  // Development Media Upload (Multipart Stream): POST /api/v1/media/upload
  if (pathname === '/api/v1/media/upload' && method === 'POST') {
    await handleMediaUpload(req, res);
    return;
  }

  // Development Media Retrieval (Binary Image Stream): GET /api/v1/media/:mediaId
  const mediaGetMatch = pathname.match(/^\/api\/v1\/media\/([a-zA-Z0-9_.-]+)$/);
  if (mediaGetMatch && (method === 'GET' || method === 'HEAD')) {
    await handleGetMedia(res, mediaGetMatch[1]);
    return;
  }

  // Parse Body for mutations
  let body: unknown = null;
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    try {
      body = await parseJsonBody(req);
    } catch (err: unknown) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 400,
          error: 'BadRequest',
          message: err instanceof Error ? err.message : 'Invalid JSON body in request',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }
  }

  // Router Dispatch Table
  // 1. Health check: GET /api/v1/health
  if (pathname === '/api/v1/health' && method === 'GET') {
    handleHealthCheck(req, res, startTime);
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  // 2. Dev reset: POST /api/v1/dev/reset (Development/testing only)
  if (pathname === '/api/v1/dev/reset' && method === 'POST') {
    if (isProduction) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: 'Destructive reset endpoints are strictly forbidden in production environments.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }
    await handleDevReset(req, res);
    return;
  }

  // 3. Demo Users List & Create: /api/v1/demo/users (Development/testing only)
  if (pathname === '/api/v1/demo/users') {
    if (isProduction) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: 'Demonstration endpoints are disabled in production environments.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }
    if (method === 'GET') {
      await handleGetDemoUsers(res, searchParams);
      return;
    }
    if (method === 'POST') {
      await handleCreateDemoUser(res, body);
      return;
    }
  }

  // 4. Demo User Detail & Update: /api/v1/demo/users/:id (Development/testing only)
  const userDetailMatch = pathname.match(/^\/api\/v1\/demo\/users\/([a-zA-Z0-9_-]+)$/);
  if (userDetailMatch) {
    if (isProduction) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: 'Demonstration endpoints are disabled in production environments.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }
    const userId = userDetailMatch[1];
    if (method === 'GET') {
      await handleGetDemoUserById(res, userId);
      return;
    }
    if (method === 'PATCH' || method === 'PUT') {
      await handleUpdateDemoUser(res, userId, body);
      return;
    }
  }

  // 5. Admin Users List (A03): GET /api/v1/admin/users
  if (pathname === '/api/v1/admin/users') {
    if (method === 'GET') {
      await handleGetAdminUsers(res, searchParams);
      return;
    }
  }

  // 6. Admin User Status Update (A03): PATCH /api/v1/admin/users/:id/status
  const adminUserStatusMatch = pathname.match(/^\/api\/v1\/admin\/users\/([a-zA-Z0-9_-]+)\/status$/);
  if (adminUserStatusMatch) {
    const userId = adminUserStatusMatch[1];
    if (method === 'PATCH') {
      await handleUpdateAdminUserStatus(res, userId, body);
      return;
    }
  }

  // 7. Admin User Detail (A03): GET /api/v1/admin/users/:id
  const adminUserDetailMatch = pathname.match(/^\/api\/v1\/admin\/users\/([a-zA-Z0-9_-]+)$/);
  if (adminUserDetailMatch) {
    const userId = adminUserDetailMatch[1];
    if (method === 'GET') {
      await handleGetAdminUserById(res, userId);
      return;
    }
  }

  // 8. Admin Role Permissions Matrix (A02): GET /api/v1/admin/roles/permissions & PUT /api/v1/admin/roles/permissions
  if (pathname === '/api/v1/admin/roles/permissions') {
    if (method === 'GET') {
      await handleGetRolePermissions(res, searchParams);
      return;
    }
    if (method === 'PUT') {
      await handleUpdateRolePermissions(res, body);
      return;
    }
  }

  // 9. Admin Single Role Permission (A02): PATCH /api/v1/admin/roles/permissions/:key
  const rolePermMatch = pathname.match(/^\/api\/v1\/admin\/roles\/permissions\/([a-zA-Z0-9_:-]+)$/);
  if (rolePermMatch) {
    const permKey = rolePermMatch[1];
    if (method === 'PATCH') {
      await handlePatchRolePermissionByKey(res, permKey, body);
      return;
    }
  }

  // 10. Admin Role KPIs (A02): GET /api/v1/admin/roles/kpis
  if (pathname === '/api/v1/admin/roles/kpis') {
    if (method === 'GET') {
      await handleGetRoleKpis(res);
      return;
    }
  }

  // 11. Public Workspaces List: GET /api/v1/public/workspaces
  if (pathname === '/api/v1/public/workspaces' && method === 'GET') {
    await handleGetPublicWorkspaces(res, searchParams);
    return;
  }

  // 12. Public Workspace Detail: GET /api/v1/public/workspaces/:id
  const publicWorkspaceDetailMatch = pathname.match(/^\/api\/v1\/public\/workspaces\/([a-zA-Z0-9_.-]+)$/);
  if (publicWorkspaceDetailMatch && method === 'GET') {
    const workspaceId = publicWorkspaceDetailMatch[1];
    await handleGetPublicWorkspaceById(res, workspaceId);
    return;
  }

  // 13. Admin Workspace KPIs (A06): GET /api/v1/admin/workspaces/kpis
  if (pathname === '/api/v1/admin/workspaces/kpis' && method === 'GET') {
    await handleGetAdminWorkspaceKpis(req, res);
    return;
  }

  // 14. Admin Workspace Review Governance: PATCH/PUT /api/v1/admin/workspaces/:id/review
  const adminReviewMatch = pathname.match(/^\/api\/v1\/admin\/workspaces\/([a-zA-Z0-9_.-]+)\/review$/);
  if (adminReviewMatch && (method === 'PATCH' || method === 'PUT')) {
    const workspaceId = adminReviewMatch[1];
    await handleAdminReviewWorkspace(req, res, workspaceId, body);
    return;
  }

  // 14. Admin Workspace Moderation: PATCH/PUT /api/v1/admin/workspaces/:id/moderation
  const adminModerationMatch = pathname.match(/^\/api\/v1\/admin\/workspaces\/([a-zA-Z0-9_.-]+)\/moderation$/);
  if (adminModerationMatch && (method === 'PATCH' || method === 'PUT')) {
    const workspaceId = adminModerationMatch[1];
    await handleAdminModerationWorkspace(req, res, workspaceId, body);
    return;
  }

  // 15. Workspaces List & Create: GET /api/v1/workspaces, GET /api/v1/organizer/workspaces & POST /api/v1/workspaces
  if (pathname === '/api/v1/workspaces' || pathname === '/api/v1/organizer/workspaces') {
    if (method === 'GET') {
      await handleGetWorkspaces(req, res, searchParams);
      return;
    }
    if (method === 'POST') {
      await handleCreateWorkspace(req, res, body);
      return;
    }
  }

  // 16. Organizer Workspace Lifecycle Commands: PATCH /api/v1/workspaces/:id/lifecycle
  const workspaceLifecycleMatch = pathname.match(/^\/api\/v1\/workspaces\/([a-zA-Z0-9_.-]+)\/lifecycle$/);
  if (workspaceLifecycleMatch && method === 'PATCH') {
    const workspaceId = workspaceLifecycleMatch[1];
    await handleWorkspaceLifecycle(req, res, workspaceId, body);
    return;
  }

  // 17. Organizer Workspace Submission: POST /api/v1/workspaces/:id/submit
  const workspaceSubmitMatch = pathname.match(/^\/api\/v1\/workspaces\/([a-zA-Z0-9_.-]+)\/submit$/);
  if (workspaceSubmitMatch && method === 'POST') {
    const workspaceId = workspaceSubmitMatch[1];
    await handleWorkspaceSubmit(req, res, workspaceId, body);
    return;
  }

  // 18. Workspace Detail & Update: GET /api/v1/workspaces/:id & PATCH/PUT /api/v1/workspaces/:id
  const workspaceDetailMatch = pathname.match(/^\/api\/v1\/workspaces\/([a-zA-Z0-9_.-]+)$/);
  if (workspaceDetailMatch) {
    const workspaceId = workspaceDetailMatch[1];
    if (method === 'GET') {
      await handleGetWorkspaceById(req, res, workspaceId);
      return;
    }
    if (method === 'PATCH' || method === 'PUT') {
      await handleUpdateWorkspace(req, res, workspaceId, body);
      return;
    }
  }

  // Fallback 404 Not Found
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      success: false,
      status: 404,
      error: 'NotFound',
      message: `Endpoint '${method} ${pathname}' is not recognized by the NexSpace Mock REST API.`,
      path: pathname,
      timestamp: new Date().toISOString()
    })
  );
}
