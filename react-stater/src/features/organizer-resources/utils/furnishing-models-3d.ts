import type { FloorDecoration } from '../api/resources';
import { matchFurnishingIcon } from './furnishing-icon-catalog.ts';

/** X/Z coordinates are fractions of the saved footprint; vertical measurements are illustrative metres. */
export interface FurnishingMeshBuilder {
  box: (
    x: number,
    z: number,
    width: number,
    depth: number,
    bottom: number,
    top: number,
    color: string
  ) => void;
  cylinder: (
    x: number,
    z: number,
    radiusX: number,
    radiusZ: number,
    bottom: number,
    top: number,
    color: string
  ) => void;
  ellipsoid: (
    x: number,
    z: number,
    radiusX: number,
    radiusZ: number,
    centerY: number,
    radiusY: number,
    color: string
  ) => void;
}

const METAL = '#9ba5b3',
  DARK = '#344256',
  WHITE = '#e9edf0',
  WOOD = '#b99b76',
  GLASS = '#91b9c9';

/** Each catalog furnishing has a recognizable silhouette without external models or hidden network requests. */
export function furnishingModel3d(
  item: FloorDecoration,
  scale: number,
  mesh: FurnishingMeshBuilder
) {
  const b = mesh.box,
    c = mesh.cylinder,
    e = mesh.ellipsoid;
  const color = item.color || '#8998ad';
  const icon =
    item.icon && item.icon !== 'BOX'
      ? item.icon
      : item.kind !== 'OTHER'
        ? item.kind
        : (matchFurnishingIcon(item.label) ?? 'BOX');
  const legs = (top: number) => {
    for (const x of [0.07, 0.87])
      for (const z of [0.07, 0.87]) b(x, z, 0.06, 0.06, 0.025, top, METAL);
  };
  const handle = (x: number, z: number, y: number) =>
    b(x, z, 0.025, Math.min(0.025, 1 - z), y, y + 0.18, METAL);
  const panel = (bottom: number, top: number) => {
    b(0.04, 0.23, 0.92, 0.12, bottom, top, color);
    b(0.07, 0.355, 0.86, 0.01, bottom + 0.025, top - 0.025, GLASS);
  };
  switch (icon) {
    case 'DOOR': {
      const alongX = item.width >= item.height;
      const frame = Math.min((0.05 * scale) / (alongX ? item.width : item.height), 0.12);
      const part = (
        a: number,
        z: number,
        w: number,
        d: number,
        low: number,
        high: number,
        paint: string
      ) => b(alongX ? a : z, alongX ? z : a, alongX ? w : d, alongX ? d : w, low, high, paint);
      part(0, 0, frame, 1, 0.025, 2.12, WOOD);
      part(1 - frame, 0, frame, 1, 0.025, 2.12, WOOD);
      part(frame, 0, 1 - frame * 2, 1, 2.04, 2.12, WOOD);
      part(frame, 0.35, 1 - frame * 2, 0.3, 0.045, 2.04, '#c2a27c');
      part(frame * 1.5, 0.33, 1 - frame * 3, 0.34, 1.15, 1.85, GLASS);
      part(1 - frame * 2, 0.15, frame * 0.6, 0.7, 0.97, 1.01, METAL);
      break;
    }
    case 'TABLE':
      b(0, 0, 1, 1, 0.69, 0.76, color);
      legs(0.69);
      b(0.08, 0.08, 0.84, 0.035, 0.76, 0.765, '#d4c1a7');
      break;
    case 'PLANT':
      c(0.5, 0.5, 0.23, 0.23, 0.025, 0.35, '#b79e88');
      c(0.5, 0.5, 0.25, 0.25, 0.33, 0.4, '#ccb399');
      c(0.5, 0.5, 0.19, 0.19, 0.395, 0.405, '#665246');
      c(0.5, 0.5, 0.035, 0.035, 0.4, 1.1, '#77624e');
      e(0.34, 0.47, 0.34, 0.33, 0.88, 0.28, '#4f8b62');
      e(0.66, 0.52, 0.34, 0.33, 1.02, 0.32, '#679c70');
      e(0.48, 0.5, 0.28, 0.32, 1.27, 0.3, item.color || '#7cae79');
      break;
    case 'SOFA':
      legs(0.2);
      b(0, 0, 1, 1, 0.18, 0.44, color);
      b(0, 0, 1, 0.17, 0.44, 0.9, color);
      b(0, 0.17, 0.12, 0.83, 0.44, 0.7, color);
      b(0.88, 0.17, 0.12, 0.83, 0.44, 0.7, color);
      for (let i = 0; i < 3; i++) {
        b(0.14 + i * 0.245, 0.2, 0.225, 0.76, 0.44, 0.51, '#c1c8d2');
        b(0.14 + i * 0.245, 0.13, 0.225, 0.1, 0.53, 0.83, '#c1c8d2');
      }
      break;
    case 'SCREEN': {
      const panelHeight = Math.max(0.2, Math.min(1.4, ((item.width / scale) * 0.88 * 9) / 16));
      b(0.25, 0.1, 0.5, 0.8, 0.025, 0.075, DARK);
      b(0.46, 0.36, 0.08, 0.18, 0.07, 0.75, METAL);
      panel(0.65, 0.65 + panelHeight);
      b(0.39, 0.366, 0.22, 0.005, 0.66, 0.68, METAL);
      break;
    }
    case 'WHITEBOARD':
      b(0.07, 0.2, 0.86, 0.12, 0.6, 1.8, METAL);
      b(0.1, 0.325, 0.8, 0.01, 0.64, 1.76, WHITE);
      b(0.1, 0.335, 0.8, 0.2, 0.62, 0.65, METAL);
      for (const x of [0.16, 0.8]) {
        b(x, 0.23, 0.04, 0.05, 0.05, 0.6, METAL);
        b(x - 0.05, 0.03, 0.14, 0.94, 0.025, 0.065, METAL);
      }
      b(0.2, 0.338, 0.3, 0.005, 1.25, 1.27, '#638a9c');
      b(0.2, 0.338, 0.48, 0.005, 1.12, 1.14, '#638a9c');
      break;
    case 'LOCKER':
      b(0, 0, 1, 0.92, 0.04, 1.8, color);
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 2; col++) {
          const x = 0.025 + col * 0.49,
            y = 0.07 + row * 0.57;
          b(x, 0.92, 0.46, 0.07, y, y + 0.54, WHITE);
          handle(x + 0.35, 0.995, y + 0.17);
          for (let vent = 0; vent < 3; vent++)
            b(x + 0.09, 0.995, 0.27, 0.005, y + 0.39 + vent * 0.03, y + 0.4 + vent * 0.03, DARK);
        }
      break;
    case 'SHELF':
      b(0, 0, 0.06, 1, 0.04, 1.8, WOOD);
      b(0.94, 0, 0.06, 1, 0.04, 1.8, WOOD);
      b(0.06, 0, 0.88, 0.05, 0.04, 1.8, color);
      for (const y of [0.04, 0.55, 1.1, 1.75]) b(0.06, 0.05, 0.88, 0.95, y, y + 0.05, WOOD);
      for (let row = 0; row < 3; row++)
        for (let book = 0; book < 5; book++)
          b(
            0.12 + book * 0.15,
            0.24,
            0.1,
            0.56,
            0.1 + row * 0.55,
            0.4 + row * 0.55,
            ['#7b94ac', '#aa8b75', '#849b87'][book % 3]
          );
      break;
    case 'PRINTER':
      b(0.04, 0.08, 0.92, 0.78, 0.03, 0.47, WHITE);
      b(0.08, 0.1, 0.84, 0.66, 0.47, 0.54, DARK);
      b(0.16, 0.14, 0.68, 0.52, 0.54, 0.57, WHITE);
      b(0.15, 0.86, 0.7, 0.14, 0.16, 0.2, DARK);
      b(0.22, 0.7, 0.56, 0.3, 0.205, 0.215, '#fafafa');
      b(0.72, 0.75, 0.16, 0.08, 0.49, 0.51, GLASS);
      break;
    case 'COFFEE':
      b(0.05, 0.05, 0.9, 0.72, 0.025, 0.6, DARK);
      b(0.16, 0.77, 0.68, 0.23, 0.03, 0.08, METAL);
      b(0.19, 0.77, 0.62, 0.07, 0.38, 0.48, METAL);
      c(0.5, 0.5, 0.22, 0.22, 0.6, 0.79, '#b7a38b');
      c(0.5, 0.88, 0.12, 0.08, 0.08, 0.23, WHITE);
      b(0.67, 0.78, 0.12, 0.015, 0.5, 0.55, GLASS);
      break;
    case 'LAMP':
      c(0.5, 0.5, 0.4, 0.4, 0.025, 0.07, DARK);
      c(0.5, 0.5, 0.035, 0.035, 0.07, 1.2, METAL);
      c(0.5, 0.5, 0.5, 0.5, 1.2, 1.4, '#d7c9ae');
      c(0.5, 0.5, 0.27, 0.27, 1.4, 1.55, '#e8ddc8');
      break;
    case 'FAN':
      c(0.5, 0.6, 0.42, 0.38, 0.025, 0.07, DARK);
      c(0.5, 0.56, 0.035, 0.035, 0.07, 1.05, METAL);
      e(0.5, 0.4, 0.5, 0.18, 1.32, 0.32, METAL);
      e(0.5, 0.56, 0.45, 0.035, 1.32, 0.28, DARK);
      e(0.5, 0.6, 0.33, 0.025, 1.41, 0.09, '#bec8cf');
      e(0.34, 0.6, 0.13, 0.025, 1.21, 0.16, '#bec8cf');
      e(0.66, 0.6, 0.13, 0.025, 1.21, 0.16, '#bec8cf');
      break;
    case 'AIR_CONDITIONER':
      b(0, 0.08, 1, 0.76, 1.9, 2.3, WHITE);
      b(0.04, 0.85, 0.92, 0.1, 1.92, 2.0, DARK);
      for (let i = 0; i < 4; i++)
        b(0.08, 0.96, 0.84, 0.015, 1.93 + i * 0.018, 1.938 + i * 0.018, METAL);
      b(0.8, 0.846, 0.07, 0.01, 2.13, 2.16, '#88aeb5');
      break;
    case 'TRASH':
      c(0.5, 0.5, 0.42, 0.42, 0.03, 0.55, color);
      c(0.5, 0.5, 0.48, 0.48, 0.55, 0.6, DARK);
      c(0.5, 0.5, 0.25, 0.25, 0.601, 0.605, '#18212c');
      break;
    case 'SPEAKER':
      b(0.03, 0.04, 0.94, 0.82, 0.025, 0.85, DARK);
      e(0.5, 0.87, 0.3, 0.1, 0.3, 0.2, '#748091');
      e(0.5, 0.87, 0.16, 0.1, 0.66, 0.1, '#a6afb9');
      break;
    case 'CLOCK':
      e(0.5, 0.45, 0.5, 0.18, 1.5, 0.35, DARK);
      e(0.5, 0.61, 0.43, 0.015, 1.5, 0.3, WHITE);
      b(0.48, 0.63, 0.025, 0.01, 1.49, 1.73, DARK);
      b(0.49, 0.63, 0.25, 0.01, 1.49, 1.51, DARK);
      break;
    case 'REFRIGERATOR':
      b(0, 0, 1, 0.93, 0.04, 1.85, WHITE);
      b(0.015, 0.93, 0.97, 0.07, 0.05, 1.23, color);
      b(0.015, 0.93, 0.97, 0.07, 1.26, 1.83, color);
      handle(0.83, 0.975, 0.97);
      handle(0.83, 0.975, 1.38);
      break;
    case 'WATER_DISPENSER':
      b(0.14, 0.12, 0.72, 0.76, 0.025, 0.98, WHITE);
      c(0.5, 0.43, 0.3, 0.3, 0.98, 1.43, GLASS);
      c(0.5, 0.43, 0.22, 0.22, 1.43, 1.49, GLASS);
      b(0.27, 0.88, 0.46, 0.1, 0.58, 0.81, DARK);
      b(0.32, 0.9, 0.08, 0.1, 0.8, 0.85, '#c76f6f');
      b(0.59, 0.9, 0.08, 0.1, 0.8, 0.85, '#679ac2');
      break;
    case 'ROUTER':
      b(0.06, 0.12, 0.88, 0.8, 0.025, 0.12, WHITE);
      for (const x of [0.13, 0.47, 0.81]) b(x, 0.13, 0.035, 0.035, 0.12, 0.46, DARK);
      for (let i = 0; i < 4; i++) b(0.2 + i * 0.15, 0.925, 0.04, 0.015, 0.07, 0.085, '#6aaf8d');
      break;
    case 'TOILET':
      b(0.1, 0.04, 0.8, 0.24, 0.03, 0.82, WHITE);
      c(0.5, 0.64, 0.3, 0.32, 0.03, 0.32, WHITE);
      e(0.5, 0.62, 0.43, 0.37, 0.38, 0.15, WHITE);
      c(0.5, 0.64, 0.38, 0.32, 0.49, 0.53, WHITE);
      c(0.5, 0.64, 0.26, 0.22, 0.531, 0.535, '#98a7b6');
      b(0.73, 0.1, 0.1, 0.08, 0.82, 0.83, METAL);
      break;
    case 'SINK':
      b(0.04, 0.04, 0.92, 0.92, 0.05, 0.73, color);
      b(0, 0, 1, 1, 0.73, 0.81, WHITE);
      c(0.5, 0.56, 0.36, 0.29, 0.811, 0.815, '#899ead');
      c(0.5, 0.56, 0.26, 0.2, 0.816, 0.82, WHITE);
      b(0.47, 0.12, 0.06, 0.07, 0.81, 1.03, METAL);
      b(0.47, 0.12, 0.06, 0.27, 1.0, 1.04, METAL);
      break;
    case 'PROJECTOR':
    case 'VIDEO_CONFERENCE':
      b(0.04, 0.08, 0.92, 0.78, 0.04, 0.2, WHITE);
      e(0.68, 0.85, 0.19, 0.13, 0.13, 0.085, DARK);
      e(0.68, 0.96, 0.13, 0.035, 0.13, 0.06, GLASS);
      if (icon === 'VIDEO_CONFERENCE') b(0.13, 0.28, 0.1, 0.3, 0.2, 0.32, DARK);
      break;
    case 'STAIRS':
      for (let i = 0; i < 8; i++)
        b(0, i / 8, 1, 1 / 8, 0.025, 0.18 * (i + 1), i % 2 ? color : METAL);
      break;
    case 'ELEVATOR':
      b(0, 0, 1, 1, 0.02, 0.09, METAL);
      b(0, 0, 1, 0.12, 0.09, 2.4, DARK);
      b(0, 0.12, 0.08, 0.06, 0.09, 2.4, DARK);
      b(0.92, 0.12, 0.08, 0.06, 0.09, 2.4, DARK);
      b(0.1, 0.13, 0.39, 0.03, 0.1, 2.3, METAL);
      b(0.51, 0.13, 0.39, 0.03, 0.1, 2.3, METAL);
      b(0.1, 0.12, 0.8, 0.08, 2.3, 2.4, DARK);
      break;
    case 'FIRE_EXTINGUISHER':
      c(0.5, 0.5, 0.3, 0.3, 0.03, 0.6, '#b94c4a');
      e(0.5, 0.5, 0.3, 0.3, 0.6, 0.08, '#b94c4a');
      b(0.3, 0.37, 0.4, 0.12, 0.65, 0.71, DARK);
      b(0.19, 0.48, 0.05, 0.14, 0.3, 0.68, DARK);
      b(0.34, 0.79, 0.32, 0.02, 0.2, 0.42, WHITE);
      break;
    case 'ACCESSIBILITY':
      e(0.17, 0.5, 0.06, 0.39, 0.37, 0.35, DARK);
      e(0.83, 0.5, 0.06, 0.39, 0.37, 0.35, DARK);
      b(0.19, 0.25, 0.62, 0.65, 0.43, 0.5, color);
      b(0.19, 0.1, 0.62, 0.12, 0.48, 0.94, color);
      b(0.17, 0.73, 0.66, 0.25, 0.11, 0.16, METAL);
      break;
    case 'MICROWAVE':
      b(0, 0, 1, 0.92, 0.03, 0.38, WHITE);
      b(0.04, 0.92, 0.7, 0.06, 0.07, 0.34, DARK);
      b(0.08, 0.98, 0.61, 0.015, 0.1, 0.3, GLASS);
      handle(0.73, 0.97, 0.11);
      b(0.84, 0.92, 0.1, 0.06, 0.21, 0.28, DARK);
      break;
    case 'SHOWER':
      b(0, 0, 1, 1, 0.025, 0.09, WHITE);
      b(0.04, 0.04, 0.04, 0.05, 0.09, 2.15, METAL);
      b(0.04, 0.04, 0.04, 0.55, 2.11, 2.15, METAL);
      c(0.075, 0.59, 0.075, 0.12, 2.06, 2.11, METAL);
      break;
    case 'BED':
      legs(0.25);
      b(0, 0, 1, 1, 0.2, 0.38, WOOD);
      b(0.03, 0.04, 0.94, 0.94, 0.38, 0.61, WHITE);
      b(0, 0, 1, 0.06, 0.38, 1.0, color);
      b(0.09, 0.1, 0.36, 0.19, 0.61, 0.68, '#d3d9df');
      b(0.55, 0.1, 0.36, 0.19, 0.61, 0.68, '#d3d9df');
      b(0.03, 0.4, 0.94, 0.58, 0.61, 0.64, color);
      break;
    case 'CAMERA':
      b(0.36, 0.08, 0.28, 0.16, 1.65, 1.95, METAL);
      b(0.15, 0.25, 0.7, 0.6, 1.83, 2.06, WHITE);
      e(0.5, 0.86, 0.27, 0.12, 1.94, 0.095, DARK);
      e(0.5, 0.96, 0.18, 0.035, 1.94, 0.065, GLASS);
      break;
    case 'PHONE':
      b(0.06, 0.05, 0.88, 0.9, 0.025, 0.11, DARK);
      b(0.4, 0.14, 0.45, 0.28, 0.11, 0.12, GLASS);
      b(0.12, 0.1, 0.18, 0.7, 0.11, 0.2, color);
      for (let i = 0; i < 9; i++)
        b(0.43 + (i % 3) * 0.12, 0.5 + Math.floor(i / 3) * 0.12, 0.08, 0.075, 0.11, 0.125, METAL);
      break;
    case 'PARTITION':
      b(0, 0, 1, 1, 0.025, 1.45, color);
      b(0.03, 0.03, 0.94, 0.94, 1.45, 1.5, METAL);
      break;
    default:
      b(0, 0, 1, 1, 0.025, 0.65, color);
      b(0.46, 0, 0.08, 1, 0.65, 0.66, '#c7b89f');
      b(0, 0.46, 1, 0.08, 0.65, 0.66, '#c7b89f');
  }
}
