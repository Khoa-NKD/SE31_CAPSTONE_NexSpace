/** Shared map symbols keep resource identity consistent in editing and floor publication previews. */
export function ResourceMapSymbol({
  category,
  x,
  y,
  width,
  height,
  className
}: {
  category: string;
  x: number;
  y: number;
  width: number;
  height: number;
  className?: string;
}) {
  const size = Math.max(1, Math.min(width * 0.8, height * 0.68));
  return (
    <svg
      x={x + (width - size) / 2}
      y={y + (height - size) / 2 - height * 0.06}
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.7'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className ?? 'text-primary'}
      aria-hidden='true'
      pointerEvents='none'
    >
      {category === 'TABLE' ? (
        <>
          <rect x='2' y='5' width='20' height='5' rx='1.5' fill='currentColor' fillOpacity='.12' />
          <path d='M5 10v10M19 10v10M5 15h14' />
        </>
      ) : (
        <>
          <path d='M5 11V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5' />
          <path
            d='M5 10a2 2 0 0 0-3 1.7V16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4.3A2 2 0 0 0 19 10l-1 4H6l-1-4Z'
            fill='currentColor'
            fillOpacity='.12'
          />
          <path d='M5 18v3M19 18v3' />
        </>
      )}
    </svg>
  );
}
