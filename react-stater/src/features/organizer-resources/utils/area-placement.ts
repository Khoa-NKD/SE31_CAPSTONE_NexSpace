export type AreaRect = { x: number; y: number; width: number; height: number };
export type AreaHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se';
const round = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Operates in physical floor coordinates, independent of the rendered SVG scale. */
export function placeArea(
  start: AreaRect,
  handle: AreaHandle,
  dx: number,
  dy: number,
  bounds: { width: number; height: number },
  grid = 1,
  minimumSize = 1
): AreaRect {
  const minimum = Math.min(minimumSize, bounds.width, bounds.height);
  const snap = (value: number) => round(Math.round(value / grid) * grid);
  if (handle === 'move')
    return {
      ...start,
      x: round(clamp(snap(start.x + dx), 0, Math.max(0, bounds.width - start.width))),
      y: round(clamp(snap(start.y + dy), 0, Math.max(0, bounds.height - start.height)))
    };
  const x = clamp(start.x, 0, bounds.width - minimum),
    y = clamp(start.y, 0, bounds.height - minimum);
  const right = clamp(start.x + start.width, x + minimum, bounds.width),
    bottom = clamp(start.y + start.height, y + minimum, bounds.height);
  const left = handle.includes('w') ? clamp(snap(x + dx), 0, right - minimum) : x;
  const top = handle.includes('n') ? clamp(snap(y + dy), 0, bottom - minimum) : y;
  const endX = handle.includes('e') ? clamp(snap(right + dx), left + minimum, bounds.width) : right;
  const endY = handle.includes('s') ? clamp(snap(bottom + dy), top + minimum, bounds.height) : bottom;
  return { x: round(left), y: round(top), width: round(endX - left), height: round(endY - top) };
}
