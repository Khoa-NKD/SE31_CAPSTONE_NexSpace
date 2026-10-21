import type { IncomingMessage, ServerResponse } from 'node:http';
import { storage } from '../storage.ts';
import {
  validateCreateWorkspace,
  validateUpdateWorkspace,
  validateWorkspaceLifecycle,
  validateAdminReviewWorkspace,
  validateAdminModerationWorkspace,
  validateWorkspaceSubmission
} from '../validators/workspaces.ts';

export type WorkspaceCategory =
  | 'coworking_hub'
  | 'business_lounge'
  | 'creative_studio'
  | 'serviced_office'
  | 'other';

export type WorkspaceReviewStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected';
export type WorkspaceOperatingStatus = 'Active' | 'Inactive' | 'Archived';
export type WorkspaceModerationStatus = 'Normal' | 'Suspended';
export type BookingConfirmationMode = 'Instant' | 'Manual_Approval';

export interface WorkspaceOperatingHour {
  id?: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  is24Hours: boolean;
  closesNextDay?: boolean;
}

export interface WorkspaceMediaItem {
  id: string;
  url: string;
  caption?: string;
  isCover: boolean;
  displayOrder: number;
  mediaType: 'image' | '360_degree';
  fileSizeKb?: number;
  mimeType?: string;
  pixelWidth?: number;
  pixelHeight?: number;
  originalFileName?: string;
}

export interface WorkspaceFloorSummary {
  id: string;
  name: string;
  floorNumber: number;
  status?: 'Draft' | 'Published';
  totalDesks?: number;
  totalRooms?: number;
}

