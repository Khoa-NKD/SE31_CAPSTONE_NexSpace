import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateWorkspacePreferenceScore,
  sortWorkspacesByPreferences,
  normalizeVietnamese,
  parsePreferenceDistrict
} from './preference-scoring.ts';
import type { CustomerPreferenceDto } from '../../customer-preferences/api/types.ts';
import type { LandingWorkspaceCardData } from '../components/workspace-card.tsx';

describe('preference-scoring', () => {
  it('normalizes Vietnamese characters correctly', () => {
    assert.equal(normalizeVietnamese('Đà Nẵng'), 'da nang');
    assert.equal(normalizeVietnamese('Hải Châu (Đà Nẵng)'), 'hai chau da nang');
    assert.equal(normalizeVietnamese('Sơn Trà'), 'son tra');
  });

  it('parses preference district string with parentheses', () => {
    const parsed = parsePreferenceDistrict('Hải Châu (Đà Nẵng)');
    assert.equal(parsed.district, 'Hải Châu');
    assert.equal(parsed.province, 'Đà Nẵng');
    assert.equal(parsed.normalizedDistrict, 'hai chau');
    assert.equal(parsed.normalizedProvince, 'da nang');
  });

  it('prioritizes workspaces matching customer preferences in Da Nang', () => {
    const daNangCustomerPref: CustomerPreferenceDto = {
      customerId: 1,
      districts: [
        'Hải Châu (Đà Nẵng)',
        'Sơn Trà (Đà Nẵng)',
        'Ngũ Hành Sơn (Đà Nẵng)',
        'Thanh Khê (Đà Nẵng)',
        'Cẩm Lệ (Đà Nẵng)'
      ],
      amenityIds: [],
      budgetMin: 30000,
      budgetMax: 100000,
      resourceCategory: 'ANY',
      noiseLevel: 'QUIET',
      purpose: 'FREELANCE',
      updatedAt: '2026-11-24'
    };

    const enouvoDaNang: LandingWorkspaceCardData = {
      id: '136',
      name: 'Enouvo Space 2 Dragon Bridge',
      city: 'Đà Nẵng',
      district: 'Sơn Trà',
      category: 'COWORKING_HUB',
      description: 'Không gian yên tĩnh, lý tưởng cho freelance',
      startingPrice: 30000,
      rating: 5.0,
      reviewCount: 2
    } as unknown as LandingWorkspaceCardData;

    const dreamplexHcm: LandingWorkspaceCardData = {
      id: '135',
      name: 'Dreamplex Nguyễn Trung Ngạn',
      city: 'Hồ Chí Minh',
      district: 'Quận 1',
      category: 'COWORKING_HUB',
      description: 'Không gian năng động',
      startingPrice: 30000,
      rating: 5.0,
      reviewCount: 1
    } as unknown as LandingWorkspaceCardData;

    const hiveHcm: LandingWorkspaceCardData = {
      id: '134',
      name: 'The Hive Thảo Điền',
      city: 'Hồ Chí Minh',
      district: 'Thủ Đức',
      category: 'CREATIVE_STUDIO',
      description: 'Không gian mở',
      startingPrice: 30000,
      rating: 4.6,
      reviewCount: 5
    } as unknown as LandingWorkspaceCardData;

    const workspaces = [dreamplexHcm, hiveHcm, enouvoDaNang];
    const sorted = sortWorkspacesByPreferences(workspaces, daNangCustomerPref);

    // Enouvo Space (Da Nang, Son Tra) MUST be sorted to the very front!
    assert.equal(sorted[0].id, '136');
    assert.equal(sorted[0].name, 'Enouvo Space 2 Dragon Bridge');

    const scoreEnouvo = calculateWorkspacePreferenceScore(enouvoDaNang, daNangCustomerPref);
    const scoreDreamplex = calculateWorkspacePreferenceScore(dreamplexHcm, daNangCustomerPref);
    assert.ok(scoreEnouvo.score > scoreDreamplex.score, 'Enouvo must score higher than Dreamplex for Da Nang customer');
    assert.ok(scoreEnouvo.isMatch, 'Enouvo should be marked as matching');
  });

  it('prioritizes HCM workspaces for an HCM customer', () => {
    const hcmCustomerPref: CustomerPreferenceDto = {
      customerId: 2,
      districts: ['Quận 1 (TP. HCM)', 'Bình Thạnh (TP. HCM)'],
      amenityIds: [],
      budgetMin: null,
      budgetMax: null,
      resourceCategory: 'ANY',
      noiseLevel: null,
      purpose: null,
      updatedAt: '2026-11-24'
    };

    const enouvoDaNang: LandingWorkspaceCardData = {
      id: '136',
      name: 'Enouvo Space 2 Dragon Bridge',
      city: 'Đà Nẵng',
      district: 'Sơn Trà',
      category: 'COWORKING_HUB',
      startingPrice: 30000
    } as unknown as LandingWorkspaceCardData;

    const dreamplexHcm: LandingWorkspaceCardData = {
      id: '135',
      name: 'Dreamplex Nguyễn Trung Ngạn',
      city: 'Hồ Chí Minh',
      district: 'Quận 1',
      category: 'COWORKING_HUB',
      startingPrice: 30000
    } as unknown as LandingWorkspaceCardData;

    const workspaces = [enouvoDaNang, dreamplexHcm];
    const sorted = sortWorkspacesByPreferences(workspaces, hcmCustomerPref);

    assert.equal(sorted[0].id, '135', 'Dreamplex (District 1) must be first for HCM customer');
  });

  it('preserves order when customer has no configured preferences', () => {
    const emptyPref: CustomerPreferenceDto = {
      customerId: 3,
      districts: [],
      amenityIds: [],
      budgetMin: null,
      budgetMax: null,
      resourceCategory: 'ANY',
      noiseLevel: null,
      purpose: null,
      updatedAt: null
    };

    const ws1 = { id: '1', name: 'WS 1' } as unknown as LandingWorkspaceCardData;
    const ws2 = { id: '2', name: 'WS 2' } as unknown as LandingWorkspaceCardData;
    const sorted = sortWorkspacesByPreferences([ws1, ws2], emptyPref);

    assert.equal(sorted[0].id, '1');
    assert.equal(sorted[1].id, '2');
  });
});
