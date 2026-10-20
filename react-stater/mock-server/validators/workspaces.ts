export interface ValidationResult<T = unknown> {
  valid: boolean;
  errors?: Record<string, string>;
  normalizedData?: T;
}

export const VALID_WORKSPACE_CATEGORIES = [
  'coworking_hub',
  'business_lounge',
  'creative_studio',
  'serviced_office',
  'other'
] as const;

export const VALID_REVIEW_STATUSES = ['Draft', 'Pending', 'Approved', 'Rejected'] as const;
export const VALID_OPERATING_STATUSES = ['Active', 'Inactive', 'Archived'] as const;
export const VALID_MODERATION_STATUSES = ['Normal', 'Suspended'] as const;
export const VALID_CONFIRMATION_MODES = ['Instant', 'Manual_Approval'] as const;

/**
 * Fields that MUST NOT be mutated through the generic Organizer/Workspace PATCH endpoint.
 * These are immutable identifiers, foreign keys, lifecycle states, or system-derived analytics.
 */
export const DISALLOWED_WORKSPACE_PATCH_FIELDS = [
  'id',
  'workspaceCode',
  'organizerId',
  'reviewStatus',
  'reviewedBy',
  'reviewedAt',
  'reviewFeedback',
  'moderationStatus',
  'suspendedBy',
  'suspendedAt',
  'suspendReason',
  'operatingStatus',
  'isLive',
  'featuredPosition',
  'featuredFrom',
  'featuredTo',
  'occupancyRate',
  'rating',
  'reviewsCount',
  'grossRevenueMtd',
  'totalBookingsMtd',
  'createdAt',
  'updatedAt'
] as const;

export const VALID_LIFECYCLE_ACTIONS = ['pause', 'resume', 'maintenance', 'archive'] as const;
export type WorkspaceLifecycleAction = (typeof VALID_LIFECYCLE_ACTIONS)[number];

export function validateCreateWorkspace(
  data: unknown,
  allowedOrganizerIds?: Set<string>
): ValidationResult {
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: { body: 'Request body must be a JSON object' }
    };
  }

  const payload = data as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // Name
  if (!payload.name || typeof payload.name !== 'string' || payload.name.trim().length < 3) {
    errors.name = 'Workspace name is required and must be at least 3 characters long.';
  }

  // Category
  if (!payload.category || typeof payload.category !== 'string') {
    errors.category = `Category is required. Must be one of: ${VALID_WORKSPACE_CATEGORIES.join(', ')}`;
  } else if (!VALID_WORKSPACE_CATEGORIES.includes(payload.category as any)) {
    errors.category = `Invalid category '${payload.category}'. Must be one of: ${VALID_WORKSPACE_CATEGORIES.join(', ')}`;
  }

  // Street Address
  if (!payload.streetAddress || typeof payload.streetAddress !== 'string' || payload.streetAddress.trim().length === 0) {
    errors.streetAddress = 'Street address is required.';
  }

  // City
  if (!payload.city || typeof payload.city !== 'string' || payload.city.trim().length === 0) {
    errors.city = 'City is required.';
  }

  // District
  if (!payload.district || typeof payload.district !== 'string' || payload.district.trim().length === 0) {
    errors.district = 'District is required.';
  }

  // Organizer ID Referential Integrity
  const organizerId = typeof payload.organizerId === 'string' ? payload.organizerId.trim() : 'USR-9432';
  if (allowedOrganizerIds && !allowedOrganizerIds.has(organizerId)) {
    errors.organizerId = `Referenced organizerId '${organizerId}' does not exist or does not possess the Organizer role.`;
  }

  // Price validation
  if (payload.pricePerHour !== undefined && (typeof payload.pricePerHour !== 'number' || payload.pricePerHour < 0)) {
    errors.pricePerHour = 'Price per hour must be a non-negative number.';
  }
  if (payload.pricePerDay !== undefined && (typeof payload.pricePerDay !== 'number' || payload.pricePerDay < 0)) {
    errors.pricePerDay = 'Price per day must be a non-negative number.';
  }

  // Capacity validation
  if (payload.capacityDesks !== undefined && (typeof payload.capacityDesks !== 'number' || payload.capacityDesks < 0)) {
    errors.capacityDesks = 'Capacity desks must be a non-negative integer.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    normalizedData: {
      name: (payload.name as string).trim(),
      category: payload.category,
      streetAddress: (payload.streetAddress as string).trim(),
      city: (payload.city as string).trim(),
      district: (payload.district as string).trim(),
      buildingName: typeof payload.buildingName === 'string' ? payload.buildingName.trim() : undefined,
      facilitySubtitle: typeof payload.facilitySubtitle === 'string' ? payload.facilitySubtitle.trim() : undefined,
      description: typeof payload.description === 'string' ? payload.description.trim() : '',
      shortDescription: typeof payload.shortDescription === 'string' ? payload.shortDescription.trim() : '',
      usableAreaSqm: typeof payload.usableAreaSqm === 'number' ? payload.usableAreaSqm : 0,
      supportPhone: typeof payload.supportPhone === 'string' ? payload.supportPhone.trim() : undefined,
      supportEmail: typeof payload.supportEmail === 'string' ? payload.supportEmail.trim() : undefined,
      organizerId,
      organizerLegalName: typeof payload.organizerLegalName === 'string' ? payload.organizerLegalName.trim() : 'LoftSpaces Hospitality Group',
      organizerTaxId: typeof payload.organizerTaxId === 'string' ? payload.organizerTaxId.trim() : '0314889211',
      organizerVerified: payload.organizerVerified !== false,
      latitude: typeof payload.latitude === 'number' ? payload.latitude : 10.7719,
      longitude: typeof payload.longitude === 'number' ? payload.longitude : 106.7044,
      timezone: typeof payload.timezone === 'string' ? payload.timezone : 'Asia/Ho_Chi_Minh',
      pricePerHour: typeof payload.pricePerHour === 'number' ? payload.pricePerHour : 0,
      pricePerDay: typeof payload.pricePerDay === 'number' ? payload.pricePerDay : 0,
      pricePerMonth: typeof payload.pricePerMonth === 'number' ? payload.pricePerMonth : null,
      capacityDesks: typeof payload.capacityDesks === 'number' ? payload.capacityDesks : 0,
      meetingRooms: typeof payload.meetingRooms === 'number' ? payload.meetingRooms : 0,
      focusPods: typeof payload.focusPods === 'number' ? payload.focusPods : 0,
      bookingConfirmationMode: VALID_CONFIRMATION_MODES.includes(payload.bookingConfirmationMode as any)
        ? payload.bookingConfirmationMode
        : 'Instant',
      amenities: Array.isArray(payload.amenities) ? payload.amenities : [],
      tags: Array.isArray(payload.tags) ? payload.tags : []
    }
  };
}