export interface CanonicalWorkspace {
  id: string;
  workspaceCode: string;
  organizerId: string;
  organizerLegalName: string;
  organizerTaxId: string;
  organizerVerified: boolean;
  legacyAliases?: string[];
  name: string;
  category: WorkspaceCategory;
  description: string;
  shortDescription?: string;
  usableAreaSqm: number;
  supportPhone?: string;
  supportEmail?: string;
  operatorContactName?: string;
  operatorContactPhone?: string;
  streetAddress: string;
  buildingName?: string;
  facilitySubtitle?: string;
  district: string;
  city: string;
  postalCode?: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  entryInstructions?: string;
  operatingHours: WorkspaceOperatingHour[];
  receptionHours?: string;
  autoBlockPublicHolidays?: boolean;
  checkInLeadMinutes?: number;
  checkInLateMinutes?: number;
  amenities: string[];
  tags: string[];
  coverImageUrl: string;
  images: WorkspaceMediaItem[];
  capacityDesks: number;
  meetingRooms: number;
  focusPods: number;
  capacityLabel: string;
  totalFloors: number;
  floors?: WorkspaceFloorSummary[];
  onboardingStep?: number;
  onboardingCompleted?: boolean;
  draftProgress?: number;
  draftWarningMessage?: string | null;
  reviewStatus: WorkspaceReviewStatus;
  submittedAt?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewFeedback?: string | null;
  submissionNotes?: string | null;
  moderationStatus: WorkspaceModerationStatus;
  suspendedBy?: string | null;
  suspendedAt?: string | null;
  suspendReason?: string | null;
  operatingStatus: WorkspaceOperatingStatus;
  status: 'active' | 'pending' | 'suspended' | 'draft' | 'archived' | 'paused' | 'maintenance';
  isLive: boolean;
  turnstileOnline?: boolean;
  accessMethod?: string;
  isListingVisible: boolean;
  featuredPosition?: number | null;
  featuredFrom?: string | null;
  featuredTo?: string | null;
  bookingConfirmationMode: BookingConfirmationMode;
  pricePerHour: number;
  pricePerDay: number;
  pricePerMonth?: number | null;
  rating: number;
  reviewsCount: number;
  occupancyRate?: number;
  grossRevenueMtd?: number;
  totalBookingsMtd?: number;
  tier?: string;
  publicUrl?: string;
  clientDraftKey?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/**
 * Public DTO Projections: Strips tax IDs, moderation notes, reviewer accounts, and financial metrics.
 */
export function toPublicWorkspaceSummary(w: CanonicalWorkspace) {
  return {
    id: w.id,
    workspaceCode: w.workspaceCode,
    name: w.name,
    category: w.category,
    description: w.description,
    shortDescription: w.shortDescription,
    streetAddress: w.streetAddress,
    buildingName: w.buildingName,
    facilitySubtitle: w.facilitySubtitle,
    district: w.district,
    city: w.city,
    latitude: w.latitude,
    longitude: w.longitude,
    coverImageUrl: w.coverImageUrl,
    images: w.images,
    capacityDesks: w.capacityDesks,
    meetingRooms: w.meetingRooms,
    focusPods: w.focusPods,
    capacityLabel: w.capacityLabel,
    pricePerHour: w.pricePerHour,
    pricePerDay: w.pricePerDay,
    pricePerMonth: w.pricePerMonth,
    rating: w.rating,
    reviewsCount: w.reviewsCount,
    amenities: w.amenities,
    tags: w.tags,
    operatingHours: w.operatingHours,
    bookingConfirmationMode: w.bookingConfirmationMode,
    featuredPosition: w.featuredPosition,
    publicUrl: w.publicUrl
  };
}

export function toPublicWorkspaceDetail(w: CanonicalWorkspace) {
  return {
    ...toPublicWorkspaceSummary(w),
    usableAreaSqm: w.usableAreaSqm,
    supportPhone: w.supportPhone,
    supportEmail: w.supportEmail,
    organizerLegalName: w.organizerLegalName,
    organizerVerified: w.organizerVerified,
    receptionHours: w.receptionHours,
    autoBlockPublicHolidays: w.autoBlockPublicHolidays,
    entryInstructions: w.entryInstructions,
    totalFloors: w.totalFloors,
    floors: w.floors
  };
}

/**
 * Resolves a workspace by its canonical ID, code, or legacy alias.
 */
export function findWorkspaceByAliasOrId(
  workspaces: CanonicalWorkspace[],
  identifier: string
): CanonicalWorkspace | undefined {
  if (!identifier) return undefined;
  const clean = identifier.toLowerCase().trim();
  return workspaces.find((w) => {
    if (w.id.toLowerCase() === clean) return true;
    if (w.workspaceCode && w.workspaceCode.toLowerCase() === clean) return true;
    if (Array.isArray(w.legacyAliases)) {
      return w.legacyAliases.some((alias) => alias.toLowerCase() === clean);
    }
    return false;
  });
}

/**
 * Normalizes a workspace record on read so legacy runtime records
 * seamlessly provide canonical fields without modifying disk files.
 * Reconciles Organizer ownership with canonical seeds and derives consistent lifecycle status.
 */
export function normalizeWorkspaceRecord(w: any, seedMap?: Map<string, any>): CanonicalWorkspace {
  if (!w) return w;
  const seed = seedMap?.get(w.id?.toLowerCase());

  const reviewStatus: WorkspaceReviewStatus =
    w.reviewStatus || (w.status === 'pending' ? 'Pending' : w.status === 'active' ? 'Approved' : 'Draft');
  const moderationStatus: WorkspaceModerationStatus =
    w.moderationStatus || (w.status === 'suspended' ? 'Suspended' : 'Normal');
  const operatingStatus: WorkspaceOperatingStatus =
    w.operatingStatus || (w.status === 'suspended' ? 'Active' : w.status === 'active' ? 'Active' : 'Inactive');

  // Reconcile Organizer Ownership:
  // The canonical seed is authoritative for organizer ownership.
  // Stale runtime records where 'USR-9432' was assigned as a blanket fallback on WS-108 (USR-2194),
  // WS-092 (USR-5198), or WS-120 (USR-2194) are reconciled in memory without modifying developer files.
  let organizerId = w.organizerId;
  if (seed?.organizerId) {
    if (seed.organizerId !== 'USR-9432' && w.organizerId === 'USR-9432') {
      organizerId = seed.organizerId;
    } else if (!organizerId) {
      organizerId = seed.organizerId;
    }
  }
  if (!organizerId) {
    organizerId = 'USR-9432';
  }

  // Authoritative organizer legal name alignment
  const organizerLegalName =
    (seed?.organizerId === organizerId && seed?.organizerLegalName)
      ? seed.organizerLegalName
      : (w.organizerLegalName || seed?.organizerLegalName || 'LoftSpaces Hospitality Group');

  // Consistent operational lifecycle status derivation
  let status: CanonicalWorkspace['status'] = w.status;
  if (moderationStatus === 'Suspended') {
    status = 'suspended';
  } else if (reviewStatus === 'Draft') {
    status = 'draft';
  } else if (reviewStatus === 'Pending') {
    status = 'pending';
  } else if (reviewStatus === 'Approved') {
    if (operatingStatus === 'Active') {
      status = 'active';
    } else if (operatingStatus === 'Inactive') {
      status = w.status === 'maintenance' ? 'maintenance' : 'paused';
    } else if (operatingStatus === 'Archived') {
      status = 'archived';
    }
  }

  const isLive = w.isLive ?? (operatingStatus === 'Active' && moderationStatus === 'Normal' && reviewStatus === 'Approved');
  const isListingVisible = w.isListingVisible ?? isLive;

  return {
    ...seed,
    ...w,
    organizerId,
    organizerLegalName,
    reviewStatus,
    moderationStatus,
    operatingStatus,
    status,
    isLive,
    isListingVisible,
    version: w.version || 1
  };
}

async function getAllNormalizedWorkspaces(): Promise<CanonicalWorkspace[]> {
  const seeds = await storage.getSeeds<CanonicalWorkspace>('workspaces');
  const seedMap = new Map<string, CanonicalWorkspace>();
  for (const s of seeds) {
    if (s.id) seedMap.set(s.id.toLowerCase(), s);
  }

  const records = await storage.getAll<any>('workspaces');
  const result: CanonicalWorkspace[] = [];
  const processedIds = new Set<string>();

  // 1. Process all runtime records, seamlessly normalized with seed metadata
  for (const r of records) {
    const normalized = normalizeWorkspaceRecord(r, seedMap);
    result.push(normalized);
    processedIds.add(normalized.id.toLowerCase());
  }

  // 2. Seamlessly append canonical seed workspaces not present in runtime (e.g. WS-101, WS-135, WS-142, WS-150)
  // If runtime records array is explicitly empty ([]), do not append seeds to preserve empty fixtures.
  if (records.length > 0) {
    for (const s of seeds) {
      if (!processedIds.has(s.id.toLowerCase())) {
        result.push(normalizeWorkspaceRecord(s, seedMap));
        processedIds.add(s.id.toLowerCase());
      }
    }
  }

  return result;
}

/**
 * Persists an updated or newly mutated workspace record to runtime JSON
 * using a Copy-On-Write mechanism under domain file locks.
 *
 * Rules:
 * 1. If the workspace is already present in runtime records, update that specific record in-place.
 * 2. If the workspace was seed-only (absent from runtime records), append ONLY this newly mutated
 *    workspace to runtime records (Copy-On-Write). Other un-mutated seed records remain virtual/seed-only.
 * 3. Preserves all existing developer runtime records and invariants.
 */
async function persistWorkspaceMutation(updatedWorkspace: CanonicalWorkspace): Promise<void> {
  const runtimeRecords = await storage.getAll<any>('workspaces');
  const targetId = updatedWorkspace.id.toLowerCase();

  const existingIdx = runtimeRecords.findIndex((r) => {
    if (r.id && r.id.toLowerCase() === targetId) return true;
    if (r.workspaceCode && r.workspaceCode.toLowerCase() === targetId) return true;
    if (Array.isArray(r.legacyAliases)) {
      return r.legacyAliases.some((alias: string) => alias.toLowerCase() === targetId);
    }
    return false;
  });

  if (existingIdx !== -1) {
    const prev = runtimeRecords[existingIdx];
    runtimeRecords[existingIdx] = {
      ...prev,
      ...updatedWorkspace,
      id: prev.id
    };
  } else {
    // Seed-only workspace being mutated: copy-on-write into runtime store
    runtimeRecords.push(updatedWorkspace);
  }

  await storage.writeAll('workspaces', runtimeRecords);
}

/**
 * Evaluates whether a workspace is eligible for public display.
 */
export function isPubliclyEligible(w: CanonicalWorkspace): boolean {
  return (
    w.reviewStatus === 'Approved' &&
    w.operatingStatus === 'Active' &&
    w.moderationStatus === 'Normal' &&
    w.isListingVisible === true
  );
}

/**
 * GET /api/v1/public/workspaces
 * Customer marketplace listing. Returns only approved, active, public-safe records.
 */
export async function handleGetPublicWorkspaces(
  res: ServerResponse,
  searchParams: URLSearchParams
): Promise<void> {
  try {
    const allWorkspaces = await getAllNormalizedWorkspaces();

    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const city = searchParams.get('city')?.toLowerCase().trim() || '';
    const district = searchParams.get('district')?.toLowerCase().trim() || '';
    const category = searchParams.get('category')?.toLowerCase().trim() || '';

    let filtered = allWorkspaces.filter((w) => {
      if (!isPubliclyEligible(w)) return false;

      if (search) {
        const matchesName = w.name.toLowerCase().includes(search);
        const matchesAddress = w.streetAddress?.toLowerCase().includes(search);
        const matchesCity = w.city?.toLowerCase().includes(search);
        const matchesDistrict = w.district?.toLowerCase().includes(search);
        if (!matchesName && !matchesAddress && !matchesCity && !matchesDistrict) {
          return false;
        }
      }

      if (city && w.city?.toLowerCase() !== city) return false;
      if (district && w.district?.toLowerCase() !== district) return false;
      if (category && w.category?.toLowerCase() !== category) return false;

      return true;
    });

    const sortBy = searchParams.get('sortBy') || 'featuredPosition';
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1;

    filtered.sort((a, b) => {
      if (sortBy === 'rating') {
        return ((a.rating || 0) - (b.rating || 0)) * sortOrder;
      }
      if (sortBy === 'pricePerHour') {
        return ((a.pricePerHour || 0) - (b.pricePerHour || 0)) * sortOrder;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * sortOrder;
      }
      // Default: featured position first, then rating
      const posA = a.featuredPosition ?? 999;
      const posB = b.featuredPosition ?? 999;
      if (posA !== posB) return posA - posB;
      return (b.rating || 0) - (a.rating || 0);
    });

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '12', 10)));
    const totalElements = filtered.length;
    const totalPages = Math.ceil(totalElements / limit) || 1;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit).map(toPublicWorkspaceSummary);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        data: {
          content: paginated,
          pagination: {
            page,
            limit,
            totalElements,
            totalPages
          }
        },
        timestamp: new Date().toISOString()
      })
    );
  } catch (err: unknown) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        status: 500,
        error: 'InternalServerError',
        message: err instanceof Error ? err.message : 'Failed to retrieve public workspaces',
        timestamp: new Date().toISOString()
      })
    );
  }
}

/**
 * GET /api/v1/public/workspaces/:id
 * Customer detail view. Strips internal moderation, tax, and reviewer metadata.
 */
