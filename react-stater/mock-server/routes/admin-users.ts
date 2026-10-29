import type { ServerResponse } from 'node:http';
import { storage } from '../storage.ts';
import { validateUpdateAdminUserStatus } from '../validators/admin-users.ts';

export interface AdminUserRecord {
  id: string;
  name: string;
  legalName: string;
  email: string;
  phone: string;
  company: string;
  role: 'Customer' | 'Organizer' | 'Administrator';
  status: 'Active' | 'Locked' | 'Inactive';
  kycStatus: 'Verified KYC' | 'Pending KYC' | 'Unverified';
  registeredDate: string;
  registeredTimeUtc: string;
  avatarUrl: string;
  registrationIp: string;
  timezone: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  lastLogin: string;
  clientFingerprint: string;
  consecutiveFailedLogins: number;
  sessionRootKey: string;
  passwordLastChanged: string;
  stats: {
    totalBookings: number;
    gmvAmount: string;
    activeEscrows: number;
    escrowHoldAmount: string;
    disputesCount: number;
  };
  activityLogs: Array<{
    id: string;
    title: string;
    timestamp: string;
    detail: string;
    type: 'booking' | 'payment' | 'security' | 'moderation';
  }>;
}

/**
 * GET /api/v1/admin/users
 * Lists users with optional query filtering (search, role, status, kyc).
 */
export async function handleGetAdminUsers(
  res: ServerResponse,
  searchParams: URLSearchParams
): Promise<void> {
  try {
    const allUsers = await storage.getAll<AdminUserRecord>('users');

    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const kyc = searchParams.get('kyc');

    let filtered = allUsers;

    if (search) {
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.id.toLowerCase().includes(search)
      );
    }

    if (role && role !== 'all') {
      filtered = filtered.filter((u) => u.role.toLowerCase() === role.toLowerCase());
    }

    if (status && status !== 'all') {
      filtered = filtered.filter((u) => u.status.toLowerCase() === status.toLowerCase());
    }

    if (kyc && kyc !== 'all') {
      filtered = filtered.filter((u) => u.kycStatus.toLowerCase() === kyc.toLowerCase());
    }

    const payload = {
      success: true,
      data: {
        content: filtered,
        totalElements: filtered.length,
        totalPages: 1,
        page: 0,
        size: filtered.length
      },
      timestamp: new Date().toISOString()
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload, null, 2));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error retrieving admin users';
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'InternalServerError', message: msg }));
  }
}

/**
 * GET /api/v1/admin/users/:id
 * Retrieves a single user record by ID.
 */
export async function handleGetAdminUserById(res: ServerResponse, id: string): Promise<void> {
  try {
    const user = await storage.getById<AdminUserRecord>('users', id);
    if (!user) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 404,
          error: 'NotFound',
          message: `User with id '${id}' was not found.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          success: true,
          data: user,
          timestamp: new Date().toISOString()
        },
        null,
        2
      )
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error retrieving admin user';
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'InternalServerError', message: msg }));
  }
}

/**
 * PATCH /api/v1/admin/users/:id/status
 * Updates moderation status (Active | Locked | Inactive) and writes audit log.
 */
export async function handleUpdateAdminUserStatus(
  res: ServerResponse,
  id: string,
  rawBody: unknown
): Promise<void> {
  const { errors, value } = validateUpdateAdminUserStatus(rawBody);

  if (errors.length > 0 || !value) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          success: false,
          status: 400,
          error: 'BadRequest',
          message: 'Validation failed for user status update.',
          validationErrors: errors.reduce<Record<string, string>>((acc, curr) => {
            acc[curr.field] = curr.message;
            return acc;
          }, {}),
          timestamp: new Date().toISOString()
        },
        null,
        2
      )
    );
    return;
  }

  try {
    const updated = await storage.update<AdminUserRecord>('users', id, (current) => {
      const next = { ...current };
      const prevStatus = current.status;
      next.status = value.status;

      const actionTitle =
        value.status === 'Locked'
          ? 'Account Locked by Administrator'
          : value.status === 'Active'
          ? 'Account Unlocked by Administrator'
          : `Account Status Changed to ${value.status}`;

      const detail =
        value.reason ||
        (value.status === 'Locked'
          ? 'Administrative suspension applied in Console.'
          : value.status === 'Active'
          ? 'Administrative suspension removed in Console.'
          : `Status updated from ${prevStatus} to ${value.status}.`);

      next.activityLogs = [
        {
          id: `act-${Date.now()}`,
          title: actionTitle,
          timestamp: 'Just now',
          detail,
          type: 'security'
        },
        ...(current.activityLogs || [])
      ];

      return next;
    });

    if (!updated) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 404,
          error: 'NotFound',
          message: `User with id '${id}' was not found.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          success: true,
          message: `User account status updated to ${value.status}.`,
          data: updated,
          timestamp: new Date().toISOString()
        },
        null,
        2
      )
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error updating user status';
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'InternalServerError', message: msg }));
  }
}
