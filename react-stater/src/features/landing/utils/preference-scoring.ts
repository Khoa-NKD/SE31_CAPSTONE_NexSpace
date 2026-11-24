import type { CustomerPreferenceDto } from '@/features/customer-preferences/api/types';
import type { LandingWorkspaceCardData } from '../components/workspace-card';

/**
 * Remove Vietnamese diacritics and normalize for resilient text matching.
 */
export function normalizeVietnamese(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ParsedDistrictItem {
  raw: string;
  district: string;
  province: string;
  normalizedDistrict: string;
  normalizedProvince: string;
}

/**
 * Parses format like "Hải Châu (Đà Nẵng)" or "Quận 1 (TP. HCM)" into parts.
 */
export function parsePreferenceDistrict(item: string): ParsedDistrictItem {
  const match = item.match(/^(.*?)(?:\s*\((.*?)\))?$/);
  const district = (match?.[1] || item).trim();
  const province = (match?.[2] || '').trim();

  return {
    raw: item,
    district,
    province,
    normalizedDistrict: normalizeVietnamese(district),
    normalizedProvince: normalizeVietnamese(province)
  };
}

export interface PreferenceMatchResult {
  score: number;
  isMatch: boolean;
  hasActivePreferences: boolean;
  reasons: string[];
}

/**
 * Checks if the customer has actually configured any preferences.
 */
export function hasConfiguredPreferences(
  pref: CustomerPreferenceDto | null | undefined
): boolean {
  if (!pref) return false;
  const hasDistricts = Array.isArray(pref.districts) && pref.districts.length > 0;
  const hasBudget = pref.budgetMin !== null || pref.budgetMax !== null;
  const hasCategory = Boolean(pref.resourceCategory && pref.resourceCategory !== 'ANY');
  const hasNoise = Boolean(pref.noiseLevel);
  const hasPurpose = Boolean(pref.purpose);
  return hasDistricts || hasBudget || hasCategory || hasNoise || hasPurpose;
}

/**
 * Calculate match score between a workspace and customer personal preferences.
 * Higher score = higher ranking on the landing page.
 */
export function calculateWorkspacePreferenceScore(
  workspace: LandingWorkspaceCardData,
  pref: CustomerPreferenceDto | null | undefined
): PreferenceMatchResult {
  if (!hasConfiguredPreferences(pref)) {
    return {
      score: 0,
      isMatch: false,
      hasActivePreferences: false,
      reasons: []
    };
  }

  let score = 0;
  const reasons: string[] = [];

  const wsCityNorm = normalizeVietnamese(workspace.city);
  const wsDistrictNorm = normalizeVietnamese(workspace.district);
  const rawWs = workspace as unknown as Record<string, unknown>;
  const wsAddress =
    ('streetAddress' in workspace && typeof workspace.streetAddress === 'string'
      ? workspace.streetAddress
      : '') ||
    (typeof rawWs.address === 'string' ? rawWs.address : '');
  const wsAddressNorm = normalizeVietnamese(wsAddress);
  const wsNameNorm = normalizeVietnamese(workspace.name);
  const wsCombinedLocation = `${wsDistrictNorm} ${wsCityNorm} ${wsAddressNorm} ${wsNameNorm}`;

  // 1. District & Province Matching (Weight: Up to 140 pts)
  if (pref?.districts && pref.districts.length > 0) {
    let matchedDistrict = false;
    let matchedProvince = false;

    for (const rawDist of pref.districts) {
      const parsed = parsePreferenceDistrict(rawDist);

      // Check district match
      if (
        parsed.normalizedDistrict &&
        (wsDistrictNorm.includes(parsed.normalizedDistrict) ||
          parsed.normalizedDistrict.includes(wsDistrictNorm) ||
          wsCombinedLocation.includes(parsed.normalizedDistrict))
      ) {
        matchedDistrict = true;
        reasons.push(`Khu vực ${parsed.district}`);
        break;
      }

      // Check province/city match if district didn't match directly
      if (
        parsed.normalizedProvince &&
        (wsCityNorm.includes(parsed.normalizedProvince) ||
          parsed.normalizedProvince.includes(wsCityNorm) ||
          wsCombinedLocation.includes(parsed.normalizedProvince))
      ) {
        matchedProvince = true;
      }
    }

    if (matchedDistrict) {
      score += 100;
    } else if (matchedProvince) {
      score += 40;
      reasons.push('Tỉnh / Thành phố phù hợp');
    }
  }

  // 2. Budget Matching (Weight: Up to 50 pts)
  const candidatePrice =
    ('pricePerHour' in workspace && typeof workspace.pricePerHour === 'number' && workspace.pricePerHour > 0
      ? workspace.pricePerHour
      : undefined) ??
    (typeof rawWs.startingPrice === 'number' ? rawWs.startingPrice : undefined);
  const price = candidatePrice && candidatePrice > 0 ? candidatePrice : null;

  if (price !== null && (pref?.budgetMin !== null || pref?.budgetMax !== null)) {
    const min = pref?.budgetMin ?? 0;
    const max = pref?.budgetMax ?? Number.MAX_SAFE_INTEGER;

    if (price >= min && price <= max) {
      score += 50;
      reasons.push('Khoảng giá phù hợp');
    } else if (price < min && price >= min * 0.7) {
      // Cheaper than min is also acceptable
      score += 25;
      reasons.push('Mức giá tiết kiệm');
    }
  }

  // 3. Resource Category Matching (Weight: Up to 40 pts)
  if (pref?.resourceCategory && pref.resourceCategory !== 'ANY') {
    const category = (workspace.category || '').toUpperCase();
    if (pref.resourceCategory === 'DESK') {
      if (
        category.includes('COWORKING') ||
        category.includes('HUB') ||
        category.includes('DESK')
      ) {
        score += 40;
        reasons.push('Loại không gian bàn làm việc');
      }
    } else if (pref.resourceCategory === 'ROOM') {
      if (
        category.includes('MEETING') ||
        category.includes('PRIVATE') ||
        category.includes('SERVICED') ||
        category.includes('OFFICE') ||
        category.includes('STUDIO')
      ) {
        score += 40;
        reasons.push('Loại không gian phòng riêng / phòng họp');
      }
    }
  }

  // 4. Noise Level & Purpose Matching (Weight: Up to 30 pts)
  const descNorm = normalizeVietnamese(
    `${workspace.description || ''} ${'shortDescription' in workspace ? workspace.shortDescription || '' : ''}`
  );

  if (pref?.noiseLevel) {
    if (pref.noiseLevel === 'QUIET' && (descNorm.includes('yen tinh') || descNorm.includes('tap trung') || descNorm.includes('quiet'))) {
      score += 15;
    } else if (pref.noiseLevel === 'LIVELY' && (descNorm.includes('soi dong') || descNorm.includes('ket noi') || descNorm.includes('cong dong'))) {
      score += 15;
    }
  }

  if (pref?.purpose) {
    if (pref.purpose === 'FREELANCE' && (descNorm.includes('freelance') || descNorm.includes('ca nhan') || descNorm.includes('linh hoat'))) {
      score += 15;
    } else if (pref.purpose === 'STUDY' && (descNorm.includes('hoc') || descNorm.includes('sinh vien') || descNorm.includes('doc sach'))) {
      score += 15;
    } else if (pref.purpose === 'TEAM_WORK' && (descNorm.includes('nhom') || descNorm.includes('team') || descNorm.includes('du an'))) {
      score += 15;
    }
  }

  return {
    score,
    isMatch: score > 0,
    hasActivePreferences: true,
    reasons
  };
}

/**
 * Sorts workspaces prioritizing those that match the customer's personal preferences.
 * If user has no active preferences, preserves default order.
 */
export function sortWorkspacesByPreferences(
  workspaces: LandingWorkspaceCardData[],
  pref: CustomerPreferenceDto | null | undefined
): LandingWorkspaceCardData[] {
  if (!hasConfiguredPreferences(pref)) {
    return workspaces;
  }

  return [...workspaces].sort((a, b) => {
    const scoreA = calculateWorkspacePreferenceScore(a, pref).score;
    const scoreB = calculateWorkspacePreferenceScore(b, pref).score;

    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }

    // Tie-breaker 1: Rating (higher first)
    const ratingA = typeof a.rating === 'number' ? a.rating : 0;
    const ratingB = typeof b.rating === 'number' ? b.rating : 0;
    if (ratingB !== ratingA) {
      return ratingB - ratingA;
    }

    // Tie-breaker 2: Review count
    const rawA = a as unknown as Record<string, unknown>;
    const rawB = b as unknown as Record<string, unknown>;
    const reviewsA =
      typeof a.reviewsCount === 'number'
        ? a.reviewsCount
        : typeof rawA.reviewCount === 'number'
          ? (rawA.reviewCount as number)
          : 0;
    const reviewsB =
      typeof b.reviewsCount === 'number'
        ? b.reviewsCount
        : typeof rawB.reviewCount === 'number'
          ? (rawB.reviewCount as number)
          : 0;
    return reviewsB - reviewsA;
  });
}
