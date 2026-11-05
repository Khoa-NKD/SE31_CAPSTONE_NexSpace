import { useOrganizerTranslation } from '@/features/organizer-application/hooks/use-organizer-translation';
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  LoaderCircle
} from 'lucide-react';

/** Canvas-only PDF rendering: no document scripts, external links or annotation actions execute. */
export function PdfDocumentViewer({ url }: { url: string }) {
  const tr = useOrganizerTranslation();
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [rendered, setRendered] = useState('');
  const [renderError, setRenderError] = useState<{ key: string; message: string } | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const key = `${pageNumber}:${zoom}:${rotation}`;

  useEffect(() => {
    let disposed = false;
    let task: PDFDocumentLoadingTask | undefined;
    void import('pdfjs-dist')
      .then(async (library) => {
        if (disposed) return;
        library.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();
        task = library.getDocument({ url, useSystemFonts: true });
        const document = await task.promise;
        if (!disposed) setPdf(document);
      })
      .catch(() => {
        if (!disposed)
          setLoadError('Could not render this PDF. Download it or open it in a separate tab.');
      });
    return () => {
      disposed = true;
      void task?.destroy().catch(() => {});
    };
  }, [url]);

  useEffect(() => {
    if (!pdf || !canvas.current || !viewport.current) return;
    let cancelled = false;
    let task: RenderTask | undefined;
    const target = canvas.current;
    const availableWidth = Math.max(200, viewport.current.clientWidth - 32);
    const availableHeight = Math.max(300, viewport.current.clientHeight - 32);
    void pdf
      .getPage(pageNumber)
      .then(async (page) => {
        if (cancelled) return;
        const original = page.getViewport({ scale: 1, rotation });
        const scale =
          Math.min(availableWidth / original.width, availableHeight / original.height) * zoom;
        const pageViewport = page.getViewport({ scale, rotation });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        target.width = Math.max(1, Math.floor(pageViewport.width * pixelRatio));
        target.height = Math.max(1, Math.floor(pageViewport.height * pixelRatio));
        target.style.width = `${pageViewport.width}px`;
        target.style.height = `${pageViewport.height}px`;
        task = page.render({
          canvas: target,
          viewport: pageViewport,
          transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0]
        });
        await task.promise;
        if (!cancelled) setRendered(`${pageNumber}:${zoom}:${rotation}`);
      })
      .catch(() => {
        if (!cancelled)
          setRenderError({
            key: `${pageNumber}:${zoom}:${rotation}`,
            message: 'This PDF page could not be rendered. Try another page or download the file.'
          });
      });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, pageNumber, zoom, rotation]);

  const error = loadError || (renderError?.key === key ? renderError.message : '');
  return (
    <div className='relative min-h-0 border-t'>
      {error && (
        <p role='alert' className='m-4 rounded-lg bg-destructive/5 p-3 text-sm text-destructive'>
          {tr(error)}
        </p>
      )}
      {!error && (!pdf || rendered !== key) && (
        <p
          role='status'
          className='pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-md border bg-background/95 px-4 py-2 text-xs shadow-sm'
        >
          <LoaderCircle className='size-3.5 animate-spin text-primary' aria-hidden='true' />
          {tr('Rendering PDF…')}
        </p>
      )}
      {pdf && (
        <div className='flex flex-wrap items-center justify-between gap-3 bg-card px-5 py-3 sm:px-7 [&_button]:rounded-lg'>
          <div className='flex items-center gap-1 rounded-lg border bg-muted/20 p-1'>
            <Button
              size='sm'
              variant='outline'
              disabled={pageNumber <= 1}
              aria-label={tr('Previous PDF page')}
              title={tr('Previous PDF page')}
              onClick={() => setPageNumber((value) => value - 1)}
            >
              <ChevronLeft className='size-4' aria-hidden='true' />
            </Button>
            <label className='flex items-center gap-2 px-1 text-xs text-muted-foreground'>
              {tr('Page')}{' '}
              <input
                aria-label={tr('PDF page number')}
                type='number'
                min={1}
                max={pdf.numPages}
                value={pageNumber}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isInteger(value) && value >= 1 && value <= pdf.numPages)
                    setPageNumber(value);
                }}
                className='h-7 w-12 rounded-md border border-input bg-background px-1 text-center text-xs font-medium text-foreground tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/30'
              />{' '}
              {tr('of')} {pdf.numPages}
            </label>
            <Button
              size='sm'
              variant='outline'
              disabled={pageNumber >= pdf.numPages}
              aria-label={tr('Next PDF page')}
              title={tr('Next PDF page')}
              onClick={() => setPageNumber((value) => value + 1)}
            >
              <ChevronRight className='size-4' aria-hidden='true' />
            </Button>
          </div>
          <div className='flex items-center gap-1 rounded-lg border bg-muted/20 p-1'>
            <Button
              size='sm'
              variant='outline'
              disabled={zoom <= 0.5}
              aria-label={tr('Zoom out')}
              title={tr('Zoom out')}
              onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
            >
              <ZoomOut className='size-4' aria-hidden='true' />
            </Button>
            <span
              aria-live='polite'
              className='min-w-12 text-center text-xs font-medium tabular-nums'
            >
              {Math.round(zoom * 100)}%
            </span>
            <Button
              size='sm'
              variant='outline'
              disabled={zoom >= 3}
              aria-label={tr('Zoom in')}
              title={tr('Zoom in')}
              onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
            >
              <ZoomIn className='size-4' aria-hidden='true' />
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={() => setRotation((value) => (value + 90) % 360)}
              aria-label={tr('Rotate')}
              title={tr('Rotate')}
            >
              <RotateCw className='size-4' aria-hidden='true' />
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={() => {
                setZoom(1);
                setRotation(0);
              }}
              aria-label={tr('Reset view')}
              title={tr('Reset view')}
            >
              <RotateCcw className='size-4' aria-hidden='true' />
            </Button>
          </div>
        </div>
      )}
      <div
        ref={viewport}
        className='h-[65dvh] overflow-auto border-t bg-muted p-4'
      >
        <canvas
          ref={canvas}
          role='img'
          aria-label={`PDF page ${pageNumber}`}
          className='mx-auto rounded-sm bg-white shadow-xl'
        />
      </div>
    </div>
  );
}
