export interface UpdateAdminUserStatusInput {
  status: 'Active' | 'Locked' | 'Inactive' | 'Deleted';
  reason?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

const STATUS_MAP: Record<string, 'Active' | 'Locked' | 'Inactive' | 'Deleted'> = {
  ACTIVE: 'Active',
  LOCKED: 'Locked',
  INACTIVE: 'Inactive',
  DELETED: 'Deleted'
};

export function validateUpdateAdminUserStatus(
  body: unknown
): { errors: ValidationError[]; value?: UpdateAdminUserStatusInput } {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== 'object') {
    return {
      errors: [{ field: 'body', message: 'Request body must be a valid JSON object' }]
    };
  }

  const b = body as Record<string, unknown>;

  const normalizedStatus =
    typeof b.status === 'string' ? STATUS_MAP[b.status.toUpperCase()] : undefined;

  if (!normalizedStatus) {
    errors.push({
      field: 'status',
      message: 'Status is required and must be one of: Active, Locked, Inactive, Deleted'
    });
  }

  if (b.reason !== undefined && typeof b.reason !== 'string') {
    errors.push({
      field: 'reason',
      message: 'Reason must be a valid string if provided'
    });
  }

  if (errors.length > 0 || !normalizedStatus) {
    return { errors };
  }

  return {
    errors: [],
    value: {
      status: normalizedStatus,
      reason: b.reason ? (b.reason as string).trim() : undefined
    }
  };
}
