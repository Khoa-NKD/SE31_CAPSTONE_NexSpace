export interface UpdateAdminUserStatusInput {
  status: 'Active' | 'Locked' | 'Inactive';
  reason?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

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

  const validStatuses = ['Active', 'Locked', 'Inactive'];
  if (!b.status || typeof b.status !== 'string' || !validStatuses.includes(b.status)) {
    errors.push({
      field: 'status',
      message: `Status is required and must be one of: ${validStatuses.join(', ')}`
    });
  }

  if (b.reason !== undefined && typeof b.reason !== 'string') {
    errors.push({
      field: 'reason',
      message: 'Reason must be a valid string if provided'
    });
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    value: {
      status: b.status as 'Active' | 'Locked' | 'Inactive',
      reason: b.reason ? (b.reason as string).trim() : undefined
    }
  };
}
