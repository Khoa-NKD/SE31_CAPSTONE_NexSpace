import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Focus,
  Maximize2,
  Minimize2,
  Eye,
  Hand,
  AlertTriangle
} from '@/components/ui/hugeicons';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/features/landing/context/language-context';
import type { FloorLayout, AvailabilityState } from '../api/resources';
import { buildFloorScene } from '../utils/floor-scene-3d';
import { createFloorRenderer } from '../utils/floor-webgl';

const INITIAL = { yaw: -Math.PI / 5, elevation: Math.PI / 3.5, zoom: 1, panX: 0, panY: 0 };
type Renderer = ReturnType<typeof createFloorRenderer>;

/** Camera controls never edit geometry. Customer mode may select existing resources for booking. */
export default function Floor3dPreview({
  layout,
  width,
  height,
  radius,
  availability,
  selectedResourceId,
  onResourceSelect,
  expanded,
  onFullscreen,
  stretch
}: {
  layout: FloorLayout;
  width: number;
  height: number;
  radius: number;
  availability?: Record<number, AvailabilityState>;
  selectedResourceId?: number | null;
  onResourceSelect?: (id: number) => void;
  expanded: boolean;
  onFullscreen: () => void;
  stretch: boolean;
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<Renderer | null>(null);
  const camera = useRef({ ...INITIAL });
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    pan: boolean;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const [dragMode, setDragMode] = useState<'pan' | 'orbit'>('pan');
  const [view, setView] = useState({ ...INITIAL });
  const [walls, setWalls] = useState(true);
  const [error, setError] = useState(false);
  const frame = useRef<number | null>(null);
  const draw = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const { yaw, elevation, zoom, panX, panY } = camera.current;
      renderer.current?.draw(yaw, elevation, zoom, panX, panY);
    });
  }, []);
  const update = useCallback(
    (next: Partial<typeof INITIAL>) => {
      camera.current = { ...camera.current, ...next };
      camera.current.elevation = Math.max(0.12, Math.min(Math.PI / 2, camera.current.elevation));
      camera.current.zoom = Math.max(0.35, Math.min(8, camera.current.zoom));
      setView({ ...camera.current });
      draw();
    },
    [draw]
  );
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let resize: ResizeObserver | undefined;
    let active = true;
    const lose = (event: Event) => {
      event.preventDefault();
      setError(true);
    };
    try {
      renderer.current = createFloorRenderer(element);
      resize = new ResizeObserver(draw);
      resize.observe(element);
      element.addEventListener('webglcontextlost', lose);
    } catch {
      // GPU initialization is external to React; report failure after the effect commits.
      queueMicrotask(() => {
        if (active) setError(true);
      });
    }
    return () => {
      active = false;
      resize?.disconnect();
      element.removeEventListener('webglcontextlost', lose);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, [draw]);
  useEffect(() => {
    renderer.current?.upload(
      buildFloorScene(layout, width, height, radius, walls, availability, selectedResourceId)
    );
    draw();
  }, [layout, width, height, radius, walls, availability, selectedResourceId, draw]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      update({
        zoom: camera.current.zoom * Math.exp(-Math.max(-120, Math.min(120, event.deltaY)) * 0.003)
      });
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [update]);
  function stop() {
    const id = drag.current?.pointerId;
    drag.current = null;
    if (id !== undefined && canvas.current?.hasPointerCapture(id))
      canvas.current.releasePointerCapture(id);
  }
  return (
    <div className={`flex min-h-0 flex-col ${stretch ? 'flex-1' : ''}`}>
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-card px-4 py-2.5'>
        <span className='flex items-center gap-2 text-sm font-semibold'>
          <Box className='size-4 text-primary' />
          {onResourceSelect
            ? c('3D floor · Select a place', 'Tầng 3D · Chọn chỗ')
            : c('3D floor · View only', 'Tầng 3D · Chỉ xem')}
        </span>
        <div
          className='flex flex-wrap items-center gap-1'
          role='group'
          aria-label={c('3D camera controls', 'Điều khiển góc nhìn 3D')}
        >
          <Button
            type='button'
            size='sm'
            variant={dragMode === 'pan' ? 'default' : 'ghost'}
            aria-pressed={dragMode === 'pan'}
            disabled={error}
            onClick={() => setDragMode('pan')}
          >
            <Hand className='size-4' />
            {c('Pan', 'Kéo xem')}
          </Button>
          <Button
            type='button'
            size='sm'
            variant={dragMode === 'orbit' ? 'default' : 'ghost'}
            aria-pressed={dragMode === 'orbit'}
            disabled={error}
            onClick={() => setDragMode('orbit')}
          >
            <RotateCw className='size-4' />
            {c('Orbit', 'Xoay')}
          </Button>
          <Button
            type='button'
            size='icon'
            variant='ghost'
            aria-label={c('Rotate left', 'Xoay trái')}
            disabled={error}
            onClick={() => update({ yaw: camera.current.yaw - Math.PI / 12 })}
          >
            <RotateCcw className='size-4' />
          </Button>
          <Button
            type='button'
            size='icon'
            variant='ghost'
            aria-label={c('Rotate right', 'Xoay phải')}
            disabled={error}
            onClick={() => update({ yaw: camera.current.yaw + Math.PI / 12 })}
          >
            <RotateCw className='size-4' />
          </Button>
          <Button
            type='button'
            size='icon'
            variant='ghost'
            aria-label={c('Zoom out', 'Thu nhỏ')}
            disabled={error}
            onClick={() => update({ zoom: camera.current.zoom / 1.2 })}
          >
            <ZoomOut className='size-4' />
          </Button>
          <span className='w-12 text-center text-xs tabular-nums'>
            {Math.round(view.zoom * 100)}%
          </span>
          <Button
            type='button'
            size='icon'
            variant='ghost'
            aria-label={c('Zoom in', 'Phóng to')}
            disabled={error}
            onClick={() => update({ zoom: camera.current.zoom * 1.2 })}
          >
            <ZoomIn className='size-4' />
          </Button>
          <Button
            type='button'
            size='icon'
            variant='ghost'
            aria-label={c('Reset view', 'Đặt lại góc nhìn')}
            disabled={error}
            onClick={() => update(INITIAL)}
          >
            <Focus className='size-4' />
          </Button>
          <Button
            type='button'
            size='sm'
            variant='outline'
            disabled={error}
            onClick={() => update({ yaw: 0, elevation: Math.PI / 2, zoom: 1, panX: 0, panY: 0 })}
          >
            {c('Top', 'Từ trên')}
          </Button>
          <Button
            type='button'
            size='icon'
            variant='ghost'
            aria-label={
              expanded
                ? c('Exit fullscreen', 'Thoát toàn màn hình')
                : c('Fullscreen', 'Toàn màn hình')
            }
            onClick={onFullscreen}
          >
            {expanded ? <Minimize2 className='size-4' /> : <Maximize2 className='size-4' />}
          </Button>
        </div>
      </div>
      <div
        className={`relative overflow-hidden bg-gradient-to-b from-primary/[0.04] to-muted/40 ${stretch ? 'min-h-64 flex-1' : 'h-[30rem]'}`}
      >
        {error ? (
          <div
            role='alert'
            className='absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center'
          >
            <AlertTriangle className='size-7 text-amber-500' />
            <p className='max-w-md text-sm'>
              {c(
                '3D is unavailable in this browser. Return to 2D, or enable hardware acceleration and reopen 3D. Your layout is unchanged.',
                'Trình duyệt chưa hỗ trợ 3D hoặc đã mất kết nối đồ họa. Chuyển về 2D, hoặc bật tăng tốc phần cứng rồi mở lại 3D. Sơ đồ vẫn được giữ nguyên.'
              )}
            </p>
          </div>
        ) : (
          <>
            <canvas
              ref={canvas}
              data-floor-3d='true'
              tabIndex={0}
              role='img'
              aria-label={
                onResourceSelect
                  ? c(
                      '3D floor: click a room or seat to select it. Drag to move the camera.',
                      'Sơ đồ 3D: bấm phòng hoặc ghế để chọn chỗ. Kéo để di chuyển góc nhìn.'
                    )
                  : c(
                      'Read-only 3D floor. Choose Pan or Orbit, then drag. Shift-drag or middle-drag pans. Arrow keys follow the selected mode; plus and minus zoom; Home resets.',
                      'Sơ đồ tầng 3D chỉ xem. Chọn Kéo xem hoặc Xoay rồi kéo. Giữ Shift hoặc nút chuột giữa để kéo xem. Mũi tên theo chế độ đang chọn, cộng trừ để zoom, Home đặt lại.'
                    )
              }
              className='absolute inset-0 size-full touch-none cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary active:cursor-grabbing'
              onPointerDown={(event) => {
                if ((event.button !== 0 && event.button !== 1) || drag.current) return;
                event.preventDefault();
                event.currentTarget.focus();
                drag.current = {
                  pointerId: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                  originX: event.clientX,
                  originY: event.clientY,
                  moved: false,
                  pan: dragMode === 'pan' || event.shiftKey || event.button === 1
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                const start = drag.current;
                if (!start || start.pointerId !== event.pointerId) return;
                if (Math.hypot(event.clientX - start.originX, event.clientY - start.originY) > 5)
                  start.moved = true;
                if (start.pan)
                  update({
                    panX:
                      camera.current.panX +
                      (2 * (event.clientX - start.x)) /
                        Math.max(1, event.currentTarget.clientWidth),
                    panY:
                      camera.current.panY -
                      (2 * (event.clientY - start.y)) /
                        Math.max(1, event.currentTarget.clientHeight)
                  });
                else
                  update({
                    yaw: camera.current.yaw - (event.clientX - start.x) * 0.008,
                    elevation: camera.current.elevation + (event.clientY - start.y) * 0.006
                  });
                start.x = event.clientX;
                start.y = event.clientY;
              }}
              onPointerUp={(event) => {
                const start = drag.current;
                if (start && !start.moved && event.button === 0 && onResourceSelect) {
                  const rect = event.currentTarget.getBoundingClientRect();
                  const { yaw, elevation, zoom, panX, panY } = camera.current;
                  const id = renderer.current?.pick(
                    ((event.clientX - rect.left) / rect.width) * 2 - 1,
                    1 - ((event.clientY - rect.top) / rect.height) * 2,
                    yaw,
                    elevation,
                    zoom,
                    panX,
                    panY
                  );
                  if (id != null) onResourceSelect(id);
                }
                stop();
              }}
              onPointerCancel={stop}
              onLostPointerCapture={() => {
                drag.current = null;
              }}
              onKeyDown={(event) => {
                const key = event.key;
                if (
                  [
                    'ArrowLeft',
                    'ArrowRight',
                    'ArrowUp',
                    'ArrowDown',
                    '+',
                    '=',
                    '-',
                    'Home',
                    'Delete',
                    'Backspace'
                  ].includes(key) ||
                  event.ctrlKey ||
                  event.metaKey
                ) {
                  event.stopPropagation();
                  if (!event.ctrlKey && !event.metaKey) event.preventDefault();
                }
                if (key === 'ArrowLeft')
                  update(
                    dragMode === 'pan'
                      ? { panX: camera.current.panX - 0.08 }
                      : { yaw: camera.current.yaw - 0.15 }
                  );
                if (key === 'ArrowRight')
                  update(
                    dragMode === 'pan'
                      ? { panX: camera.current.panX + 0.08 }
                      : { yaw: camera.current.yaw + 0.15 }
                  );
                if (key === 'ArrowUp')
                  update(
                    dragMode === 'pan'
                      ? { panY: camera.current.panY + 0.08 }
                      : { elevation: camera.current.elevation + 0.1 }
                  );
                if (key === 'ArrowDown')
                  update(
                    dragMode === 'pan'
                      ? { panY: camera.current.panY - 0.08 }
                      : { elevation: camera.current.elevation - 0.1 }
                  );
                if (key === '+' || key === '=') update({ zoom: camera.current.zoom * 1.15 });
                if (key === '-') update({ zoom: camera.current.zoom / 1.15 });
                if (key === 'Home') update(INITIAL);
              }}
            />
            <span className='pointer-events-none absolute left-3 top-3 rounded-lg border bg-background/90 px-3 py-2 text-[11px] text-muted-foreground shadow-sm'>
              {dragMode === 'pan'
                ? c('Drag to pan · Scroll to zoom', 'Kéo để xem qua lại · Cuộn để phóng to')
                : c(
                    'Drag to orbit · Shift-drag to pan · Scroll to zoom',
                    'Kéo để xoay · Shift + kéo để xem qua lại · Cuộn để phóng to'
                  )}
            </span>
          </>
        )}
      </div>
      <div className='flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-card px-4 py-3 text-xs'>
        <label className='flex cursor-pointer items-center gap-2'>
          <input
            type='checkbox'
            checked={walls}
            onChange={(event) => setWalls(event.target.checked)}
            disabled={error}
          />
          {c('Show floor and room walls', 'Hiện tường bao tầng và phòng')}
        </label>
        <span className='flex items-center gap-1.5 text-muted-foreground'>
          <Eye className='size-3.5' />
          {c(
            'Footprints match 2D · Heights are illustrative',
            'Mặt bằng đúng theo 2D · Chiều cao minh họa'
          )}
        </span>
      </div>
    </div>
  );
}
