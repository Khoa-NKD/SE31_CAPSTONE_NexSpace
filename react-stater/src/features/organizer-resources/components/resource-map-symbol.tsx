import { Chair, MeetingRoom, Table } from '@/components/ui/hugeicons';

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
  const Icon = category === 'TABLE' ? Table : category === 'ROOM' ? MeetingRoom : Chair;
  return (
    <Icon
      x={x + (width - size) / 2}
      y={y + (height - size) / 2 - height * 0.06}
      size={size}
      strokeWidth={1.7}
      className={className ?? 'text-primary'}
      aria-hidden='true'
      pointerEvents='none'
    />
  );
}