export async function handleGetPublicWorkspaceById(
  res: ServerResponse,
  id: string
): Promise<void> {
  try {
    const allWorkspaces = await getAllNormalizedWorkspaces();
    const workspace = findWorkspaceByAliasOrId(allWorkspaces, id);

    // If workspace does not exist or is not publicly eligible, return 404 to avoid leaking draft/suspended existences
    if (!workspace || !isPubliclyEligible(workspace)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 404,
          error: 'NotFound',
          message: `Workspace with identifier '${id}' is not available.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        data: toPublicWorkspaceDetail(workspace),
        timestamp: new Date().toISOString()
      })
    );
  } catch (err: unknown) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        status: 500,
        error: 'InternalServerError',
        message: err instanceof Error ? err.message : 'Failed to retrieve workspace',
        timestamp: new Date().toISOString()
      })
    );
  }
}

export interface ResolvedCaller {
  valid: boolean;
  status: number;
  errorCode: string;
  errorMessage: string;
  rawRole?: string;
  role?: 'administrator' | 'organizer' | 'customer';
  userId?: string;
  isAdmin: boolean;
  isOrganizer: boolean;
  isCustomer: boolean;
}

/**
 * Shared mock caller context resolver.
 * Enforces development mock RBAC consistency:
 * 1. Conflicting role or identity headers fail closed (403 Forbidden).
 * 2. Cross-role identity conflicts (e.g. Administrator role with Organizer identity) fail closed (403 Forbidden).
 * 3. Seed user roles are cross-referenced to prevent identity impersonation across tenant boundaries.
 */
export function resolveCallerContext(
  req: IncomingMessage,
  users: Array<{ id: string; role: string }>
): ResolvedCaller {
  // 1. Role Headers
  const rawMockRole = (req.headers['x-mock-role'] as string | undefined)?.trim();
  const rawAltRole = (req.headers['x-role'] as string | undefined)?.trim();

  if (rawMockRole && rawAltRole && rawMockRole.toLowerCase() !== rawAltRole.toLowerCase()) {
    return {
      valid: false,
      status: 403,
      errorCode: 'Forbidden',
      errorMessage: 'Forbidden: Conflicting role headers provided.',
      isAdmin: false,
      isOrganizer: false,
      isCustomer: false
    };
  }

  const rawRole = rawMockRole || rawAltRole;
  const normalizedRole = rawRole?.toLowerCase();

  // 2. Identity Headers
  const rawMockUserId = (req.headers['x-mock-user-id'] as string | undefined)?.trim();
  const rawUserId = (req.headers['x-user-id'] as string | undefined)?.trim();
  const rawOrganizerId = (req.headers['x-organizer-id'] as string | undefined)?.trim();
  const rawAdminId = (req.headers['x-admin-id'] as string | undefined)?.trim();

  if (rawMockUserId && rawUserId && rawMockUserId.toLowerCase() !== rawUserId.toLowerCase()) {
    return {
      valid: false,
      status: 403,
      errorCode: 'Forbidden',
      errorMessage: 'Forbidden: Conflicting user identity headers provided.',
      isAdmin: false,
      isOrganizer: false,
      isCustomer: false
    };
  }

  const baseUserId = rawMockUserId || rawUserId;

  if (rawOrganizerId && rawAdminId) {
    return {
      valid: false,
      status: 403,
      errorCode: 'Forbidden',
      errorMessage: 'Forbidden: Conflicting organizer and administrator identity headers provided.',
      isAdmin: false,
      isOrganizer: false,
      isCustomer: false
    };
  }

  if (baseUserId && rawOrganizerId && baseUserId.toLowerCase() !== rawOrganizerId.toLowerCase()) {
    return {
      valid: false,
      status: 403,
      errorCode: 'Forbidden',
      errorMessage: 'Forbidden: Conflicting user and organizer identity headers provided.',
      isAdmin: false,
      isOrganizer: false,
      isCustomer: false
    };
  }

  if (baseUserId && rawAdminId && baseUserId.toLowerCase() !== rawAdminId.toLowerCase()) {
    return {
      valid: false,
      status: 403,
      errorCode: 'Forbidden',
      errorMessage: 'Forbidden: Conflicting user and administrator identity headers provided.',
      isAdmin: false,
      isOrganizer: false,
      isCustomer: false
    };
  }

  const userId = baseUserId || rawOrganizerId || rawAdminId;

  // 3. Cross Role/Identity Invariants
  if (normalizedRole === 'administrator' || normalizedRole === 'admin') {
    if (rawOrganizerId) {
      return {
        valid: false,
        status: 403,
        errorCode: 'Forbidden',
        errorMessage: 'Forbidden: Conflicting credentials: Administrator role cannot be paired with an Organizer identity.',
        isAdmin: false,
        isOrganizer: false,
        isCustomer: false
      };
    }
  }

  if (normalizedRole === 'organizer') {
    if (rawAdminId) {
      return {
        valid: false,
        status: 403,
        errorCode: 'Forbidden',
        errorMessage: 'Forbidden: Conflicting credentials: Admin identity cannot be paired with Organizer role.',
        isAdmin: false,
        isOrganizer: false,
        isCustomer: false
      };
    }
  }

  if (normalizedRole === 'customer') {
    if (rawOrganizerId || rawAdminId) {
      return {
        valid: false,
        status: 403,
        errorCode: 'Forbidden',
        errorMessage: 'Forbidden: Customers cannot supply organizer or administrator identity credentials.',
        isAdmin: false,
        isOrganizer: false,
        isCustomer: false
      };
    }
  }

  // 4. Role parsing & validation
  let role: 'administrator' | 'organizer' | 'customer' | undefined;
  if (normalizedRole === 'administrator' || normalizedRole === 'admin') {
    role = 'administrator';
  } else if (normalizedRole === 'organizer') {
    role = 'organizer';
  } else if (normalizedRole === 'customer') {
    role = 'customer';
  } else if (normalizedRole) {
    return {
      valid: false,
      status: 403,
      errorCode: 'Forbidden',
      errorMessage: `Forbidden: Invalid role '${rawRole}' supplied.`,
      isAdmin: false,
      isOrganizer: false,
      isCustomer: false
    };
  }

  // 5. User lookup in seed users
  if (userId) {
    const foundUser = users.find((u) => u.id.toLowerCase() === userId.toLowerCase());
    if (foundUser) {
      const dbRole = foundUser.role.toLowerCase();
      if (role === 'administrator' && dbRole !== 'administrator') {
        return {
          valid: false,
          status: 403,
          errorCode: 'Forbidden',
          errorMessage: `Forbidden: User '${userId}' does not have Administrator privileges.`,
          isAdmin: false,
          isOrganizer: false,
          isCustomer: false
        };
      }
      if (role === 'organizer' && dbRole !== 'organizer') {
        return {
          valid: false,
          status: 403,
          errorCode: 'Forbidden',
          errorMessage: `Forbidden: User '${userId}' does not have Organizer privileges.`,
          isAdmin: false,
          isOrganizer: false,
          isCustomer: false
        };
      }
      if (role === 'customer' && dbRole !== 'customer') {
        return {
          valid: false,
          status: 403,
          errorCode: 'Forbidden',
          errorMessage: `Forbidden: User '${userId}' does not have Customer privileges.`,
          isAdmin: false,
          isOrganizer: false,
          isCustomer: false
        };
      }
    }
  }

  return {
    valid: true,
    status: 200,
    errorCode: '',
    errorMessage: '',
    rawRole,
    role,
    userId,
    isAdmin: role === 'administrator',
    isOrganizer: role === 'organizer',
    isCustomer: role === 'customer'
  };
}

/**
 * GET /api/v1/workspaces
 * Queries workspaces for Organizer/Admin with filtering, search, sorting, and pagination.
 */
export async function handleGetWorkspaces(
  req: IncomingMessage,
  res: ServerResponse,
  searchParams: URLSearchParams
): Promise<void> {
  try {
    const isPublic = searchParams.get('isPublic') === 'true' || searchParams.get('isPublic') === '1';

    const users = await storage.getAll<{ id: string; role: string }>('users');
    const caller = resolveCallerContext(req, users);

    // Fail-closed checks for private workspace list access
    if (!isPublic) {
      if (!caller.valid) {
        res.writeHead(caller.status, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: caller.status,
            error: caller.errorCode,
            message: caller.errorMessage,
            timestamp: new Date().toISOString()
          })
        );
        return;
      }

      if (!caller.role) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 403,
            error: 'Forbidden',
            message: 'Forbidden: Explicit role required to access private workspace listings. Use /api/v1/public/workspaces for public marketplace discovery.',
            timestamp: new Date().toISOString()
          })
        );
        return;
      }

      if (caller.isCustomer) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 403,
            error: 'Forbidden',
            message: 'Forbidden: Customers are not authorized to access private workspace listings. Use /api/v1/public/workspaces for public marketplace discovery.',
            timestamp: new Date().toISOString()
          })
        );
        return;
      }

      if (caller.isAdmin && !caller.userId) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 403,
            error: 'Forbidden',
            message: 'Forbidden: Administrator identity required to access private workspace listings.',
            timestamp: new Date().toISOString()
          })
        );
        return;
      }

      if (caller.isOrganizer && !caller.userId) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 403,
            error: 'Forbidden',
            message: 'Forbidden: Organizer identity required to access private workspace listings.',
            timestamp: new Date().toISOString()
          })
        );
        return;
      }
    }

    const allWorkspaces = await getAllNormalizedWorkspaces();

    const search = searchParams.get('search')?.toLowerCase().trim() || '';
    const city = searchParams.get('city')?.toLowerCase().trim() || '';
    const district = searchParams.get('district')?.toLowerCase().trim() || '';
    const category = searchParams.get('category')?.toLowerCase().trim() || '';
    const requestedOrganizerId = searchParams.get('organizerId')?.trim() || '';

    let effectiveOrganizerId = '';

    if (caller.isAdmin) {
      // Administrator can view all workspaces or optionally filter by an organizerId query param
      effectiveOrganizerId = requestedOrganizerId;
    } else if (caller.isOrganizer && caller.userId) {
      // Organizer caller: strictly scoped to their own caller identity
      if (requestedOrganizerId && requestedOrganizerId !== caller.userId) {
        // Cross-tenant list attempt
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 403,
            error: 'Forbidden',
            message: `Mock Organizer '${caller.userId}' is not authorized to list workspaces for '${requestedOrganizerId}'.`,
            timestamp: new Date().toISOString()
          })
        );
        return;
      }
      effectiveOrganizerId = caller.userId;
    } else if (isPublic) {
      // Public query compatibility
      effectiveOrganizerId = requestedOrganizerId;
    }

    const status = searchParams.get('status')?.toLowerCase().trim() || '';
    const reviewStatus = searchParams.get('reviewStatus')?.trim() || '';
    const operatingStatus = searchParams.get('operatingStatus')?.trim() || '';
    const moderationStatus = searchParams.get('moderationStatus')?.trim() || '';

    let filtered = allWorkspaces.filter((w) => {
      if (isPublic && !isPubliclyEligible(w)) return false;

      if (search) {
        const matchesName = w.name.toLowerCase().includes(search);
        const matchesCode = w.workspaceCode?.toLowerCase().includes(search);
        const matchesAddress = w.streetAddress?.toLowerCase().includes(search);
        const matchesCity = w.city?.toLowerCase().includes(search);
        const matchesDistrict = w.district?.toLowerCase().includes(search);
        const matchesAliases = w.legacyAliases?.some((a) => a.toLowerCase().includes(search));
        if (!matchesName && !matchesCode && !matchesAddress && !matchesCity && !matchesDistrict && !matchesAliases) {
          return false;
        }
      }

      if (city && w.city?.toLowerCase() !== city) return false;
      if (district && w.district?.toLowerCase() !== district) return false;
      if (category && w.category?.toLowerCase() !== category) return false;
      if (effectiveOrganizerId && w.organizerId !== effectiveOrganizerId) return false;

      if (reviewStatus && w.reviewStatus?.toLowerCase() !== reviewStatus.toLowerCase()) return false;
      if (operatingStatus && w.operatingStatus?.toLowerCase() !== operatingStatus.toLowerCase()) return false;
      if (moderationStatus && w.moderationStatus?.toLowerCase() !== moderationStatus.toLowerCase()) return false;

      if (status) {
        const matchesStatus = w.status?.toLowerCase() === status;
        const matchesOperating = w.operatingStatus?.toLowerCase() === status;
        const matchesReview = w.reviewStatus?.toLowerCase() === status;
        if (!matchesStatus && !matchesOperating && !matchesReview) return false;
      }

      return true;
    });

    // Sorting
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name) * sortOrder;
      }
      if (sortBy === 'rating') {
        return ((a.rating || 0) - (b.rating || 0)) * sortOrder;
      }
      if (sortBy === 'featuredPosition') {
        const posA = a.featuredPosition ?? 999;
        const posB = b.featuredPosition ?? 999;
        return (posA - posB) * sortOrder;
      }
      if (sortBy === 'usableAreaSqm') {
        return ((a.usableAreaSqm || 0) - (b.usableAreaSqm || 0)) * sortOrder;
      }
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return (dateA - dateB) * sortOrder;
    });

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const totalElements = filtered.length;
    const totalPages = Math.ceil(totalElements / limit) || 1;
    const offset = (page - 1) * limit;

    // If caller requested public listing via query param, project to public DTO
    const paginated = isPublic
      ? filtered.slice(offset, offset + limit).map(toPublicWorkspaceSummary)
      : filtered.slice(offset, offset + limit);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        data: {
          content: paginated,
          pagination: {
            page,
            limit,
            totalElements,
            totalPages
          }
        },
        timestamp: new Date().toISOString()
      })
    );
  } catch (err: unknown) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        status: 500,
        error: 'InternalServerError',
        message: err instanceof Error ? err.message : 'Failed to retrieve workspaces',
        timestamp: new Date().toISOString()
      })
    );
  }
}

/**
 * GET /api/v1/workspaces/:id
 * Fetches full workspace record by canonical ID or legacy alias for authorized owner/admin.
 */
export async function handleGetWorkspaceById(
  req: IncomingMessage,
  res: ServerResponse,
  id: string
): Promise<void> {
  try {
    const allWorkspaces = await getAllNormalizedWorkspaces();
    const workspace = findWorkspaceByAliasOrId(allWorkspaces, id);

    if (!workspace) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 404,
          error: 'NotFound',
          message: `Workspace with identifier '${id}' was not found.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const users = await storage.getAll<{ id: string; role: string }>('users');
    const caller = resolveCallerContext(req, users);

    if (!caller.valid) {
      res.writeHead(caller.status, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: caller.status,
          error: caller.errorCode,
          message: caller.errorMessage,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (!caller.role) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: 'Forbidden: Explicit role required to access private workspace details. Use /api/v1/public/workspaces/:id for public workspace information.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (caller.isCustomer) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: 'Forbidden: Customers are not authorized to access private workspace details. Use /api/v1/public/workspaces/:id for public workspace information.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (caller.isAdmin) {
      if (!caller.userId) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 403,
            error: 'Forbidden',
            message: 'Forbidden: Administrator identity required to access private workspace details.',
            timestamp: new Date().toISOString()
          })
        );
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          data: workspace,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (caller.isOrganizer) {
      if (!caller.userId) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 403,
            error: 'Forbidden',
            message: 'Forbidden: Organizer identity required to access private workspace details.',
            timestamp: new Date().toISOString()
          })
        );
        return;
      }

      if (workspace.organizerId !== caller.userId) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 403,
            error: 'Forbidden',
            message: `Mock Organizer '${caller.userId}' is not authorized to access private workspace '${id}' owned by '${workspace.organizerId}'.`,
            timestamp: new Date().toISOString()
          })
        );
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          data: workspace,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        status: 403,
        error: 'Forbidden',
        message: 'Forbidden: Insufficient privileges to access private workspace details.',
        timestamp: new Date().toISOString()
      })
    );
    return;
  } catch (err: unknown) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        status: 500,
        error: 'InternalServerError',
        message: err instanceof Error ? err.message : 'Failed to retrieve workspace',
        timestamp: new Date().toISOString()
      })
    );
  }
}

