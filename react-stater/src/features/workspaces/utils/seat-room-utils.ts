export type Category = 'DESK' | 'ROOM' | 'ZONE' | 'DOOR' | 'WALL';

export type SpaceFilterType = 'ALL' | 'DESK' | 'MEETING_ROOM' | 'PRIVATE_OFFICE';

export interface MapResourceShape {
  id: number;
  code: string;
  name: string;
  category: Category;
  posX: number;
  posY: number;
  width: number;
  height: number;
  rotation: number;
  selectable: boolean;
  capacity?: number;
  typeName?: string;
  pricePerHour?: number;
  zoneName?: string;
}

export function isResourceOffice(res: { name: string; typeName?: string }): boolean {
  const text = `${res.name} ${res.typeName || ''}`.toLowerCase();
  return text.includes('office') || text.includes('văn phòng') || text.includes('private');
}

export function matchesSpaceCategory(
  res: { category: string; name: string; typeName?: string },
  filter?: SpaceFilterType
): boolean {
  if (!filter || filter === 'ALL') return true;
  if (filter === 'DESK') return res.category === 'DESK';
  const isOffice = isResourceOffice(res);
  if (filter === 'PRIVATE_OFFICE') return res.category === 'ROOM' && isOffice;
  if (filter === 'MEETING_ROOM') return res.category === 'ROOM' && !isOffice;
  return true;
}

export function calculateSpaceEstimatedCost(
  resourceRate: number | null | undefined,
  fallbackRate: number,
  durationHours: number
): { unitRate: number; totalCost: number } {
  const unitRate = typeof resourceRate === 'number' && resourceRate > 0 ? resourceRate : fallbackRate;
  const totalCost = Math.round(unitRate * durationHours * 100) / 100;
  return { unitRate, totalCost };
}
