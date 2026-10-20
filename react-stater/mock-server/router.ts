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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  // Set Default CORS Headers on all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');

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