/**
 * POST /api/v1/workspaces
 * Creates a new workspace in Draft state. Validates organizerId against users.json.
 */
export async function handleCreateWorkspace(
  req: IncomingMessage,
  res: ServerResponse,
  body: unknown
): Promise<void> {
  try {
    const users = await storage.getAll<{ id: string; role: string }>('users');
    const caller = resolveCallerContext(req, users);
    if (!caller.valid) {
      res.writeHead(caller.status, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: caller.status,
          error: caller.errorCode || 'Forbidden',
          message: caller.errorMessage,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (!caller.role || caller.role !== 'organizer' || !caller.isOrganizer) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: 'Forbidden: Explicit Organizer role required to create workspaces.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (!caller.userId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: 'Forbidden: Organizer identity required to create workspaces.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    // Reject mismatches between submitted organizerId and caller identity
    const rawPayload = (body && typeof body === 'object') ? (body as Record<string, unknown>) : {};
    const submittedOrgId = typeof rawPayload.organizerId === 'string' ? rawPayload.organizerId.trim() : undefined;
    if (submittedOrgId && submittedOrgId.toLowerCase() !== caller.userId.toLowerCase()) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'ForbiddenOperation',
          message: `Forbidden: Submitted organizerId '${submittedOrgId}' does not match caller identity '${caller.userId}'.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const validOrganizerIds = new Set(
      users.filter((u) => u.role.toLowerCase() === 'organizer').map((u) => u.id)
    );
    validOrganizerIds.add(caller.userId);

    const validation = validateCreateWorkspace(body, validOrganizerIds);
    if (!validation.valid || !validation.normalizedData) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 400,
          error: 'BadRequest',
          message: 'Workspace validation failed',
          validationErrors: validation.errors,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const payload = validation.normalizedData as Partial<CanonicalWorkspace>;
    const effectiveOrganizerId = caller.userId;

    // Atomic Mutex Lock: guarantees check-and-create serialization across concurrent requests
    await storage.withLock('workspaces-create', async () => {
      const allWorkspaces = await getAllNormalizedWorkspaces();

      // Idempotent draft creation: return existing canonical workspace if same organizer & clientDraftKey
      const effectiveDraftKey = payload.clientDraftKey || (req.headers['x-client-draft-key'] as string | undefined)?.trim();
      if (effectiveDraftKey) {
        const existing = allWorkspaces.find(
          (w) => w.organizerId === effectiveOrganizerId && w.clientDraftKey === effectiveDraftKey
        );
        if (existing) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              data: existing,
              timestamp: new Date().toISOString()
            })
          );
          return;
        }
      }

      // Generate unique canonical identifier
      const existingIds = new Set(allWorkspaces.map((w) => w.id));
      let nextNum = allWorkspaces.length + 101;
      while (existingIds.has(`WS-${nextNum}`)) {
        nextNum++;
      }
      const newId = `WS-${nextNum}`;
      const workspaceCode = `HUB-NEW-${nextNum}`;

      const now = new Date().toISOString();
      const newWorkspace: CanonicalWorkspace = {
        id: newId,
        workspaceCode,
        organizerId: effectiveOrganizerId,
        organizerLegalName: payload.organizerLegalName || 'LoftSpaces Hospitality Group',
        organizerTaxId: payload.organizerTaxId || '0314889211',
        organizerVerified: payload.organizerVerified !== false,
        legacyAliases: [],
        name: payload.name!,
        category: payload.category!,
        description: payload.description || '',
        shortDescription: payload.shortDescription || '',
        usableAreaSqm: payload.usableAreaSqm || 0,
        supportPhone: payload.supportPhone,
        supportEmail: payload.supportEmail,
        operatorContactName: payload.operatorContactName,
        operatorContactPhone: payload.operatorContactPhone,
        streetAddress: payload.streetAddress || '',
        buildingName: payload.buildingName,
        facilitySubtitle: payload.facilitySubtitle,
        district: payload.district || '',
        city: payload.city || '',
        postalCode: payload.postalCode,
        latitude: typeof payload.latitude === 'number' && !Number.isNaN(payload.latitude) ? payload.latitude : null,
        longitude: typeof payload.longitude === 'number' && !Number.isNaN(payload.longitude) ? payload.longitude : null,
        timezone: payload.timezone || 'Asia/Ho_Chi_Minh',
        entryInstructions: payload.entryInstructions,
        operatingHours: payload.operatingHours || [
          { dayOfWeek: 1, openTime: '08:00', closeTime: '20:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 2, openTime: '08:00', closeTime: '20:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 3, openTime: '08:00', closeTime: '20:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 4, openTime: '08:00', closeTime: '20:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 5, openTime: '08:00', closeTime: '20:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 6, openTime: '09:00', closeTime: '18:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 7, openTime: '00:00', closeTime: '00:00', isClosed: true, is24Hours: false }
        ],
        receptionHours: payload.receptionHours || '08:00 – 20:00 Weekdays',
        autoBlockPublicHolidays: payload.autoBlockPublicHolidays ?? false,
        checkInLeadMinutes: payload.checkInLeadMinutes ?? 15,
        checkInLateMinutes: payload.checkInLateMinutes ?? 30,
        amenities: payload.amenities || [],
        tags: payload.tags || [],
        coverImageUrl: payload.coverImageUrl || '',
        images: payload.images || [],
        capacityDesks: payload.capacityDesks || 0,
        meetingRooms: payload.meetingRooms || 0,
        focusPods: payload.focusPods || 0,
        capacityLabel: `${payload.capacityDesks || 0} Desks, ${payload.meetingRooms || 0} Mtgs`,
        totalFloors: payload.totalFloors || 1,
        floors: payload.floors || [],
        onboardingStep: 1,
        onboardingCompleted: false,
        draftProgress: 20,
        draftWarningMessage: 'Initial workspace draft created. Complete onboarding setup.',
        reviewStatus: 'Draft',
        submittedAt: null,
        reviewedBy: null,
        reviewedAt: null,
        reviewFeedback: null,
        moderationStatus: 'Normal',
        suspendedBy: null,
        suspendedAt: null,
        suspendReason: null,
        operatingStatus: 'Inactive',
        status: 'draft',
        isLive: false,
        turnstileOnline: false,
        accessMethod: 'Setup in progress',
        isListingVisible: false,
        featuredPosition: null,
        featuredFrom: null,
        featuredTo: null,
        bookingConfirmationMode: payload.bookingConfirmationMode || 'Instant',
        pricePerHour: payload.pricePerHour || 0,
        pricePerDay: payload.pricePerDay || 0,
        pricePerMonth: payload.pricePerMonth || null,
        rating: 0,
        reviewsCount: 0,
        occupancyRate: 0,
        grossRevenueMtd: 0,
        totalBookingsMtd: 0,
        tier: 'Standard',
        publicUrl: `https://nexspace.vn/spaces/${newId.toLowerCase()}`,
        clientDraftKey: effectiveDraftKey,
        createdAt: now,
        updatedAt: now,
        version: 1
      };

      const runtimeRecords = await storage.getAll<any>('workspaces');
      runtimeRecords.push(newWorkspace);
      await storage.writeAll('workspaces', runtimeRecords);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          data: newWorkspace,
          timestamp: new Date().toISOString()
        })
      );
    });
  } catch (err: unknown) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        status: 500,
        error: 'InternalServerError',
        message: err instanceof Error ? err.message : 'Failed to create workspace',
        timestamp: new Date().toISOString()
      })
    );
  }
}

