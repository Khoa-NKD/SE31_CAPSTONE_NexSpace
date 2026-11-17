import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getUserRole, checkRouteAccess, getSignInReturnPath } from './role-guard.ts';
import type { UserDto } from '../api/types.ts';

describe('Role Guard Access Control', () => {
  const adminUser: UserDto = {
    id: 1,
    userName: 'admin',
    email: 'admin@example.com',
    status: 'ACTIVE',
    role: 'ADMIN'
  };

  const organizerUser: UserDto = {
    id: 2,
    userName: 'organizer',
    email: 'organizer@example.com',
    status: 'ACTIVE',
    role: 'ORGANIZER'
  };

  const customerUser: UserDto = {
    id: 3,
    userName: 'customer',
    email: 'customer@example.com',
    status: 'ACTIVE',
    role: 'USER'
  };

  it('normalizes user roles correctly', () => {
    assert.strictEqual(getUserRole(null), 'USER');
    assert.strictEqual(getUserRole(undefined), 'USER');
    assert.strictEqual(getUserRole(adminUser), 'ADMIN');
    assert.strictEqual(getUserRole(organizerUser), 'ORGANIZER');
    assert.strictEqual(getUserRole(customerUser), 'USER');
    assert.strictEqual(getUserRole({ ...customerUser, role: 'ROLE_ADMIN' }), 'ADMIN');
    assert.strictEqual(getUserRole({ ...customerUser, roles: ['ROLE_ORGANIZER'] }), 'ORGANIZER');
  });

  it('allows public routes for any state', () => {
    assert.strictEqual(checkRouteAccess('/', false, null).allowed, true);
    assert.strictEqual(checkRouteAccess('/workspaces', false, null).allowed, true);
    assert.strictEqual(checkRouteAccess('/workspaces/1', false, null).allowed, true);
    assert.strictEqual(checkRouteAccess('/auth/sign-in', false, null).allowed, true);
    assert.strictEqual(checkRouteAccess('/about', true, adminUser).allowed, true);
  });

  it('preserves authorized Organizer email destinations and rejects invalid return paths', () => {
    assert.strictEqual(getSignInReturnPath('/organizer/apply', customerUser), '/organizer/apply');
    assert.strictEqual(
      getSignInReturnPath('/dashboard/organizer/application?view=contract#agreement', organizerUser),
      '/dashboard/organizer/application?view=contract#agreement'
    );
    assert.strictEqual(getSignInReturnPath('/dashboard/organizer/application', customerUser), undefined);
    for (const path of ['//example.com', '/\\example.com', '/foo/../dashboard/admin', '/auth/sign-in/']) {
      assert.strictEqual(getSignInReturnPath(path, organizerUser), undefined);
    }
  });

  it('redirects unauthenticated users attempting to access dashboard', () => {
    const res = checkRouteAccess('/dashboard/overview', false, null);
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.redirectUrl, '/auth/sign-in?redirect=%2Fdashboard%2Foverview');
  });

  it('allows all 3 roles to access common user dashboard pages', () => {
    // Overview
    assert.strictEqual(checkRouteAccess('/dashboard/overview', true, adminUser).allowed, true);
    assert.strictEqual(checkRouteAccess('/dashboard/overview', true, organizerUser).allowed, true);
    assert.strictEqual(checkRouteAccess('/dashboard/overview', true, customerUser).allowed, true);

    // Settings
    assert.strictEqual(checkRouteAccess('/dashboard/settings', true, adminUser).allowed, true);
    assert.strictEqual(checkRouteAccess('/dashboard/settings', true, organizerUser).allowed, true);
    assert.strictEqual(checkRouteAccess('/dashboard/settings', true, customerUser).allowed, true);

    // Chat & Kanban
    assert.strictEqual(checkRouteAccess('/dashboard/chat', true, adminUser).allowed, true);
    assert.strictEqual(checkRouteAccess('/dashboard/kanban', true, organizerUser).allowed, true);
  });

  it('enforces Admin-only access to /dashboard/admin/*', () => {
    // ADMIN: Allowed
    assert.strictEqual(checkRouteAccess('/dashboard/admin/amenities', true, adminUser).allowed, true);
    assert.strictEqual(checkRouteAccess('/dashboard/admin/workspaces', true, adminUser).allowed, true);

    // ORGANIZER: Blocked -> redirects to /dashboard/organizer/workspaces
    const orgCheck = checkRouteAccess('/dashboard/admin/amenities', true, organizerUser);
    assert.strictEqual(orgCheck.allowed, false);
    assert.strictEqual(orgCheck.redirectUrl, '/dashboard/organizer/workspaces');

    // USER: Blocked -> redirects to /dashboard/overview
    const userCheck = checkRouteAccess('/dashboard/admin/amenities', true, customerUser);
    assert.strictEqual(userCheck.allowed, false);
    assert.strictEqual(userCheck.redirectUrl, '/dashboard/overview');
  });

  it('enforces Organizer-only access to /dashboard/organizer/*', () => {
    // ORGANIZER: Allowed
    assert.strictEqual(checkRouteAccess('/dashboard/organizer/workspaces', true, organizerUser).allowed, true);
    assert.strictEqual(
      checkRouteAccess('/dashboard/organizer/workspaces/create/amenities', true, organizerUser).allowed,
      true
    );

    // ADMIN: Blocked -> redirects to /dashboard/overview
    const adminCheck = checkRouteAccess('/dashboard/organizer/workspaces', true, adminUser);
    assert.strictEqual(adminCheck.allowed, false);
    assert.strictEqual(adminCheck.redirectUrl, '/dashboard/overview');

    // USER: Blocked -> redirects to /dashboard/overview
    const userCheck = checkRouteAccess('/dashboard/organizer/workspaces', true, customerUser);
    assert.strictEqual(userCheck.allowed, false);
    assert.strictEqual(userCheck.redirectUrl, '/dashboard/overview');
  });
});
