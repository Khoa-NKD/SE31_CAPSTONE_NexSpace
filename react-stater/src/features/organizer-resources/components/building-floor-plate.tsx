import { useId } from 'react';
import type { FloorLayout, LayoutItem } from '../api/resources';
import { DecorationLayer } from './decoration-visual';
import { ResourceMapSymbol } from './resource-map-symbol';

const shape = (
  item: LayoutItem & { posX: number; posY: number; width: number; height: number }
) => (
  <g
    key={item.id}
    transform={`rotate(${item.rotation} ${item.posX + item.width / 2} ${item.posY + item.height / 2})`}
  >
    <rect
      x={item.posX}
      y={item.posY}
      width={item.width}
      height={item.height}
      rx={item.category === 'ROOM' ? 4 : 2}
      className={
        item.category === 'ROOM'
          ? 'fill-primary/5 stroke-primary/60'
          : 'fill-primary/15 stroke-primary'
      }
      strokeWidth={item.category === 'ROOM' ? 2 : 1}
      vectorEffect='non-scaling-stroke'
    />
    {item.category !== 'ROOM' && (
      <ResourceMapSymbol
        category='DESK'
        x={item.posX}
        y={item.posY}
        width={item.width}
        height={item.height}
      />
    )}
  </g>
);

/** Read-only floor geometry; selection and edits remain in the dedicated canvas. */
export function BuildingFloorPlate({ layout, label }: { layout: FloorLayout; label: string }) {
  const pattern = useId().replaceAll(':', '');
  const width = layout.width ?? 1200,
    height = layout.height ?? 800;
  const resources = layout.resources.filter(
    (item): item is LayoutItem & { posX: number; posY: number; width: number; height: number } =>
      item.posX !== null && item.posY !== null && !!item.width && !!item.height
  );
  return (
    <svg
      viewBox={`-15 -15 ${width + 30} ${height + 30}`}
      role='img'
      aria-label={label}
      className='h-full w-full'
    >
      <defs>
        <pattern id={pattern} width='40' height='40' patternUnits='userSpaceOnUse'>
          <path d='M40 0H0V40' fill='none' className='stroke-primary/10' strokeWidth='1' />
        </pattern>
      </defs>
      <rect
        width={width}
        height={height}
        rx='8'
        className='fill-background stroke-primary/40'
        strokeWidth='3'
        vectorEffect='non-scaling-stroke'
      />
      <rect width={width} height={height} fill={`url(#${pattern})`} />
      {resources.filter((item) => item.category === 'ROOM').map(shape)}
      <DecorationLayer items={layout.decorations ?? []} />
      {resources.filter((item) => item.category !== 'ROOM').map(shape)}
    </svg>
  );
}
