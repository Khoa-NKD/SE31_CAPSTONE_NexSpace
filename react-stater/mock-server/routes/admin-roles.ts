import type { ServerResponse } from 'node:http';
import { storage } from '../storage.ts';
import {
  validateUpdateRolePermissions,
  VALID_PERMISSION_KEYS,
  type PermissionUpdateItem
} from '../validators/admin-roles.ts';

export interface RoleSummaryKpi {
  id: string;
  title: string;
  value: string;
  badge?: string;
  subtext: string;
  icon: string;
}

export interface RolePermissionRecord {
  id: string;
  key: string;
  name: string;
  description: string;
  module: 'Workspaces' | 'Bookings' | 'Financials' | 'Moderation' | 'Governance';
  customer: boolean;
  organizer: boolean;
  administrator: boolean;
  organizerNotice?: string;
  icon: string;
}

interface UserKpiSource {
  role?: string;
  kycStatus?: string;
  twoFactorEnabled?: boolean;
}

/**
 * GET /api/v1/admin/roles/permissions
 * Retrieves all platform role permission definitions from centralized runtime store.
 */
export async function handleGetRolePermissions(
  res: ServerResponse,
  searchParams?: URLSearchParams
): Promise<void> {
  try {
    const allPermissions = await storage.getAll<RolePermissionRecord>('roles');
    const moduleFilter = searchParams?.get('module');

    let result = allPermissions;
    if (moduleFilter && moduleFilter !== 'all') {
      result = allPermissions.filter(
        (p) => p.module.toLowerCase() === moduleFilter.toLowerCase()
      );
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        },
        null,
        2
      )
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error reading role permissions';
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'InternalServerError', message: msg }));
  }
}

/**
 * GET /api/v1/admin/roles/kpis
 * Dynamically calculates summary account metrics across fixed platform business roles
 * directly from the authoritative users.json runtime store.
 */
export async function handleGetRoleKpis(res: ServerResponse): Promise<void> {
  try {
    const allUsers = await storage.getAll<UserKpiSource>('users');
    const totalCount = allUsers.length;
    const customerUsers = allUsers.filter((u) => u.role === 'Customer');
    const organizerUsers = allUsers.filter((u) => u.role === 'Organizer');
    const adminUsers = allUsers.filter((u) => u.role === 'Administrator');

    const customerCount = customerUsers.length;
    const organizerCount = organizerUsers.length;
    const adminCount = adminUsers.length;

    const customerPct = totalCount > 0 ? ((customerCount / totalCount) * 100).toFixed(1) : '0.0';

    const pendingKycCount = organizerUsers.filter(
      (u) => u.kycStatus === 'Pending KYC' || u.kycStatus?.toLowerCase().includes('pending')
    ).length;

    const adminMfaCount = adminUsers.filter((u) => Boolean(u.twoFactorEnabled)).length;
    const adminMfaPct = adminCount > 0 ? Math.round((adminMfaCount / adminCount) * 100) : 100;

    const liveKpis: RoleSummaryKpi[] = [
      {
        id: 'total-accounts',
        title: 'Total Accounts',
        value: totalCount.toLocaleString('en-US'),
        subtext: 'Across all tiers',
        icon: 'users'
      },
      {
        id: 'customers',
        title: 'Customers',
        value: customerCount.toLocaleString('en-US'),
        badge: `${customerPct}%`,
        subtext: 'Nomads & enterprise teams',
        icon: 'userCheck'
      },
      {
        id: 'space-organizers',
        title: 'Space Organizers',
        value: organizerCount.toLocaleString('en-US'),
        badge: `${pendingKycCount} pending KYC`,
        subtext: 'Verified legal entities',
        icon: 'building'
      },
      {
        id: 'administrators',
        title: 'Administrators',
        value: adminCount.toLocaleString('en-US'),
        badge: `MFA ${adminMfaPct}%`,
        subtext: 'SecOps, Support, Finance',
        icon: 'shieldCheck'
      }
    ];

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          success: true,
          data: liveKpis,
          timestamp: new Date().toISOString()
        },
        null,
        2
      )
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error reading role KPIs';
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'InternalServerError', message: msg }));
  }
}

/**
 * PUT /api/v1/admin/roles/permissions
 * Atomically updates role permissions in the centralized runtime store.
 */
export async function handleUpdateRolePermissions(
  res: ServerResponse,
  body: unknown
): Promise<void> {
  const validation = validateUpdateRolePermissions(body);

  if (!validation.isValid || !validation.value) {
    const validationErrors: Record<string, string> = {};
    for (const e of validation.errors) {
      validationErrors[e.field] = e.message;
    }

    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          success: false,
          status: 400,
          error: 'BadRequest',
          message: validation.errors[0]?.message || 'Validation failed on role permissions payload',
          validationErrors,
          timestamp: new Date().toISOString()
        },
        null,
        2
      )
    );
    return;
  }

  const updates = validation.value;

  try {
    const updatedList = await storage.updateBatch<RolePermissionRecord>('roles', (current) => {
      const updateMap = new Map<string, PermissionUpdateItem>();
      for (const item of updates) {
        updateMap.set(item.key, item);
      }

      return current.map((existing) => {
        const update = updateMap.get(existing.key);
        if (!update) return existing;

        return {
          ...existing,
          customer: update.customer !== undefined ? update.customer : existing.customer,
          organizer: update.organizer !== undefined ? update.organizer : existing.organizer,
          // Root policy: Administrator role always remains true
          administrator: true
        };
      });
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          success: true,
          message: `Successfully applied and signed ${updates.length} permission rule modifications.`,
          data: updatedList,
          timestamp: new Date().toISOString()
        },
        null,
        2
      )
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error updating role permissions';
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'InternalServerError', message: msg }));
  }
}

/**
 * PATCH /api/v1/admin/roles/permissions/:key
 * Updates a single permission rule by key.
 */
export async function handlePatchRolePermissionByKey(
  res: ServerResponse,
  key: string,
  body: unknown
): Promise<void> {
  if (!VALID_PERMISSION_KEYS.includes(key as (typeof VALID_PERMISSION_KEYS)[number])) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        status: 404,
        error: 'NotFound',
        message: `Permission key '${key}' does not exist in platform governance definitions.`,
        timestamp: new Date().toISOString()
      })
    );
    return;
  }

  const payload = {
    permissions: [{ key, ...(body && typeof body === 'object' ? (body as object) : {}) }]
  };

  await handleUpdateRolePermissions(res, payload);
}
