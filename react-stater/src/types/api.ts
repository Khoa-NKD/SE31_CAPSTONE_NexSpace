/**
 * NexSpace API Contract Foundation — Core Transport & Envelopes
 *
 * NOTE: These response structures define the baseline transport and envelopes.
 * Specific backend DTO differences are bridged using ResponseAdapter patterns in
 * each domain's `api/` directory so UI components remain isolated from wire format shifts.
 */

/**
 * Standard API Response Envelope.
 * @template T - The payload type
 */
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp?: string;
}

/**
 * Standard Spring Data Pageable Response Envelope.
 * Used for paginated table queries.
 * @template T - The entity item type
 */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

/**
 * Standard API Error Response Payload.
 */
export interface ApiErrorPayload {
  success: false;
  status: number;
  error: string;
  message: string;
  path?: string;
  timestamp?: string;
  validationErrors?: Record<string, string>;
}

/**
 * Generic Query Parameters for Paginated and Filtered Requests.
 */
export interface PaginationParams {
  page?: number;
  size?: number;
  sort?: string;
  search?: string;
}

/**
 * Response Adapter Pattern.
 * Bridges differences between wire DTO formats and frontend UI domain models.
 */
export interface ResponseAdapter<TDto, TDomain> {
  toDomain(dto: TDto): TDomain;
  toDto?(domain: Partial<TDomain>): Partial<TDto>;
}
