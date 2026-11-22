import type { MapResource } from '../components/detail/public-floor-map';
import type { ResourceAvailabilityItem } from '../api/booking-types';
export function customerResourceStatus(
  resource: MapResource,
  availability?: ResourceAvailabilityItem,
  heldByMe = false
) {
  // A manual activation restriction must not erase an ongoing maintenance overlay.
  // A genuinely bookable future interval still takes precedence after maintenance ends.
  const state =
    resource.state === 'MAINTENANCE' && availability?.state === 'DISABLED'
      ? 'MAINTENANCE'
      : (availability?.state ?? resource.state);
  const maintenance = state === 'MAINTENANCE',
    disabled = state === 'DISABLED';
  const booked = state === 'BOOKED',
    locked = (state === 'LOCKED' || state === 'HOLDING') && !heldByMe;
  return {
    state: maintenance
      ? 'MAINTENANCE'
      : disabled
        ? 'DISABLED'
        : booked
          ? 'BOOKED'
          : locked
            ? 'LOCKED'
            : 'AVAILABLE',
    maintenance,
    disabled,
    booked,
    locked,
    available:
      !maintenance &&
      !disabled &&
      !booked &&
      !locked &&
      ((availability?.selectable ?? resource.selectable) || heldByMe)
  } as const;
}