/**
 * PATCH /api/v1/workspaces/:id
 * Partially updates an existing workspace record. Enforces field allowlist,
 * optimistic concurrency control, and status invariants.
 */
export async function handleUpdateWorkspace(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
  body: unknown
): Promise<void> {
  try {
    const validation = validateUpdateWorkspace(body);
    if (!validation.valid) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 400,
          error: 'BadRequest',
          message: 'Workspace update rejected due to invalid or forbidden fields.',
          validationErrors: validation.errors,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const allWorkspaces = await getAllNormalizedWorkspaces();
    const existingIndex = allWorkspaces.findIndex((w) => {
      if (w.id.toLowerCase() === id.toLowerCase()) return true;
      if (w.workspaceCode && w.workspaceCode.toLowerCase() === id.toLowerCase()) return true;
      if (Array.isArray(w.legacyAliases)) {
        return w.legacyAliases.some((alias) => alias.toLowerCase() === id.toLowerCase());
      }
      return false;
    });

    if (existingIndex === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 404,
          error: 'NotFound',
          message: `Workspace with identifier '${id}' was not found.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const existing = allWorkspaces[existingIndex];

    // Tenant Scope / Ownership Authorization
    const users = await storage.getAll<{ id: string; role: string }>('users');
    const caller = resolveCallerContext(req, users);
    if (!caller.valid) {
      res.writeHead(caller.status, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: caller.status,
          error: caller.errorCode || 'Forbidden',
          message: caller.errorMessage,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (!caller.role || caller.role !== 'organizer' || !caller.isOrganizer) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: 'Forbidden: Explicit Organizer role required to update workspace.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (!caller.userId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: 'Forbidden: Organizer identity required to update workspace.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (existing.organizerId && existing.organizerId.toLowerCase() !== caller.userId.toLowerCase()) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'ForbiddenOperation',
          message: `Mock Organizer '${caller.userId}' is not authorized to mutate workspace '${existing.id}' owned by '${existing.organizerId}'.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const updates = (body as Record<string, any>) || {};

    // Optimistic Concurrency Control Precondition
    const expectedVersion = updates.expectedVersion !== undefined ? updates.expectedVersion : updates.version;
    if (expectedVersion !== undefined && expectedVersion !== existing.version) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 409,
          error: 'Conflict',
          message: `Optimistic concurrency conflict: supplied expected version ${expectedVersion} does not match current record version ${existing.version}.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    // Status Invariants Enforcement: Prevent bypassing Admin approval / moderation via generic PATCH
    if (updates.isListingVisible === true) {
      if (existing.reviewStatus !== 'Approved') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 400,
            error: 'IllegalStateTransition',
            message: `Workspace cannot be made publicly visible while reviewStatus is '${existing.reviewStatus}'. Must be 'Approved' by Administrator first.`,
            timestamp: new Date().toISOString()
          })
        );
        return;
      }
      if (existing.moderationStatus === 'Suspended') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 400,
            error: 'IllegalStateTransition',
            message: 'Workspace cannot be made publicly visible while moderationStatus is Suspended.',
            timestamp: new Date().toISOString()
          })
        );
        return;
      }
      if (existing.operatingStatus !== 'Active') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 400,
            error: 'IllegalStateTransition',
            message: `Workspace cannot be made publicly visible while operatingStatus is '${existing.operatingStatus}'. Must be 'Active'.`,
            timestamp: new Date().toISOString()
          })
        );
        return;
      }
    }

    // Clean out undefined values so existing workspace fields are not overridden by undefined
    const cleanedUpdates: Record<string, any> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        cleanedUpdates[key] = val;
      }
    }

    const updatedWorkspace: CanonicalWorkspace = {
      ...existing,
      ...cleanedUpdates,
      id: existing.id,
      workspaceCode: existing.workspaceCode,
      organizerId: existing.organizerId,
      organizerLegalName: existing.organizerLegalName,
      organizerTaxId: existing.organizerTaxId,
      organizerVerified: existing.organizerVerified,
      legacyAliases: existing.legacyAliases,
      reviewStatus: existing.reviewStatus === 'Rejected' ? 'Draft' : existing.reviewStatus,
      reviewedBy: existing.reviewedBy,
      reviewedAt: existing.reviewedAt,
      reviewFeedback: existing.reviewFeedback,
      moderationStatus: existing.moderationStatus,
      suspendedBy: existing.suspendedBy,
      suspendedAt: existing.suspendedAt,
      suspendReason: existing.suspendReason,
      operatingStatus: existing.operatingStatus,
      isLive: existing.isLive,
      featuredPosition: existing.featuredPosition,
      featuredFrom: existing.featuredFrom,
      featuredTo: existing.featuredTo,
      occupancyRate: existing.occupancyRate,
      rating: existing.rating,
      reviewsCount: existing.reviewsCount,
      grossRevenueMtd: existing.grossRevenueMtd,
      totalBookingsMtd: existing.totalBookingsMtd,
      status: existing.status,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1
    };

    await persistWorkspaceMutation(updatedWorkspace);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        data: updatedWorkspace,
        timestamp: new Date().toISOString()
      })
    );
  } catch (err: unknown) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        status: 500,
        error: 'InternalServerError',
        message: err instanceof Error ? err.message : 'Failed to update workspace',
        timestamp: new Date().toISOString()
      })
    );
  }
}

/**
 * PATCH /api/v1/workspaces/:id/lifecycle
 * Dedicated Organizer lifecycle command endpoint for operational state transitions
 * (pause, resume, maintenance, archive) with strict optimistic concurrency control.
 */
export async function handleWorkspaceLifecycle(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
  body: unknown
): Promise<void> {
  try {
    const validation = validateWorkspaceLifecycle(body);
    if (!validation.valid || !validation.normalizedData) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 400,
          error: 'BadRequest',
          message: 'Invalid workspace lifecycle payload.',
          validationErrors: validation.errors,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const { action, expectedVersion, reason } = validation.normalizedData;

    const allWorkspaces = await getAllNormalizedWorkspaces();
    const existingIndex = allWorkspaces.findIndex((w) => {
      if (w.id.toLowerCase() === id.toLowerCase()) return true;
      if (w.workspaceCode && w.workspaceCode.toLowerCase() === id.toLowerCase()) return true;
      if (Array.isArray(w.legacyAliases)) {
        return w.legacyAliases.some((alias) => alias.toLowerCase() === id.toLowerCase());
      }
      return false;
    });

    if (existingIndex === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 404,
          error: 'NotFound',
          message: `Workspace with identifier '${id}' was not found.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const existing = allWorkspaces[existingIndex];

    // Tenant Scope / Ownership Authorization
    const users = await storage.getAll<{ id: string; role: string }>('users');
    const caller = resolveCallerContext(req, users);
    if (!caller.valid) {
      res.writeHead(caller.status, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: caller.status,
          error: caller.errorCode || 'Forbidden',
          message: caller.errorMessage,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (!caller.role || caller.role !== 'organizer' || !caller.isOrganizer) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'ForbiddenOperation',
          message: 'Forbidden: Explicit Organizer role required for workspace lifecycle operations.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (!caller.userId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'ForbiddenOperation',
          message: 'Forbidden: Organizer identity required for workspace lifecycle operations.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (existing.organizerId && existing.organizerId.toLowerCase() !== caller.userId.toLowerCase()) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'ForbiddenOperation',
          message: `Mock Organizer '${caller.userId}' is not authorized to mutate workspace '${existing.id}' owned by '${existing.organizerId}'.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    // Optimistic Concurrency Precondition
    if (expectedVersion !== undefined && expectedVersion !== existing.version) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 409,
          error: 'Conflict',
          message: `Optimistic concurrency conflict: supplied expected version ${expectedVersion} does not match current record version ${existing.version}.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    let nextOperatingStatus: WorkspaceOperatingStatus = existing.operatingStatus;
    let nextIsLive = existing.isLive;
    let nextIsListingVisible = existing.isListingVisible;
    let nextStatus: CanonicalWorkspace['status'] = existing.status;

    switch (action) {
      case 'resume': {
        if (existing.reviewStatus !== 'Approved') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              status: 400,
              error: 'IllegalStateTransition',
              message: `Workspace cannot be resumed while reviewStatus is '${existing.reviewStatus}'. Must be 'Approved' by Administrator first.`,
              timestamp: new Date().toISOString()
            })
          );
          return;
        }
        if (existing.moderationStatus === 'Suspended') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              status: 403,
              error: 'ForbiddenOperation',
              message: 'Workspace cannot be resumed while under Administrator suspension. Contact NexSpace Trust & Safety.',
              timestamp: new Date().toISOString()
            })
          );
          return;
        }
        nextOperatingStatus = 'Active';
        nextIsLive = true;
        nextIsListingVisible = true;
        nextStatus = 'active';
        break;
      }
      case 'pause': {
        if (existing.reviewStatus === 'Draft') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              status: 400,
              error: 'IllegalStateTransition',
              message: 'Draft workspaces cannot be paused as they are not yet published.',
              timestamp: new Date().toISOString()
            })
          );
          return;
        }
        if (existing.moderationStatus === 'Suspended') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              status: 403,
              error: 'ForbiddenOperation',
              message: 'Cannot perform lifecycle actions on a suspended workspace.',
              timestamp: new Date().toISOString()
            })
          );
          return;
        }
        nextOperatingStatus = 'Inactive';
        nextIsLive = false;
        nextIsListingVisible = false;
        nextStatus = 'paused';
        break;
      }
      case 'maintenance': {
        if (existing.moderationStatus === 'Suspended') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              status: 403,
              error: 'ForbiddenOperation',
              message: 'Cannot perform lifecycle actions on a suspended workspace.',
              timestamp: new Date().toISOString()
            })
          );
          return;
        }
        nextOperatingStatus = 'Inactive';
        nextIsLive = false;
        nextIsListingVisible = false;
        nextStatus = 'maintenance';
        break;
      }
      case 'archive': {
        if (existing.moderationStatus === 'Suspended') {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              status: 403,
              error: 'ForbiddenOperation',
              message: 'Cannot archive a suspended workspace without administrative clearance.',
              timestamp: new Date().toISOString()
            })
          );
          return;
        }
        nextOperatingStatus = 'Archived';
        nextIsLive = false;
        nextIsListingVisible = false;
        nextStatus = 'archived';
        break;
      }
    }

    const updatedWorkspace: CanonicalWorkspace = {
      ...existing,
      operatingStatus: nextOperatingStatus,
      isLive: nextIsLive,
      isListingVisible: nextIsListingVisible,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1
    };

    await persistWorkspaceMutation(updatedWorkspace);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        data: updatedWorkspace,
        actionExecuted: action,
        reason: reason || null,
        timestamp: new Date().toISOString()
      })
    );
  } catch (err: unknown) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        status: 500,
        error: 'InternalServerError',
        message: err instanceof Error ? err.message : 'Failed to update workspace lifecycle',
        timestamp: new Date().toISOString()
      })
    );
  }
}

