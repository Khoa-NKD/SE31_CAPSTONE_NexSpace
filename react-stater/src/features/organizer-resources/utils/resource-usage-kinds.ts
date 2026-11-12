import type { ResourceUsageKind } from '../api/resources';
export const resourceUsageKinds: Array<{
  value: ResourceUsageKind;
  category: 'DESK' | 'ROOM';
  en: string;
  vi: string;
}> = [
  { value: 'WORK_SEAT', category: 'DESK', en: 'Work seat', vi: 'Ghế làm việc' },
  { value: 'SOFA_SEAT', category: 'DESK', en: 'Bookable sofa seat', vi: 'Chỗ sofa đặt riêng' },
  { value: 'OTHER_SEAT', category: 'DESK', en: 'Other bookable seat', vi: 'Chỗ ngồi khác' },
  { value: 'MEETING_ROOM', category: 'ROOM', en: 'Meeting room', vi: 'Phòng họp' },
  { value: 'PRIVATE_OFFICE', category: 'ROOM', en: 'Private office', vi: 'Văn phòng riêng' },
  { value: 'SHARED_ROOM', category: 'ROOM', en: 'Shared workroom', vi: 'Phòng làm việc chung' },
  { value: 'OTHER_ROOM', category: 'ROOM', en: 'Other room', vi: 'Phòng khác' }
];
