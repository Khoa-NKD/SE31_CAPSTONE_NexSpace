import type { AvailabilityState } from '../api/resources';

export const availabilityColors: Record<AvailabilityState, string> = {
  AVAILABLE: '#10b981',
  LOCKED: '#d97706',
  BOOKED: '#3b82f6',
  DISABLED: '#64748b',
  MAINTENANCE: '#a855f7'
};
export function availabilityLabel(state: AvailabilityState, vi: boolean) {
  const labels: Record<AvailabilityState, [string, string]> = {
    AVAILABLE: ['Available', 'Còn trống'],
    LOCKED: ['Locked', 'Đang khóa / giữ chỗ'],
    BOOKED: ['Booked', 'Đã được đặt'],
    DISABLED: ['Disabled', 'Chưa / ngừng nhận đặt'],
    MAINTENANCE: ['Maintenance', 'Đang bảo trì']
  };
  return labels[state][vi ? 1 : 0];
}
export function availabilityInterval(
  from: string,
  to: string
): { from: string; to: string } | null {
  const start = new Date(from),
    end = new Date(to);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start)
    return null;
  return { from: start.toISOString(), to: end.toISOString() };
}