/**
 * POST /api/v1/workspaces/:id/submit
 * Dedicated Organizer command endpoint for submitting a complete Draft workspace for Administrator review.
 * Enforces mandatory field validation, ownership check, optimistic concurrency, and transitions state to Pending.
 */
export async function handleWorkspaceSubmit(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
  body: unknown
): Promise<void> {
  try {
    const allWorkspaces = await getAllNormalizedWorkspaces();
    const existingIndex = allWorkspaces.findIndex((w) => {
      if (w.id.toLowerCase() === id.toLowerCase()) return true;
      if (w.workspaceCode && w.workspaceCode.toLowerCase() === id.toLowerCase()) return true;
      if (Array.isArray(w.legacyAliases)) {
        return w.legacyAliases.some((alias) => alias.toLowerCase() === id.toLowerCase());
      }
      return false;
    });

    if (existingIndex === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 404,
          error: 'NotFound',
          message: `Workspace with identifier '${id}' was not found.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const existing = allWorkspaces[existingIndex];

    // Caller Ownership / Authorization
    const users = await storage.getAll<{ id: string; role: string }>('users');
    const caller = resolveCallerContext(req, users);
    if (!caller.valid) {
      res.writeHead(caller.status, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: caller.status,
          error: caller.errorCode || 'Forbidden',
          message: caller.errorMessage,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (!caller.role || caller.role !== 'organizer' || !caller.isOrganizer) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'ForbiddenOperation',
          message: 'Forbidden: Explicit Organizer role required to submit workspace for review.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (!caller.userId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'ForbiddenOperation',
          message: 'Forbidden: Organizer identity required to submit workspace for review.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (existing.organizerId && existing.organizerId.toLowerCase() !== caller.userId.toLowerCase()) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'ForbiddenOperation',
          message: `Mock Organizer '${caller.userId}' is not authorized to submit workspace '${existing.id}' owned by '${existing.organizerId}'.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    // Optimistic Concurrency Control Precondition
    const bodyObj = (body && typeof body === 'object') ? (body as Record<string, any>) : {};
    const expectedVer = bodyObj.expectedVersion !== undefined ? bodyObj.expectedVersion : bodyObj.version;
    if (expectedVer !== undefined && expectedVer !== existing.version) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 409,
          error: 'Conflict',
          message: `Optimistic concurrency conflict: supplied expected version ${expectedVer} does not match current record version ${existing.version}.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    // Validation of prerequisites and mandatory fields
    const validation = validateWorkspaceSubmission(existing, body, { uploadsDir: storage.getUploadsDir() });
    if (!validation.valid || !validation.normalizedData) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 400,
          error: 'BadRequest',
          message: 'Workspace submission rejected. Required onboarding information is incomplete or invalid.',
          validationErrors: validation.errors,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }


    const now = new Date().toISOString();
    const submissionNotes = (body as any)?.notes || (body as any)?.submissionNotes || null;
    const updatedWorkspace: CanonicalWorkspace = {
      ...existing,
      reviewStatus: 'Pending',
      status: 'pending',
      submittedAt: now,
      draftProgress: 100,
      onboardingCompleted: true,
      draftWarningMessage: null,
      submissionNotes: submissionNotes || existing.submissionNotes || null,
      updatedAt: now,
      version: existing.version + 1
    };

    await persistWorkspaceMutation(updatedWorkspace);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        data: updatedWorkspace,
        timestamp: new Date().toISOString()
      })
    );
  } catch (err: unknown) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        status: 500,
        error: 'InternalServerError',
        message: err instanceof Error ? err.message : 'Failed to submit workspace',
        timestamp: new Date().toISOString()
      })
    );
  }
}

/**
 * GET /api/v1/admin/workspaces/kpis
 * Dedicated Administrator endpoint for platform-wide workspace KPIs.
 * Computes metrics across the full canonical dataset independent of pagination.
 */
export async function handleGetAdminWorkspaceKpis(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const users = await storage.getAll<{ id: string; role: string }>('users');
    const caller = resolveCallerContext(req, users);

    if (!caller.valid) {
      res.writeHead(caller.status, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: caller.status,
          error: caller.errorCode,
          message: caller.errorMessage,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (!caller.isAdmin) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: 'Forbidden: Administrator authority required to access workspace KPIs.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (!caller.userId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: 'Forbidden: Administrator identity required to access workspace KPIs.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const validAdminIds = new Set(
      users.filter((u) => u.role === 'Administrator').map((u) => u.id)
    );

    if (!validAdminIds.has(caller.userId)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: `Forbidden: User '${caller.userId}' is not an authorized Administrator.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const allWorkspaces = await getAllNormalizedWorkspaces();
    const now = Date.now();

    const published = allWorkspaces.filter(isPubliclyEligible).length;
    const pending = allWorkspaces.filter((w) => w.reviewStatus === 'Pending').length;
    const suspended = allWorkspaces.filter((w) => w.moderationStatus === 'Suspended').length;
    const drafts = allWorkspaces.filter((w) => w.reviewStatus === 'Draft').length;

    let oldestHours = 0;
    const pendingSpaces = allWorkspaces.filter((w) => w.reviewStatus === 'Pending');
    if (pendingSpaces.length > 0) {
      const timestamps = pendingSpaces
        .map((w) => (w.submittedAt ? new Date(w.submittedAt).getTime() : 0))
        .filter((t) => t > 0);
      if (timestamps.length > 0) {
        const earliest = Math.min(...timestamps);
        oldestHours = Math.max(0, Math.floor((now - earliest) / (1000 * 60 * 60)));
      }
    }

    const cities = new Set(allWorkspaces.map((w) => w.city).filter(Boolean));
    const metroCount = cities.size;

    const kpiData = {
      totalWorkspaces: allWorkspaces.length,
      totalPublishedSpaces: published,
      publishedMonthlyGrowth: null,
      metroHubsCount: metroCount,
      pendingModerationCount: pending,
      pendingOldestHours: oldestHours,
      suspendedCount: suspended,
      suspendedGrievanceDetails:
        suspended > 0
          ? `${suspended} workspace(s) currently suspended by admin action`
          : 'No active suspensions',
      partnerDraftsCount: drafts
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: true,
        data: kpiData,
        timestamp: new Date().toISOString()
      })
    );
  } catch (err: unknown) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        status: 500,
        error: 'InternalServerError',
        message: err instanceof Error ? err.message : 'Failed to retrieve workspace KPIs',
        timestamp: new Date().toISOString()
      })
    );
  }
}