/**
 * Validates generic Workspace PATCH mutations.
 * Enforces strict field allowlist and rejects modification of privileged/governance fields.
 */
export function validateUpdateWorkspace(data: unknown): ValidationResult {
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: { body: 'Request body must be a JSON object' }
    };
  }

  const payload = data as Record<string, unknown>;
  const errors: Record<string, string> = {};

  // Reject privileged / system-derived / governance fields
  for (const field of DISALLOWED_WORKSPACE_PATCH_FIELDS) {
    if (field in payload) {
      errors[field] = `Field '${field}' cannot be updated via generic workspace PATCH. Privileged governance fields require dedicated admin endpoints.`;
    }
  }

  if (payload.name !== undefined) {
    if (typeof payload.name !== 'string' || payload.name.trim().length < 3) {
      errors.name = 'Workspace name must be at least 3 characters long.';
    }
  }

  if (payload.category !== undefined) {
    if (typeof payload.category !== 'string' || !VALID_WORKSPACE_CATEGORIES.includes(payload.category as any)) {
      errors.category = `Invalid category '${payload.category}'. Must be one of: ${VALID_WORKSPACE_CATEGORIES.join(', ')}`;
    }
  }

  if (payload.pricePerHour !== undefined && (typeof payload.pricePerHour !== 'number' || payload.pricePerHour < 0)) {
    errors.pricePerHour = 'Price per hour must be a non-negative number.';
  }

  if (payload.pricePerDay !== undefined && (typeof payload.pricePerDay !== 'number' || payload.pricePerDay < 0)) {
    errors.pricePerDay = 'Price per day must be a non-negative number.';
  }

  if (payload.capacityDesks !== undefined && (typeof payload.capacityDesks !== 'number' || payload.capacityDesks < 0)) {
    errors.capacityDesks = 'Capacity desks must be a non-negative integer.';
  }

  if (payload.expectedVersion !== undefined && (typeof payload.expectedVersion !== 'number' || payload.expectedVersion < 1)) {
    errors.expectedVersion = 'expectedVersion must be a positive integer.';
  }

  if (payload.version !== undefined && (typeof payload.version !== 'number' || payload.version < 1)) {
    errors.version = 'Version must be a positive integer.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Validates dedicated Workspace Lifecycle commands: PATCH /api/v1/workspaces/:id/lifecycle
 */
export function validateWorkspaceLifecycle(data: unknown): ValidationResult<{
  action: WorkspaceLifecycleAction;
  expectedVersion?: number;
  reason?: string;
}> {
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: { body: 'Request body must be a JSON object' }
    };
  }

  const payload = data as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!payload.action || typeof payload.action !== 'string') {
    errors.action = `Lifecycle action is required. Must be one of: ${VALID_LIFECYCLE_ACTIONS.join(', ')}`;
  } else if (!VALID_LIFECYCLE_ACTIONS.includes(payload.action as any)) {
    errors.action = `Invalid lifecycle action '${payload.action}'. Must be one of: ${VALID_LIFECYCLE_ACTIONS.join(', ')}`;
  }

  const expectedVer = payload.expectedVersion !== undefined ? payload.expectedVersion : payload.version;
  if (expectedVer !== undefined && (typeof expectedVer !== 'number' || expectedVer < 1)) {
    errors.expectedVersion = 'expectedVersion must be a positive integer.';
  }

  if (payload.reason !== undefined && typeof payload.reason !== 'string') {
    errors.reason = 'Reason must be a string.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    normalizedData: {
      action: payload.action as WorkspaceLifecycleAction,
      expectedVersion: typeof expectedVer === 'number' ? expectedVer : undefined,
      reason: typeof payload.reason === 'string' ? payload.reason.trim() : undefined
    }
  };
}

