import type { ServerResponse } from 'node:http';
import { storage } from '../storage.ts';
import { validateCreateDemoUser, validateUpdateDemoUser } from '../validators/demo.ts';

interface AdminUserRecord {
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

export async function handleGetDemoUsers(
  res: ServerResponse,
  searchParams: URLSearchParams
): Promise<void> {
  try {
    const allUsers = await storage.getAll<AdminUserRecord>('users');

    const search = searchParams.get('search')?.toLowerCase() || '';
    const role = searchParams.get('role');
    const status = searchParams.get('status');

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
    const msg = err instanceof Error ? err.message : 'Error retrieving users';
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'InternalServerError', message: msg }));
  }
}

export async function handleGetDemoUserById(res: ServerResponse, id: string): Promise<void> {
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
    const msg = err instanceof Error ? err.message : 'Error retrieving user';
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'InternalServerError', message: msg }));
  }
}

export async function handleCreateDemoUser(res: ServerResponse, rawBody: unknown): Promise<void> {
  const { errors, value } = validateCreateDemoUser(rawBody);
  if (errors.length > 0 || !value) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          success: false,
          status: 400,
          error: 'BadRequest',
          message: 'Validation failed for user creation.',
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
    const existing = await storage.getAll<AdminUserRecord>('users');
    const emailConflict = existing.some((u) => u.email.toLowerCase() === value.email.toLowerCase());
    if (emailConflict) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 409,
          error: 'Conflict',
          message: `A user with email '${value.email}' already exists.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const newId = `USR-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();

    const newUser: AdminUserRecord = {
      id: newId,
      name: value.name,
      legalName: value.name,
      email: value.email,
      phone: value.phone || '+84 901 000 000',
      company: value.company || 'Enterprise Team',
      role: value.role,
      status: value.status || 'Active',
      kycStatus: value.kycStatus || 'Pending KYC',
      registeredDate: now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      registeredTimeUtc: now.toISOString(),
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      registrationIp: '118.69.182.44 (HCMC)',
      timezone: 'Asia/Ho_Chi_Minh (UTC+7)',
      twoFactorEnabled: false,
      twoFactorMethod: 'SMS OTP',
      lastLogin: 'Never',
      clientFingerprint: `fp-${Math.random().toString(36).substring(2, 9)}`,
      consecutiveFailedLogins: 0,
      sessionRootKey: `sk_live_${Math.random().toString(36).substring(2, 10)}`,
      passwordLastChanged: now.toISOString(),
      stats: {
        totalBookings: 0,
        gmvAmount: '$0.00 USD',
        activeEscrows: 0,
        escrowHoldAmount: '$0.00 USD',
        disputesCount: 0
      },
      activityLogs: [
        {
          id: `log-${Date.now()}`,
          title: 'Account Provisioned via Mock REST API',
          timestamp: 'Just now',
          detail: `User record created via POST /api/v1/demo/users with initial status ${value.status || 'Active'}.`,
          type: 'moderation'
        }
      ]
    };

    const saved = await storage.create<AdminUserRecord>('users', newUser);

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          success: true,
          message: 'User created successfully.',
          data: saved,
          timestamp: new Date().toISOString()
        },
        null,
        2
      )
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error creating user';
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'InternalServerError', message: msg }));
  }
}

export async function handleUpdateDemoUser(
  res: ServerResponse,
  id: string,
  rawBody: unknown
): Promise<void> {
  const { errors, value } = validateUpdateDemoUser(rawBody);
  if (errors.length > 0 || !value) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          success: false,
          status: 400,
          error: 'BadRequest',
          message: 'Validation failed for user update.',
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
      if (value.name !== undefined) next.name = value.name;
      if (value.email !== undefined) next.email = value.email;
      if (value.role !== undefined) next.role = value.role;
      if (value.status !== undefined) next.status = value.status;
      if (value.phone !== undefined) next.phone = value.phone;
      if (value.company !== undefined) next.company = value.company;
      if (value.kycStatus !== undefined) next.kycStatus = value.kycStatus;

      next.activityLogs = [
        {
          id: `log-${Date.now()}`,
          title: 'Account Updated via Mock REST API',
          timestamp: 'Just now',
          detail: `Fields modified: ${Object.keys(value).join(', ')}.`,
          type: 'moderation'
        },
        ...current.activityLogs
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
          message: 'User updated successfully.',
          data: updated,
          timestamp: new Date().toISOString()
        },
        null,
        2
      )
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error updating user';
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'InternalServerError', message: msg }));
  }
}
