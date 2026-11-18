import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultCancellationRules,
  cancellationPolicyError
} from '../../src/features/workspaces/utils/cancellation-policy.ts';
import {
  mapWizardStateToCreateDto,
  mapWizardStateToUpdateDto,
  mapCanonicalToWizardState
} from '../../src/features/organizer-onboarding/utils/wizard-api-mapper.ts';
import type { OnboardingDraftState } from '../../src/features/organizer-onboarding/types/wizard.ts';
import type { CanonicalWorkspace } from '../../src/features/workspaces/api/types.ts';
const c = (en: string) => en;

test('agreed defaults are independent editable copies and never start empty', () => {
  const first = defaultCancellationRules(),
    second = defaultCancellationRules();
  assert.deepEqual(
    first.map((row) => [row.minHoursBeforeStart, row.refundPercent]),
    [
      [24, 100],
      [12, 50],
      [2, 25],
      [0, 0]
    ]
  );
  first[0].refundPercent = 20;
  assert.equal(second[0].refundPercent, 100);
  assert.equal(cancellationPolicyError(second, c), null);
});
test('empty, duplicate, fractional and inconsistent policies cannot be saved', () => {
  for (const rules of [
    [],
    [{ minHoursBeforeStart: 1.5, refundPercent: 50 }],
    [
      { minHoursBeforeStart: 1, refundPercent: 50 },
      { minHoursBeforeStart: 1, refundPercent: 100 }
    ],
    [
      { minHoursBeforeStart: 24, refundPercent: 25 },
      { minHoursBeforeStart: 12, refundPercent: 50 }
    ],
    [{ minHoursBeforeStart: 2, refundPercent: 100.01 }],
    [{ minHoursBeforeStart: 2, refundPercent: 33.333 }],
    [{ minHoursBeforeStart: Number.NaN, refundPercent: 25 }]
  ])
    assert.notEqual(cancellationPolicyError(rules, c), null);
});
test('custom tiers preserve decimal percentages and validation does not reorder edited rows', () => {
  const rules = [
    { minHoursBeforeStart: 0, refundPercent: 0 },
    { minHoursBeforeStart: 48, refundPercent: 75.25 }
  ];
  assert.equal(cancellationPolicyError(rules, c), null);
  assert.equal(rules[0].minHoursBeforeStart, 0);
});
test('create, update and server hydration preserve the actual configured policy', () => {
  const custom = [
    { minHoursBeforeStart: 48, refundPercent: 80 },
    { minHoursBeforeStart: 0, refundPercent: 0 }
  ];
  const state = {
    basicInfo: {
      name: 'Test',
      category: 'coworking_hub',
      description: '',
      contactPhone: '',
      contactEmail: ''
    },
    location: {},
    operatingHours: { schedule: [], is247: true },
    media: { items: [], coverPhotoId: '' },
    floorPlan: { floors: [], zones: [] },
    cancellationRules: custom,
    amenities: []
  } as unknown as OnboardingDraftState;
  assert.deepEqual(mapWizardStateToCreateDto(state).cancellationRules, custom);
  assert.deepEqual(mapWizardStateToUpdateDto(state).cancellationRules, custom);
  assert.deepEqual(
    mapCanonicalToWizardState({
      cancellationRules: custom,
      operatingHours: []
    } as unknown as CanonicalWorkspace).cancellationRules,
    custom
  );
  assert.deepEqual(
    mapCanonicalToWizardState({ operatingHours: [] } as unknown as CanonicalWorkspace)
      .cancellationRules,
    defaultCancellationRules()
  );
});
