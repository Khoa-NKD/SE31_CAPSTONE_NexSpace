import { describe, it } from 'node:test';
import assert from 'node:assert';

export function buildWorkspaceAmenityPayload(
  amenityIds: string[],
  addonRates?: Record<string, number>
) {
  return {
    amenities: amenityIds
      .map((id) => {
        const numId = Number(id);
        if (isNaN(numId) || numId <= 0) return null;
        return {
          amenityId: numId,
          addonPricePerHour: Math.max(0, addonRates?.[id] || 0)
        };
      })
      .filter((item): item is { amenityId: number; addonPricePerHour: number } => item !== null)
  };
}

describe('Workspace Amenities Onboarding Payload Builder', () => {
  it('correctly maps numeric amenity IDs and complimentary rates (0 đ)', () => {
    const payload = buildWorkspaceAmenityPayload(['1', '2'], { '1': 0, '2': 0 });
    assert.strictEqual(payload.amenities.length, 2);
    assert.strictEqual(payload.amenities[0].amenityId, 1);
    assert.strictEqual(payload.amenities[0].addonPricePerHour, 0);
    assert.strictEqual(payload.amenities[1].amenityId, 2);
    assert.strictEqual(payload.amenities[1].addonPricePerHour, 0);
  });

  it('correctly attaches add-on hourly prices', () => {
    const payload = buildWorkspaceAmenityPayload(['10', '20'], { '10': 15000, '20': 50000 });
    assert.strictEqual(payload.amenities.length, 2);
    assert.strictEqual(payload.amenities[0].amenityId, 10);
    assert.strictEqual(payload.amenities[0].addonPricePerHour, 15000);
    assert.strictEqual(payload.amenities[1].amenityId, 20);
    assert.strictEqual(payload.amenities[1].addonPricePerHour, 50000);
  });

  it('filters out legacy alphanumeric string IDs', () => {
    const payload = buildWorkspaceAmenityPayload(['fast-wifi', '5', 'phone-booth', '8']);
    assert.strictEqual(payload.amenities.length, 2);
    assert.strictEqual(payload.amenities[0].amenityId, 5);
    assert.strictEqual(payload.amenities[1].amenityId, 8);
  });

  it('handles empty amenity list correctly', () => {
    const payload = buildWorkspaceAmenityPayload([]);
    assert.strictEqual(payload.amenities.length, 0);
  });

  it('clamps negative addon price to 0', () => {
    const payload = buildWorkspaceAmenityPayload(['5'], { '5': -5000 });
    assert.strictEqual(payload.amenities[0].addonPricePerHour, 0);
  });
});