/**
 * Validates dedicated Administrator review endpoint: PATCH /api/v1/admin/workspaces/:id/review
 */
export function validateAdminReviewWorkspace(
  data: unknown,
  allowedAdminIds?: Set<string>
): ValidationResult<{
  reviewStatus: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
  reviewedBy: string;
  reviewFeedback?: string;
}> {
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: { body: 'Request body must be a JSON object' } };
  }

  const payload = data as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!payload.reviewStatus || typeof payload.reviewStatus !== 'string' || !VALID_REVIEW_STATUSES.includes(payload.reviewStatus as any)) {
    errors.reviewStatus = `reviewStatus is required and must be one of: ${VALID_REVIEW_STATUSES.join(', ')}`;
  }

  if (!payload.reviewedBy || typeof payload.reviewedBy !== 'string' || payload.reviewedBy.trim().length === 0) {
    errors.reviewedBy = 'reviewedBy user ID is required.';
  } else if (allowedAdminIds && !allowedAdminIds.has(payload.reviewedBy.trim())) {
    errors.reviewedBy = `Referenced reviewedBy user ID '${payload.reviewedBy}' does not exist or is not an Administrator.`;
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    normalizedData: {
      reviewStatus: payload.reviewStatus as any,
      reviewedBy: (payload.reviewedBy as string).trim(),
      reviewFeedback: typeof payload.reviewFeedback === 'string' ? payload.reviewFeedback.trim() : undefined
    }
  };
}

/**
 * Validates dedicated Administrator moderation endpoint: PATCH /api/v1/admin/workspaces/:id/moderation
 */
export function validateAdminModerationWorkspace(
  data: unknown,
  allowedAdminIds?: Set<string>
): ValidationResult<{
  moderationStatus: 'Normal' | 'Suspended';
  suspendedBy?: string;
  suspendReason?: string;
}> {
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: { body: 'Request body must be a JSON object' } };
  }

  const payload = data as Record<string, unknown>;
  const errors: Record<string, string> = {};

  if (!payload.moderationStatus || typeof payload.moderationStatus !== 'string' || !VALID_MODERATION_STATUSES.includes(payload.moderationStatus as any)) {
    errors.moderationStatus = `moderationStatus is required and must be one of: ${VALID_MODERATION_STATUSES.join(', ')}`;
  }

  if (payload.moderationStatus === 'Suspended') {
    if (!payload.suspendedBy || typeof payload.suspendedBy !== 'string' || payload.suspendedBy.trim().length === 0) {
      errors.suspendedBy = 'suspendedBy user ID is required when suspending a workspace.';
    } else if (allowedAdminIds && !allowedAdminIds.has(payload.suspendedBy.trim())) {
      errors.suspendedBy = `Referenced suspendedBy user ID '${payload.suspendedBy}' does not exist or is not an Administrator.`;
    }

    if (!payload.suspendReason || typeof payload.suspendReason !== 'string' || payload.suspendReason.trim().length < 5) {
      errors.suspendReason = 'suspendReason is required when suspending and must be at least 5 characters long.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    normalizedData: {
      moderationStatus: payload.moderationStatus as any,
      suspendedBy: typeof payload.suspendedBy === 'string' ? payload.suspendedBy.trim() : undefined,
      suspendReason: typeof payload.suspendReason === 'string' ? payload.suspendReason.trim() : undefined
    }
  };
}
