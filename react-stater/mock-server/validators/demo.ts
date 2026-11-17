export interface CreateDemoUserInput {
  name: string;
  email: string;
  role: 'Customer' | 'Organizer' | 'Administrator';
  status?: 'Active' | 'Locked' | 'Inactive';
  phone?: string;
  company?: string;
  kycStatus?: 'Verified KYC' | 'Pending KYC' | 'Unverified';
}

export interface UpdateDemoUserInput {
  name?: string;
  email?: string;
  role?: 'Customer' | 'Organizer' | 'Administrator';
  status?: 'Active' | 'Locked' | 'Inactive';
  phone?: string;
  company?: string;
  kycStatus?: 'Verified KYC' | 'Pending KYC' | 'Unverified';
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateCreateDemoUser(body: unknown): { errors: ValidationError[]; value?: CreateDemoUserInput } {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== 'object') {
    return { errors: [{ field: 'body', message: 'Request body must be a valid JSON object' }] };
  }

  const b = body as Record<string, unknown>;

  // Name
  if (typeof b.name !== 'string' || b.name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name is required and must be at least 2 characters' });
  }

  // Email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof b.email !== 'string' || !emailRegex.test(b.email.trim())) {
    errors.push({ field: 'email', message: 'Valid email address is required' });
  }

  // Role
  const validRoles = ['Customer', 'Organizer', 'Administrator'];
  if (typeof b.role !== 'string' || !validRoles.includes(b.role)) {
    errors.push({ field: 'role', message: `Role must be one of: ${validRoles.join(', ')}` });
  }

  // Status (optional)
  const validStatuses = ['Active', 'Locked', 'Inactive'];
  if (b.status !== undefined && (typeof b.status !== 'string' || !validStatuses.includes(b.status))) {
    errors.push({ field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    value: {
      name: (b.name as string).trim(),
      email: (b.email as string).trim().toLowerCase(),
      role: b.role as CreateDemoUserInput['role'],
      status: (b.status as CreateDemoUserInput['status']) || 'Active',
      phone: typeof b.phone === 'string' ? b.phone.trim() : '+84 901 000 000',
      company: typeof b.company === 'string' ? b.company.trim() : 'Independent',
      kycStatus: (b.kycStatus as CreateDemoUserInput['kycStatus']) || 'Pending KYC'
    }
  };
}

export function validateUpdateDemoUser(body: unknown): { errors: ValidationError[]; value?: UpdateDemoUserInput } {
  const errors: ValidationError[] = [];

  if (!body || typeof body !== 'object') {
    return { errors: [{ field: 'body', message: 'Request body must be a valid JSON object' }] };
  }

  const b = body as Record<string, unknown>;

  if (b.name !== undefined && (typeof b.name !== 'string' || b.name.trim().length < 2)) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (b.email !== undefined && (typeof b.email !== 'string' || !emailRegex.test(b.email.trim()))) {
    errors.push({ field: 'email', message: 'Must be a valid email address' });
  }

  const validRoles = ['Customer', 'Organizer', 'Administrator'];
  if (b.role !== undefined && (typeof b.role !== 'string' || !validRoles.includes(b.role))) {
    errors.push({ field: 'role', message: `Role must be one of: ${validRoles.join(', ')}` });
  }

  const validStatuses = ['Active', 'Locked', 'Inactive'];
  if (b.status !== undefined && (typeof b.status !== 'string' || !validStatuses.includes(b.status))) {
    errors.push({ field: 'status', message: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  if (errors.length > 0) {
    return { errors };
  }

  const value: UpdateDemoUserInput = {};
  if (b.name !== undefined) value.name = (b.name as string).trim();
  if (b.email !== undefined) value.email = (b.email as string).trim().toLowerCase();
  if (b.role !== undefined) value.role = b.role as UpdateDemoUserInput['role'];
  if (b.status !== undefined) value.status = b.status as UpdateDemoUserInput['status'];
  if (b.phone !== undefined) value.phone = (b.phone as string).trim();
  if (b.company !== undefined) value.company = (b.company as string).trim();
  if (b.kycStatus !== undefined) value.kycStatus = b.kycStatus as UpdateDemoUserInput['kycStatus'];

  return { errors: [], value };
}