/**
 * PATCH /api/v1/admin/workspaces/:id/review
 * Dedicated Administrator endpoint for approving, rejecting, or requesting changes.
 */
export async function handleAdminReviewWorkspace(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
  body: unknown
): Promise<void> {
  try {
    const users = await storage.getAll<{ id: string; role: string }>('users');
    const caller = resolveCallerContext(req, users);

    if (!caller.valid) {
      res.writeHead(caller.status, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: caller.status,
          error: caller.errorCode,
          message: caller.errorMessage,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (!caller.isAdmin) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: 'Forbidden: Administrator authority required to perform review actions.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (!caller.userId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: 'Forbidden: Administrator identity required to perform review actions.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const validAdminIds = new Set(
      users.filter((u) => u.role === 'Administrator').map((u) => u.id)
    );

    if (!validAdminIds.has(caller.userId)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: `Forbidden: User '${caller.userId}' is not an authorized Administrator.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const bodyReviewer = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).reviewedBy : undefined;
    if (typeof bodyReviewer === 'string' && bodyReviewer.trim() && caller.userId !== bodyReviewer.trim()) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: `Forbidden: Authenticated administrator '${caller.userId}' does not match body-specified reviewer '${bodyReviewer}'.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const validation = validateAdminReviewWorkspace(body, validAdminIds);
    if (!validation.valid || !validation.normalizedData) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 400,
          error: 'BadRequest',
          message: 'Admin review command validation failed',
          validationErrors: validation.errors,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const { reviewStatus, reviewFeedback, expectedVersion } = validation.normalizedData;

    await storage.withLock('workspaces-mutation', async () => {
      const allWorkspaces = await getAllNormalizedWorkspaces();
      const existingIndex = allWorkspaces.findIndex((w) => {
        if (w.id.toLowerCase() === id.toLowerCase()) return true;
        if (w.workspaceCode && w.workspaceCode.toLowerCase() === id.toLowerCase()) return true;
        if (Array.isArray(w.legacyAliases)) {
          return w.legacyAliases.some((alias) => alias.toLowerCase() === id.toLowerCase());
        }
        return false;
      });

      if (existingIndex === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 404,
            error: 'NotFound',
            message: `Workspace with identifier '${id}' was not found.`,
            timestamp: new Date().toISOString()
          })
        );
        return;
      }

      const existing = allWorkspaces[existingIndex];

      if (existing.reviewStatus === 'Draft') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 400,
            error: 'BadRequest',
            message: 'Cannot review a workspace in Draft status; the workspace must be submitted by the Organizer first.',
            timestamp: new Date().toISOString()
          })
        );
        return;
      }

      if (existing.version !== expectedVersion) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 409,
            error: 'Conflict',
            message: `Optimistic concurrency conflict: Workspace was modified by another session (expected version ${expectedVersion}, current version ${existing.version}). Please refresh and reconfirm your review decision.`,
            timestamp: new Date().toISOString()
          })
        );
        return;
      }

      const now = new Date().toISOString();

      let operatingStatus = existing.operatingStatus;
      let isLive = existing.isLive;
      let isListingVisible = existing.isListingVisible;
      let status = existing.status;

      if (reviewStatus !== 'Approved') {
        operatingStatus = 'Inactive';
        isLive = false;
        isListingVisible = false;
        status = reviewStatus.toLowerCase() as any;
      } else {
        // Preserves operatingStatus, isLive, and isListingVisible
        status = existing.operatingStatus === 'Active' ? 'active' : 'draft';
      }

      const updatedWorkspace: CanonicalWorkspace = {
        ...existing,
        reviewStatus,
        reviewedBy: caller.userId, // Persist strictly from validated caller identity
        reviewedAt: now,
        reviewFeedback: reviewFeedback || null,
        operatingStatus,
        isLive,
        isListingVisible,
        status,
        updatedAt: now,
        version: existing.version + 1
      };

      await persistWorkspaceMutation(updatedWorkspace);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          data: updatedWorkspace,
          timestamp: new Date().toISOString()
        })
      );
    });
  } catch (err: unknown) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        status: 500,
        error: 'InternalServerError',
        message: err instanceof Error ? err.message : 'Failed to execute admin review',
        timestamp: new Date().toISOString()
      })
    );
  }
}

