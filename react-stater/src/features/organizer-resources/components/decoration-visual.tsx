import type { FloorDecoration, DecorationKind } from '../api/resources';

/** Consistent 24-unit symbols for type pickers and layout legends. */
export function DecorationIcon({
  kind,
  className = 'size-5'
}: {
  kind: DecorationKind;
  className?: string;
}) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.7'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden='true'
    >
      {kind === 'TABLE' ? (
        <>
          <rect x='2.5' y='5' width='19' height='5' rx='1.5' />
          <path d='M5 10v10M19 10v10M5 15h14' />
        </>
      ) : kind === 'PLANT' ? (
        <>
          <path d='M12 17V9M12 13C5 14 2 8 4 4c5-1 8 3 8 7M12 11c0-5 5-8 9-7 1 5-2 10-9 9' />
          <path d='M7 17h10l-1 5H8z' />
        </>
      ) : kind === 'PARTITION' ? (
        <>
          <rect x='3' y='4' width='18' height='16' rx='1.5' />
          <path d='M9 4v16M15 4v16M3 22v-2M21 22v-2' />
        </>
      ) : (
        <>
          <path d='m12 3 9 5v9l-9 5-9-5V8l9-5Z' />
          <path d='m3 8 9 5 9-5M12 13v9M8 5l9 5' />
        </>
      )}
    </svg>
  );
}

/** Top-down silhouettes retain their real footprint; labels never replace object identity. */
export function DecorationVisual({ item }: { item: FloorDecoration }) {
  const { posX: x, posY: y, width, height } = item;
  const minSize = Math.min(width, height),
    cx = x + width / 2,
    cy = y + height / 2;
  const inset = Math.min(5, minSize * 0.12),
    leg = Math.min(7, minSize * 0.1);
  const fontSize = Math.min(11, minSize * 0.17);
  const labelLimit = Math.max(3, Math.floor(width / Math.max(1, fontSize * 0.62)) - 2);
  const shortLabel =
    item.label.length > labelLimit ? `${item.label.slice(0, labelLimit - 1)}…` : item.label;
  return (
    <g style={{ color: item.color }} pointerEvents='none'>
      <title>{item.label}</title>
      {item.kind === 'TABLE' ? (
        <>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={Math.min(8, minSize * 0.12)}
            fill='currentColor'
            fillOpacity='.23'
            stroke='currentColor'
            strokeWidth='1.5'
            vectorEffect='non-scaling-stroke'
          />
          <rect
            x={x + inset}
            y={y + inset}
            width={Math.max(0.1, width - inset * 2)}
            height={Math.max(0.1, height - inset * 2)}
            rx={Math.min(5, minSize * 0.08)}
            fill='none'
            stroke='currentColor'
            strokeOpacity='.28'
            strokeWidth='.7'
            vectorEffect='non-scaling-stroke'
          />
          {[
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1]
          ].map(([sx, sy]) => (
            <rect
              key={`${sx}:${sy}`}
              x={sx < 0 ? x + inset : x + width - inset - leg}
              y={sy < 0 ? y + inset : y + height - inset - leg}
              width={leg}
              height={leg}
              rx={leg / 3}
              fill='currentColor'
              fillOpacity='.55'
            />
          ))}
        </>
      ) : item.kind === 'PLANT' ? (
        <>
          <circle cx={cx} cy={cy} r={minSize * 0.46} fill='currentColor' fillOpacity='.09' />
          <circle
            cx={cx}
            cy={cy}
            r={minSize * 0.23}
            fill='currentColor'
            fillOpacity='.22'
            stroke='currentColor'
            strokeWidth='1'
            vectorEffect='non-scaling-stroke'
          />
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <ellipse
              key={angle}
              cx={cx}
              cy={cy - minSize * 0.19}
              rx={minSize * 0.105}
              ry={minSize * 0.23}
              transform={`rotate(${angle} ${cx} ${cy})`}
              fill='currentColor'
              fillOpacity='.55'
              stroke='currentColor'
              strokeWidth='.5'
              vectorEffect='non-scaling-stroke'
            />
          ))}
          <circle cx={cx} cy={cy} r={minSize * 0.085} fill='currentColor' />
        </>
      ) : item.kind === 'PARTITION' ? (
        <>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={Math.min(3, minSize / 4)}
            fill='currentColor'
            fillOpacity='.62'
            stroke='currentColor'
            strokeWidth='1.2'
            vectorEffect='non-scaling-stroke'
          />
          {width >= height ? (
            <>
              <path
                d={`M${x + height / 2} ${cy}H${x + width - height / 2}`}
                stroke='currentColor'
                strokeOpacity='.65'
                strokeWidth='1'
                vectorEffect='non-scaling-stroke'
              />
              <path
                d={`M${x + height} ${y}v${height}M${x + width - height} ${y}v${height}`}
                stroke='currentColor'
                strokeWidth='1'
                vectorEffect='non-scaling-stroke'
              />
            </>
          ) : (
            <path
              d={`M${cx} ${y + width / 2}V${y + height - width / 2}`}
              stroke='currentColor'
              strokeWidth='1'
              vectorEffect='non-scaling-stroke'
            />
          )}
        </>
      ) : (
        <>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={Math.min(7, minSize * 0.12)}
            fill='currentColor'
            fillOpacity='.14'
            stroke='currentColor'
            strokeDasharray='4 3'
            strokeWidth='1.2'
            vectorEffect='non-scaling-stroke'
          />
          <svg
            x={cx - minSize * 0.28}
            y={cy - minSize * 0.34}
            width={minSize * 0.56}
            height={minSize * 0.56}
            viewBox='0 0 24 24'
            aria-hidden='true'
          >
            <DecorationIcon kind='OTHER' className='text-inherit' />
          </svg>
        </>
      )}
      {minSize >= 28 && (
        <text
          x={cx}
          y={y + height - Math.min(8, height / 6)}
          textAnchor='middle'
          fontSize={fontSize}
          fontWeight='500'
          fill='currentColor'
        >
          {shortLabel}
        </text>
      )}
    </g>
  );
}

export function DecorationLayer({
  items,
  blockSelection = false,
  onSelect
}: {
  items: FloorDecoration[];
  blockSelection?: boolean;
  onSelect?: (id: string) => void;
}) {
  return (
    <>
      {items.map((item) => (
        <g
          key={item.id}
          transform={`rotate(${item.rotation} ${item.posX + item.width / 2} ${item.posY + item.height / 2})`}
          pointerEvents={blockSelection || onSelect ? 'auto' : 'none'}
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : undefined}
          aria-label={onSelect ? item.label : undefined}
          className={onSelect ? 'cursor-pointer outline-none focus:opacity-60' : undefined}
          onClick={
            onSelect
              ? (event) => {
                  event.stopPropagation();
                  onSelect(item.id);
                }
              : undefined
          }
          onKeyDown={
            onSelect
              ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(item.id);
                  }
                }
              : undefined
          }
        >
          <title>{item.label}</title>
          {(blockSelection || onSelect) && (
            <rect
              x={item.posX}
              y={item.posY}
              width={item.width}
              height={item.height}
              fill='transparent'
              pointerEvents='all'
            />
          )}
          <DecorationVisual item={item} />
        </g>
      ))}
    </>
  );
}
