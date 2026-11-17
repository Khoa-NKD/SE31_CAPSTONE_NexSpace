export interface PermissionUpdateItem {
  key: string;
  customer?: boolean;
  organizer?: boolean;
  administrator?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
}

export const VALID_PERMISSION_KEYS = [
  'workspace:view_public',
  'workspace:create_draft',
  'workspace:publish',
  'booking:create',
  'booking:cancel',
  'financial:export_ledger',
  'financial:payout_request',
  'refund:approve',
  'review:dispute_flag',
  'moderation:ban_user',
  'audit_log:export'
] as const;

export const VALID_ROLES = ['customer', 'organizer', 'administrator'] as const;

/**
 * Invariant platform permission constraints per tenant business role.
 * Defines which permissions are fixed and cannot be granted or revoked.
 * Server-side validation enforces these independently of disabled UI controls.
 */
export const ROLE_PERMISSION_CONSTRAINTS: Record<
  string,
  {
    customer?: { allowed: boolean; reason: string };
    organizer?: { allowed: boolean; reason: string };
  }
> = {
  'workspace:create_draft': {
    customer: {
      allowed: false,
      reason: "Customer role cannot receive 'workspace:create_draft': tenant role segregation forbids customers from authoring workspaces."
    }
  },
  'workspace:publish': {
    customer: {
      allowed: false,
      reason: "Customer role cannot receive 'workspace:publish': only verified legal organizers may publish workspace listings."
    }
  },
  'booking:create': {
    organizer: {
      allowed: false,
      reason: "Organizer role cannot receive 'booking:create': organizers operate venues and do not initiate client reservations in this matrix."
    }
  },
  'financial:export_ledger': {
    customer: {
      allowed: false,
      reason: "Customer role cannot receive 'financial:export_ledger': financial ledger exports are reserved for space organizers and finance teams."
    }
  },
  'financial:payout_request': {
    customer: {
      allowed: false,
      reason: "Customer role cannot receive 'financial:payout_request': PayOS bank payouts are restricted to verified space organizers."
    }
  },
  'refund:approve': {
    customer: {
      allowed: false,
      reason: "Customer role cannot receive 'refund:approve': self-dealing prevention forbids customers from approving refunds."
    }
  },
  'moderation:ban_user': {
    customer: {
      allowed: false,
      reason: "Customer role cannot receive 'moderation:ban_user': emergency user suspension is restricted to root SecOps administrators."
    },
    organizer: {
      allowed: false,
      reason: "Organizer role cannot receive 'moderation:ban_user': emergency user suspension is restricted to root SecOps administrators."
    }
  },
  'audit_log:export': {
    customer: {
      allowed: false,
      reason: "Customer role cannot receive 'audit_log:export': immutable SOC2 compliance audit log exports are restricted to platform governance."
    },
    organizer: {
      allowed: false,
      reason: "Organizer role cannot receive 'audit_log:export': immutable SOC2 compliance audit log exports are restricted to platform governance."
    }
  }
};

export interface ValidationResult<T> {
  isValid: boolean;
  errors: ValidationError[];
  value?: T;
}

/**
 * Validates a batch payload for updating role permissions matrix.
 * Accepts either { permissions: PermissionUpdateItem[] } or PermissionUpdateItem[].
 */
export function validateUpdateRolePermissions(
  body: unknown
): ValidationResult<PermissionUpdateItem[]> {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== 'object') {
    return {
      isValid: false,
      errors: [{ field: 'body', message: 'Request body must be a valid JSON object or array' }]
    };
  }

  let rawList: unknown[];
  if (Array.isArray(body)) {
    rawList = body;
  } else if ('permissions' in (body as Record<string, unknown>)) {
    const p = (body as Record<string, unknown>).permissions;
    if (!Array.isArray(p)) {
      return {
        isValid: false,
        errors: [{ field: 'permissions', message: "'permissions' property must be an array" }]
      };
    }
    rawList = p;
  } else {
    return {
      isValid: false,
      errors: [{ field: 'body', message: "Request body must contain 'permissions' array or be an array of permissions" }]
    };
  }

  if (rawList.length === 0) {
    return {
      isValid: false,
      errors: [{ field: 'permissions', message: 'Permissions array must contain at least one item to update' }]
    };
  }

  const validatedItems: PermissionUpdateItem[] = [];

  for (let i = 0; i < rawList.length; i++) {
    const item = rawList[i];
    if (!item || typeof item !== 'object') {
      errors.push({ field: `permissions[${i}]`, message: 'Each permission entry must be an object' });
      continue;
    }

    const record = item as Record<string, unknown>;
    const key = (record.key || record.id) as string | undefined;

    if (!key || typeof key !== 'string') {
      errors.push({ field: `permissions[${i}].key`, message: 'Permission key is required' });
      continue;
    }

    if (!VALID_PERMISSION_KEYS.includes(key as (typeof VALID_PERMISSION_KEYS)[number])) {
      errors.push({
        field: `permissions[${i}].key`,
        message: `Unknown permission key '${key}'. Must be one of the 11 valid permissions.`
      });
      continue;
    }

    // Check for unexpected/unknown role properties
    const knownKeys = new Set([
      'key',
      'id',
      'name',
      'description',
      'module',
      'customer',
      'organizer',
      'administrator',
      'organizerNotice',
      'icon'
    ]);
    for (const prop of Object.keys(record)) {
      if (!knownKeys.has(prop)) {
        errors.push({
          field: `permissions[${i}].${prop}`,
          message: `Unknown role or property '${prop}'. Valid roles are: ${VALID_ROLES.join(', ')}.`
        });
      }
    }

    if (record.customer !== undefined && typeof record.customer !== 'boolean') {
      errors.push({
        field: `permissions[${i}].customer`,
        message: "'customer' permission must be a boolean"
      });
    }

    if (record.organizer !== undefined && typeof record.organizer !== 'boolean') {
      errors.push({
        field: `permissions[${i}].organizer`,
        message: "'organizer' permission must be a boolean"
      });
    }

    // Root policy validation: Administrator role permissions are immutable
    if (record.administrator !== undefined) {
      if (typeof record.administrator !== 'boolean') {
        errors.push({
          field: `permissions[${i}].administrator`,
          message: "'administrator' permission must be a boolean"
        });
      } else if (record.administrator === false) {
        errors.push({
          field: `permissions[${i}].administrator`,
          message: 'Administrator permissions cannot be revoked: enforced by platform root policy.'
        });
      }
    }

    // Server-side enforcement of invariant role boundaries
    const constraint = ROLE_PERMISSION_CONSTRAINTS[key];
    if (constraint) {
      if (
        record.customer !== undefined &&
        constraint.customer &&
        record.customer !== constraint.customer.allowed
      ) {
        errors.push({
          field: `permissions[${i}].customer`,
          message: constraint.customer.reason
        });
      }

      if (
        record.organizer !== undefined &&
        constraint.organizer &&
        record.organizer !== constraint.organizer.allowed
      ) {
        errors.push({
          field: `permissions[${i}].organizer`,
          message: constraint.organizer.reason
        });
      }
    }

    validatedItems.push({
      key,
      customer: record.customer !== undefined ? Boolean(record.customer) : undefined,
      organizer: record.organizer !== undefined ? Boolean(record.organizer) : undefined,
      administrator: record.administrator !== undefined ? Boolean(record.administrator) : undefined
    });
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    value: validatedItems
  };
}