/**
 * PATCH /api/v1/admin/workspaces/:id/moderation
 * Dedicated Administrator endpoint for suspending or restoring a workspace.
 */
export async function handleAdminModerationWorkspace(
  req: IncomingMessage,
  res: ServerResponse,
  id: string,
  body: unknown
): Promise<void> {
  try {
    const users = await storage.getAll<{ id: string; role: string }>('users');
    const caller = resolveCallerContext(req, users);

    if (!caller.valid) {
      res.writeHead(caller.status, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: caller.status,
          error: caller.errorCode,
          message: caller.errorMessage,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (!caller.isAdmin) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: 'Forbidden: Administrator authority required to perform moderation actions.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    if (!caller.userId) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: 'Forbidden: Administrator identity required to perform moderation actions.',
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const validAdminIds = new Set(
      users.filter((u) => u.role === 'Administrator').map((u) => u.id)
    );

    if (!validAdminIds.has(caller.userId)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: `Forbidden: User '${caller.userId}' is not an authorized Administrator.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const bodySuspendedBy = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).suspendedBy : undefined;
    if (typeof bodySuspendedBy === 'string' && bodySuspendedBy.trim() && caller.userId !== bodySuspendedBy.trim()) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 403,
          error: 'Forbidden',
          message: `Forbidden: Authenticated administrator '${caller.userId}' does not match body-specified moderator '${bodySuspendedBy}'.`,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const validation = validateAdminModerationWorkspace(body, validAdminIds);
    if (!validation.valid || !validation.normalizedData) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: false,
          status: 400,
          error: 'BadRequest',
          message: 'Admin moderation command validation failed',
          validationErrors: validation.errors,
          timestamp: new Date().toISOString()
        })
      );
      return;
    }

    const { moderationStatus, suspendReason, expectedVersion } = validation.normalizedData;

    await storage.withLock('workspaces-mutation', async () => {
      const allWorkspaces = await getAllNormalizedWorkspaces();
      const existingIndex = allWorkspaces.findIndex((w) => {
        if (w.id.toLowerCase() === id.toLowerCase()) return true;
        if (w.workspaceCode && w.workspaceCode.toLowerCase() === id.toLowerCase()) return true;
        if (Array.isArray(w.legacyAliases)) {
          return w.legacyAliases.some((alias) => alias.toLowerCase() === id.toLowerCase());
        }
        return false;
      });

      if (existingIndex === -1) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 404,
            error: 'NotFound',
            message: `Workspace with identifier '${id}' was not found.`,
            timestamp: new Date().toISOString()
          })
        );
        return;
      }

      const existing = allWorkspaces[existingIndex];

      if (existing.version !== expectedVersion) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            status: 409,
            error: 'Conflict',
            message: `Optimistic concurrency conflict: Workspace was modified by another session (expected version ${expectedVersion}, current version ${existing.version}). Please refresh and reconfirm your moderation decision.`,
            timestamp: new Date().toISOString()
          })
        );
        return;
      }

      const now = new Date().toISOString();

      let operatingStatus = existing.operatingStatus;
      let isLive = existing.isLive;
      let isListingVisible = existing.isListingVisible;
      let status = existing.status;

      if (moderationStatus === 'Suspended') {
        operatingStatus = 'Inactive';
        isLive = false;
        isListingVisible = false;
        status = 'suspended';
      } else {
        // Restoring to Normal moderation: approved workspaces return to active bookable state
        if (existing.reviewStatus === 'Approved') {
          operatingStatus = 'Active';
          isLive = true;
          isListingVisible = true;
          status = 'active';
        } else {
          status = existing.reviewStatus.toLowerCase() as any;
        }
      }

      const updatedWorkspace: CanonicalWorkspace = {
        ...existing,
        moderationStatus,
        suspendedBy: moderationStatus === 'Suspended' ? caller.userId : null, // Persist strictly from validated caller identity
        suspendedAt: moderationStatus === 'Suspended' ? now : null,
        suspendReason: moderationStatus === 'Suspended' ? suspendReason || null : null,
        operatingStatus,
        isLive,
        isListingVisible,
        status,
        updatedAt: now,
        version: existing.version + 1
      };

      await persistWorkspaceMutation(updatedWorkspace);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          data: updatedWorkspace,
          timestamp: new Date().toISOString()
        })
      );
    });
  } catch (err: unknown) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        status: 500,
        error: 'InternalServerError',
        message: err instanceof Error ? err.message : 'Failed to execute admin moderation',
        timestamp: new Date().toISOString()
      })
    );
  }
}
