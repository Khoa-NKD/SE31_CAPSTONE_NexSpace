export type FloorplanTool = 'select' | 'pan' | 'box_select' | 'measure';
export type ViewMode = 'edit' | 'preview';
export type AssetCategory = 'desks' | 'meeting' | 'spatial';

export type FloorplanNodeType =
  | 'HOT_DESK'
  | 'DEDICATED_DESK'
  | 'MEETING_ROOM'
  | 'BOOTH'
  | 'WALL'
  | 'DOOR';

export interface AssetTemplate {
  id: string;
  category: AssetCategory;
  name: string;
  dimensions: string;
  type: FloorplanNodeType;
  defaultWidth: number;
  defaultHeight: number;
}

export interface FloorplanNode {
  id: string;
  code: string;
  displayName: string;
  rfidCode?: string;
  type: FloorplanNodeType;
  typeLabel: string;
  zone: 'ZONE_A' | 'ZONE_B' | 'ZONE_C' | 'BOARDROOM' | 'PANTRY';
  zoneLabel: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  capacity: number;
  hourlyRate: number;
  dailyRate: number;
  customRateOverwrite: boolean;
  amenities: string[];
  isBookable: boolean;
  isMaintenanceLocked: boolean;
  status: 'AVAILABLE' | 'OCCUPIED' | 'DISABLED';
}

export interface ZoneBoundary {
  id: string;
  name: string;
  zoneKey: 'ZONE_A' | 'ZONE_B' | 'ZONE_C' | 'BOARDROOM' | 'PANTRY';
  capacityLabel: string;
  colorTheme: 'blue' | 'amber' | 'purple' | 'slate';
  x: number;
  y: number;
  width: number;
  height: number;
}

