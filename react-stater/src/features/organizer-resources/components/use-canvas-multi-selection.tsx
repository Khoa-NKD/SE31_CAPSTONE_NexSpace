import { useEffect, useRef, useState, type RefObject } from 'react';
import { Trash2, CopyPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useLanguage } from '@/features/landing/context/language-context';
import type { FloorLayout } from '../api/resources';
import {
  expandCanvasSelection,
  selectableShapes,
  selectionBounds,
  translateCanvasSelection
} from '../utils/canvas-selection';

export type GroupEditPhase = 'start' | 'move' | 'end' | 'cancel';

export function useCanvasMultiSelection({
  svgRef,
  layout,
  enabled,
  onChange,
  onDelete,
  onCopy,
  onDuplicate,
  onPaste,
  selectionHint
}: {
  svgRef: RefObject<SVGSVGElement | null>;
  layout?: FloorLayout;
  enabled: boolean;
  onChange?: (layout: FloorLayout, phase: GroupEditPhase) => void;
  onDelete?: (keys: string[]) => void;
  onCopy?: (keys: string[]) => void;
  onDuplicate?: (keys: string[]) => void;
  onPaste?: () => void;
  canPaste?: boolean;
  selectionHint?: string[];
}) {
  const { language } = useLanguage();
  const c = (en: string, vi: string) => (language === 'vi' ? vi : en);
  const [keys, setKeys] = useState<string[]>([]);
  const [pendingDeletion, setPendingDeletion] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    if (selectionHint) setKeys(selectionHint);
  }, [selectionHint]);
  const latest = useRef({
    layout,
    enabled,
    onChange,
    onDelete,
    onCopy,
    onDuplicate,
    onPaste,
    keys
  });
  useEffect(() => {
    latest.current = {
      layout,
      enabled,
      onChange,
      onDelete,
      onCopy,
      onDuplicate,
      onPaste,
      keys
    };
  });
  useEffect(() => {
    setKeys([]);
    setMarquee(null);
    setPendingDeletion([]);
  }, [layout?.floor.id]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !enabled) return;
    let drag: {
      pointer: number;
      start: DOMPoint;
      inverse: DOMMatrix;
      base: FloorLayout;
      keys: string[];
      kind: 'box' | 'move';
      result: FloorLayout;
      initialKeys: string[];
      additive: boolean;
    } | null = null;
    let suppressClick = false;
    const down = (event: globalThis.PointerEvent) => {
      const current = latest.current;
      if (
        !current.enabled ||
        !current.layout ||
        event.button !== 0 ||
        drag ||
        !(event.target instanceof Element)
      )
        return;
      if (event.target.closest('[data-selection-ignore]')) return;
      const target = event.target.closest('[data-selection-key], [data-preview-key]');
      const targetKey =
        target?.getAttribute('data-selection-key') ?? target?.getAttribute('data-preview-key');
      suppressClick = false;
      if (targetKey && event.shiftKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressClick = true;
        setKeys(
          expandCanvasSelection(
            current.layout,
            current.keys.includes(targetKey)
              ? current.keys.filter((key) => key !== targetKey)
              : [...current.keys, targetKey]
          )
        );
        return;
      }
      if (targetKey && !current.keys.includes(targetKey)) {
        setKeys(expandCanvasSelection(current.layout, [targetKey]));
        return;
      }
      const inverse = svg.getScreenCTM()?.inverse();
      if (!inverse) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      svg.focus();
      svg.setPointerCapture(event.pointerId);
      const selected = expandCanvasSelection(current.layout, current.keys);
      drag = {
        pointer: event.pointerId,
        start: new DOMPoint(event.clientX, event.clientY).matrixTransform(inverse),
        inverse,
        base: current.layout,
        result: current.layout,
        keys: selected,
        kind: targetKey ? 'move' : 'box',
        initialKeys: current.keys,
        additive: event.shiftKey
      };
      suppressClick = true;
      if (drag.kind === 'move') {
        setKeys(selected);
        current.onChange?.(current.layout, 'start');
      } else {
        if (!event.shiftKey) setKeys([]);
        setMarquee({ x: drag.start.x, y: drag.start.y, width: 0, height: 0 });
      }
    };
    const move = (event: globalThis.PointerEvent) => {
      if (!drag || drag.pointer !== event.pointerId) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const current = latest.current;
      const cursor = new DOMPoint(event.clientX, event.clientY).matrixTransform(drag.inverse);
      if (drag.kind === 'box') {
        const box = {
          x: Math.min(cursor.x, drag.start.x),
          y: Math.min(cursor.y, drag.start.y),
          width: Math.abs(cursor.x - drag.start.x),
          height: Math.abs(cursor.y - drag.start.y)
        };
        setMarquee(box);
        const picked = selectableShapes(drag.base)
          .filter((item) => {
            const bounds = selectionBounds(item.shape);
            return (
              bounds.x >= box.x &&
              bounds.y >= box.y &&
              bounds.x + bounds.width <= box.x + box.width &&
              bounds.y + bounds.height <= box.y + box.height
            );
          })
          .map((item) => item.key);
        setKeys(
          expandCanvasSelection(drag.base, [...(drag.additive ? drag.initialKeys : []), ...picked])
        );
      } else {
        const next = translateCanvasSelection(
          drag.base,
          drag.keys,
          cursor.x - drag.start.x,
          cursor.y - drag.start.y
        );
        if (next) {
          drag.result = next;
          current.onChange?.(next, 'move');
        }
      }
    };
    const finish = (event: globalThis.PointerEvent, cancel = false) => {
      if (!drag || drag.pointer !== event.pointerId) return;
      const previous = drag;
      drag = null;
      setMarquee(null);
      event.stopImmediatePropagation();
      if (previous.kind === 'move')
        latest.current.onChange?.(
          cancel ? previous.base : previous.result,
          cancel ? 'cancel' : 'end'
        );
      else if (cancel) setKeys(previous.initialKeys);
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    };
    const up = (event: globalThis.PointerEvent) => finish(event);
    const cancel = (event: globalThis.PointerEvent) => finish(event, true);
    const click = (event: MouseEvent) => {
      if (suppressClick) {
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressClick = false;
      }
    };
    const keyboard = (event: globalThis.KeyboardEvent) => {
      const current = latest.current;
      if (
        !current.enabled ||
        !current.layout ||
        (event.target instanceof Element &&
          event.target.closest('input,textarea,select,[contenteditable="true"]'))
      )
        return;
      if (
        !current.keys.length &&
        !((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v')
      )
        return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setKeys([]);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && ['c', 'v', 'd'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const expanded = expandCanvasSelection(current.layout, current.keys);
        if (event.key.toLowerCase() === 'c') current.onCopy?.(expanded);
        if (event.key.toLowerCase() === 'd') current.onDuplicate?.(expanded);
        if (event.key.toLowerCase() === 'v') current.onPaste?.();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (current.onDelete)
          setPendingDeletion(expandCanvasSelection(current.layout, current.keys));
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const step = event.shiftKey ? 10 : 1;
        const next = translateCanvasSelection(
          current.layout,
          current.keys,
          event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
          event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
        );
        if (next) {
          current.onChange?.(current.layout, 'start');
          current.onChange?.(next, 'end');
        }
      }
    };
    svg.addEventListener('pointerdown', down, true);
    svg.addEventListener('pointermove', move, true);
    svg.addEventListener('pointerup', up, true);
    svg.addEventListener('pointercancel', cancel, true);
    svg.addEventListener('lostpointercapture', cancel, true);
    svg.addEventListener('click', click, true);
    svg.addEventListener('keydown', keyboard, true);
    return () => {
      svg.removeEventListener('pointerdown', down, true);
      svg.removeEventListener('pointermove', move, true);
      svg.removeEventListener('pointerup', up, true);
      svg.removeEventListener('pointercancel', cancel, true);
      svg.removeEventListener('lostpointercapture', cancel, true);
      svg.removeEventListener('click', click, true);
      svg.removeEventListener('keydown', keyboard, true);
    };
  }, [svgRef, enabled, layout?.floor.id]);
  const selected = layout ? selectableShapes(layout).filter((item) => keys.includes(item.key)) : [];
  const selectedBounds = selected.map((item) => selectionBounds(item.shape));
  const groupBox =
    selected.length > 1
      ? {
          x: Math.min(...selectedBounds.map((item) => item.x)),
          y: Math.min(...selectedBounds.map((item) => item.y)),
          width:
            Math.max(...selectedBounds.map((item) => item.x + item.width)) -
            Math.min(...selectedBounds.map((item) => item.x)),
          height:
            Math.max(...selectedBounds.map((item) => item.y + item.height)) -
            Math.min(...selectedBounds.map((item) => item.y))
        }
      : null;
  const overlay = (
    <g pointerEvents='none' aria-hidden='true'>
      {groupBox && (
        <rect
          {...groupBox}
          data-selection-key={selected[0].key}
          fill='none'
          pointerEvents='stroke'
          className='stroke-primary'
          strokeWidth='1.5'
          strokeDasharray='6 4'
          vectorEffect='non-scaling-stroke'
          style={{ cursor: 'move' }}
        />
      )}
      {selected.map((item) => (
        <rect
          key={item.key}
          x={item.shape.x}
          y={item.shape.y}
          width={item.shape.width}
          height={item.shape.height}
          transform={`rotate(${item.shape.rotation} ${item.shape.x + item.shape.width / 2} ${item.shape.y + item.shape.height / 2})`}
          className='fill-primary/10 stroke-primary'
          strokeWidth='2'
          vectorEffect='non-scaling-stroke'
          strokeDasharray='5 3'
        />
      ))}
      {marquee && (
        <rect
          {...marquee}
          className='fill-primary/10 stroke-primary'
          strokeWidth='1.5'
          vectorEffect='non-scaling-stroke'
          strokeDasharray='5 3'
        />
      )}
    </g>
  );
  const toolbar = (
    <div className='inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-muted-foreground'>
      {selected.length ? (
        <>
          <span className='rounded-md bg-primary/10 px-2 py-1 font-medium text-primary'>
            {c(`${selected.length} selected`, `Đã chọn ${selected.length} đối tượng`)}
          </span>
          {onDuplicate && (
            <Button
              type='button'
              size='sm'
              variant='outline'
              disabled={!enabled}
              onClick={() => onDuplicate(expandCanvasSelection(layout!, keys))}
            >
              <CopyPlus className='size-3.5' />
              {c('Duplicate', 'Nhân bản')}
            </Button>
          )}
          {onDelete && (
            <Button
              type='button'
              size='sm'
              variant='outline'
              disabled={!enabled}
              onClick={() => {
                if (layout) setPendingDeletion(expandCanvasSelection(layout, keys));
              }}
            >
              <Trash2 className='size-3.5' />
              {c('Delete selection', 'Xóa nhóm')}
            </Button>
          )}
        </>
      ) : (
        <span>
          {c(
            'Drag empty space to select a group. Hold Shift to add objects.',
            'Kéo vùng trống để chọn nhóm. Giữ Shift để chọn thêm đối tượng.'
          )}
        </span>
      )}
    </div>
  );
  const confirmation = (
    <Dialog
      open={pendingDeletion.length > 0}
      onOpenChange={(open) => {
        if (!open) setPendingDeletion([]);
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <Trash2 className='size-5 text-destructive' />
            {c('Delete selected objects?', 'Xóa đối tượng đã chọn?')}
          </DialogTitle>
          <DialogDescription>
            {c(
              `${pendingDeletion.length} selected objects will be removed from this floor plan.`,
              `${pendingDeletion.length} đối tượng đã chọn sẽ được xóa khỏi sơ đồ tầng này.`
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => setPendingDeletion([])}>
            {c('Cancel', 'Hủy')}
          </Button>
          <Button
            type='button'
            variant='destructive'
            disabled={!enabled}
            onClick={() => {
              setPendingDeletion([]);
              onDelete?.(pendingDeletion);
            }}
          >
            {c('Delete', 'Xóa')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  return { overlay, toolbar, confirmation, count: selected.length };
}
