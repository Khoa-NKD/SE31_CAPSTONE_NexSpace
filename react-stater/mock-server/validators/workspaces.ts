import fs from 'node:fs';
import path from 'node:path';
import { storage } from '../storage.ts';

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

  // Location (Optional for Draft creation; mandatory for submission)
  if (payload.streetAddress !== undefined && typeof payload.streetAddress !== 'string') {
    errors.streetAddress = 'Street address must be a string.';
  }
  if (payload.city !== undefined && typeof payload.city !== 'string') {
    errors.city = 'City must be a string.';
  }
  if (payload.district !== undefined && typeof payload.district !== 'string') {
    errors.district = 'District must be a string.';
  }
  if (payload.latitude !== undefined && payload.latitude !== null && (typeof payload.latitude !== 'number' || Number.isNaN(payload.latitude))) {
    errors.latitude = 'Latitude must be a valid number or null.';
  }
  if (payload.longitude !== undefined && payload.longitude !== null && (typeof payload.longitude !== 'number' || Number.isNaN(payload.longitude))) {
    errors.longitude = 'Longitude must be a valid number or null.';
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
      streetAddress: typeof payload.streetAddress === 'string' ? payload.streetAddress.trim() : '',
      city: typeof payload.city === 'string' ? payload.city.trim() : '',
      district: typeof payload.district === 'string' ? payload.district.trim() : '',
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
      latitude: typeof payload.latitude === 'number' && !Number.isNaN(payload.latitude) ? payload.latitude : null,
      longitude: typeof payload.longitude === 'number' && !Number.isNaN(payload.longitude) ? payload.longitude : null,
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
      tags: Array.isArray(payload.tags) ? payload.tags : [],
      coverImageUrl: typeof payload.coverImageUrl === 'string' ? payload.coverImageUrl.trim() : '',
      images: Array.isArray(payload.images) ? payload.images : [],
      operatingHours: Array.isArray(payload.operatingHours) ? payload.operatingHours : undefined,
      floors: Array.isArray(payload.floors) ? payload.floors : undefined,
      clientDraftKey: typeof payload.clientDraftKey === 'string' ? payload.clientDraftKey.trim() : undefined
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

/**
 * Validates dedicated Workspace Submission endpoint: POST /api/v1/workspaces/:id/submit
 * Verifies that all mandatory onboarding fields are completed and valid before transitioning
 * a Draft workspace to Pending review.
 */
export function validateWorkspaceSubmission(
  workspace: any,
  body?: unknown,
  options?: { uploadsDir?: string }
): ValidationResult<{
  expectedVersion?: number;
  agreementConfirmed?: boolean;
}> {
  const errors: Record<string, string> = {};

  // Check state prerequisites
  if (workspace.moderationStatus === 'Suspended') {
    errors.moderationStatus = 'Cannot submit a suspended workspace for review.';
  }
  if (workspace.reviewStatus !== 'Draft') {
    errors.reviewStatus = `Only Draft workspaces can be submitted for review. Current reviewStatus is '${workspace.reviewStatus}'.`;
  }

  // Name
  if (!workspace.name || typeof workspace.name !== 'string' || workspace.name.trim().length < 3) {
    errors.name = 'Workspace name is required and must be at least 3 characters long.';
  }

  // Category
  if (!workspace.category || !VALID_WORKSPACE_CATEGORIES.includes(workspace.category)) {
    errors.category = `Valid space category is required (one of: ${VALID_WORKSPACE_CATEGORIES.join(', ')}).`;
  }

  // Location
  if (!workspace.streetAddress || typeof workspace.streetAddress !== 'string' || workspace.streetAddress.trim().length === 0) {
    errors.streetAddress = 'Street address is required.';
  }
  if (!workspace.city || typeof workspace.city !== 'string' || workspace.city.trim().length === 0) {
    errors.city = 'City is required.';
  }
  if (!workspace.district || typeof workspace.district !== 'string' || workspace.district.trim().length === 0) {
    errors.district = 'District is required.';
  }
  if (
    typeof workspace.latitude !== 'number' ||
    Number.isNaN(workspace.latitude) ||
    workspace.latitude === 0 ||
    typeof workspace.longitude !== 'number' ||
    Number.isNaN(workspace.longitude) ||
    workspace.longitude === 0
  ) {
    errors.location = 'Valid geolocation coordinates (latitude and longitude) are required for workspace submission.';
  }

  // Operating Hours
  const hasHours =
    workspace.operatingHours &&
    Array.isArray(workspace.operatingHours) &&
    workspace.operatingHours.some((h: any) => !h.isClosed || h.is24Hours);
  if (!hasHours) {
    errors.operatingHours = 'At least one active operating schedule day or 24/7 access is required.';
  }

  // Capacity / Floors
  const capacity = Number(workspace.capacityDesks) || 0;
  const hasFloorsWithCapacity =
    Array.isArray(workspace.floors) &&
    workspace.floors.some((f: any) => (f.totalDesks || 0) > 0);
  if (capacity <= 0 && !hasFloorsWithCapacity) {
    errors.capacityDesks = 'At least one desk or usable work zone capacity must be configured.';
  }

  // Amenities
  if (!Array.isArray(workspace.amenities) || workspace.amenities.length === 0) {
    errors.amenities = 'At least 1 amenity must be selected for the workspace.';
  }

  // Media reference verification
  // Local development media references (/api/v1/media/<filename>) are strictly validated against disk storage.
  // External HTTPS URLs are checked for format/structure (live remote network pings are avoided in mock server).
  const uploadsDir = options?.uploadsDir || (typeof storage?.getUploadsDir === 'function' ? storage.getUploadsDir() : undefined);

  const validateMediaReference = (url: unknown, fieldName: string): boolean => {
    if (typeof url !== 'string' || !url.trim()) return false;
    const trimmed = url.trim();

    if (trimmed.startsWith('/api/v1/media/')) {
      const filename = path.basename(trimmed);
      if (!filename || filename.includes('..') || !/^[a-zA-Z0-9_.-]+$/.test(filename)) {
        errors[fieldName] = `Local media reference '${trimmed}' contains an invalid filename or path traversal sequence.`;
        return false;
      }

      if (uploadsDir) {
        const fullPath = path.join(uploadsDir, filename);
        if (!fullPath.startsWith(uploadsDir) || !fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
          errors[fieldName] = `Local media asset '${trimmed}' does not exist on disk in the runtime uploads directory.`;
          return false;
        }
      }
      return true;
    }

    if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
      try {
        new URL(trimmed);
        return true;
      } catch {
        errors[fieldName] = `External media reference '${trimmed}' is not a valid URL.`;
        return false;
      }
    }

    errors[fieldName] = `Media reference '${trimmed}' is not a durable media URL. Temporary browser blob: URLs cannot be submitted.`;
    return false;
  };

  let validCoverCount = 0;
  let validImagesCount = 0;

  if (workspace.coverImageUrl && typeof workspace.coverImageUrl === 'string' && workspace.coverImageUrl.trim().length > 0) {
    if (validateMediaReference(workspace.coverImageUrl, 'coverImageUrl')) {
      validCoverCount++;
    }
  }

  if (Array.isArray(workspace.images) && workspace.images.length > 0) {
    workspace.images.forEach((img: any, idx: number) => {
      const url = typeof img === 'string' ? img : img?.url;
      if (validateMediaReference(url, `images[${idx}]`)) {
        validImagesCount++;
      }
    });
  }

  if (validCoverCount === 0 && validImagesCount === 0) {
    if (!errors.coverImageUrl && !Object.keys(errors).some((k) => k.startsWith('images'))) {
      errors.images = 'At least 1 valid, durable workspace photograph or cover image is required.';
    }
  }

  // Optional body version check
  let expectedVersion: number | undefined;
  let agreementConfirmed: boolean | undefined;
  if (body && typeof body === 'object') {
    const p = body as Record<string, unknown>;
    const expVer = p.expectedVersion !== undefined ? p.expectedVersion : p.version;
    if (expVer !== undefined) {
      if (typeof expVer !== 'number' || expVer < 1) {
        errors.expectedVersion = 'expectedVersion must be a positive integer.';
      } else {
        expectedVersion = expVer;
      }
    }
    if (p.agreementConfirmed !== undefined) {
      agreementConfirmed = Boolean(p.agreementConfirmed);
    }
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    normalizedData: {
      expectedVersion,
      agreementConfirmed
    }
  };
}
