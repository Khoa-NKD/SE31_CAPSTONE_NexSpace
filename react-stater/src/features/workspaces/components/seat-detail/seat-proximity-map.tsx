import { useMemo } from 'react';
import { Coffee, PhoneCall, Lock, DoorClosed } from '@/components/ui/hugeicons';
import type { CustomerFloor } from '../detail/public-floor-map';

interface SeatProximityMapProps {
  resource?: {
    id?: number;
    code?: string;
    name?: string;
    posX?: number;
    posY?: number;
    posXM?: number;
    posYM?: number;
    zoneName?: string;
  } | null;
  floor?: CustomerFloor | null;
}

export function SeatProximityMap({ resource, floor }: SeatProximityMapProps) {
  const ppm = floor?.pixelsPerMetre || 20;
  const rx = resource?.posX ?? 0;
  const ry = resource?.posY ?? 0;

  // Calculate actual Euclidean distances from this seat to decorations/amenities on floor
  const proximityItems = useMemo(() => {
    if (!floor?.decorations || floor.decorations.length === 0 || !resource) {
      return [];
    }

    const computed = floor.decorations.map((d) => {
      const dx = ((d.posX || 0) - rx) / ppm;
      const dy = ((d.posY || 0) - ry) / ppm;
      const distM = Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy)));
      return { ...d, distM };
    });
    computed.sort((a, b) => a.distM - b.distM);

    const seen = new Set<string>();
    const items: Array<{ icon: React.ComponentType<{ className?: string }>; title: string; subtitle: string }> = [];

    for (const d of computed) {
      const key = d.icon || d.kind || d.label;
      if (!seen.has(key)) {
        seen.add(key);
        let IconComp = DoorClosed;
        const lower = (d.label || '').toLowerCase();
        if (d.icon === 'COFFEE' || lower.includes('cà phê') || lower.includes('barista') || lower.includes('pantry')) {
          IconComp = Coffee;
        } else if (d.icon === 'PHONE' || d.icon === 'DOOR' || lower.includes('cửa') || lower.includes('phone') || lower.includes('pod')) {
          IconComp = PhoneCall;
        } else if (d.icon === 'LOCKER' || lower.includes('tủ') || lower.includes('khóa') || lower.includes('lock')) {
          IconComp = Lock;
        }

        items.push({
          icon: IconComp,
          title: `${d.distM}m tới ${d.label || 'Khu tiện ích'}`,
          subtitle: `Vị trí thực tế trên ${floor.name || 'sơ đồ tầng'}`
        });
        if (items.length >= 3) break;
      }
    }

    return items;
  }, [floor, resource, ppm, rx, ry]);

  // Real cluster of desks around the current seat from floor map
  const surroundingDesks = useMemo(() => {
    if (!floor?.resources || floor.resources.length === 0) return [];
    const desks = floor.resources.filter((r) => r.category === 'DESK' || !r.category);
    const currentIdx = desks.findIndex((r) => r.id === resource?.id);
    if (currentIdx !== -1) {
      const start = Math.max(0, Math.min(currentIdx - 1, desks.length - 4));
      return desks.slice(start, start + 4);
    }
    return desks.slice(0, 4);
  }, [floor, resource]);

  return (
    <div className='bg-card border-border shadow-xs space-y-5 rounded-xl border p-6'>
      {/* Header */}
      <div>
        <h2 className='text-foreground font-sans text-base font-bold tracking-tight sm:text-lg'>
          Vị trí &amp; Khoảng cách tiện ích xung quanh
        </h2>
        <p className='text-muted-foreground mt-0.5 text-xs'>
          {floor?.name
            ? `Bố trí thực tế tại ${floor.name} — Tính toán tự động theo toạ độ sơ đồ mặt bằng.`
            : 'Vị trí được tính toán tự động dựa trên bản đồ kiến trúc thực tế.'}
        </p>
      </div>

      {/* Proximity Distances */}
      {proximityItems.length > 0 ? (
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
          {proximityItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className='bg-muted/50 border-border/70 flex items-center gap-3 rounded-lg border p-3.5'
              >
                <Icon className='text-primary h-5 w-5 shrink-0' />
                <div>
                  <p className='text-foreground text-xs font-semibold sm:text-sm'>{item.title}</p>
                  <p className='text-muted-foreground text-[11px]'>{item.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className='rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground'>
          {floor?.name
            ? `Sơ đồ ${floor.name} chưa đánh dấu điểm tiện ích phụ trợ (pantry, tủ đồ, phone pod).`
            : 'Không có thông tin tiện ích phụ trợ trên sơ đồ.'}
        </div>
      )}

      {/* Mini Architectural Floor Plan Blueprint */}
      <div className='bg-muted/20 border-border/70 relative overflow-hidden rounded-xl border p-5'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-2 text-xs'>
          <span className='text-foreground flex items-center gap-2 font-bold tracking-wider'>
            <span className='h-2 w-2 rounded-full bg-primary' />
            {floor?.name ? floor.name.toUpperCase() : 'SƠ ĐỒ TẦNG THỰC TẾ'}
          </span>
          <span className='text-muted-foreground font-medium'>
            {resource?.zoneName || 'Khu vực làm việc'}
          </span>
        </div>

        {/* Spatial Blueprint Grid */}
        <div className='border-border/80 bg-card/60 relative flex min-h-[160px] items-center justify-center rounded-lg border border-dashed p-4'>
          {/* Desk Cluster Layout */}
          {surroundingDesks.length > 0 ? (
            <div className='grid w-full max-w-lg grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4'>
              {surroundingDesks.map((d) => {
                const isSelected = d.id === resource?.id;
                return (
                  <div
                    key={d.id}
                    className={`flex flex-col items-center justify-center rounded-lg border p-3 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-xs ring-2 ring-primary/30'
                        : 'border-border/60 bg-muted/30 opacity-70'
                    }`}
                  >
                    <span className='font-mono text-xs font-bold text-foreground'>
                      {d.code}
                    </span>
                    <span className='text-[10px] text-muted-foreground mt-0.5 truncate max-w-full'>
                      {isSelected ? 'Đang chọn' : (d.name || 'Chỗ ngồi')}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className='text-xs text-muted-foreground'>
              {resource?.code ? `Vị trí: ${resource.code}` : 'Chưa có dữ liệu vị trí trên bản đồ'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
