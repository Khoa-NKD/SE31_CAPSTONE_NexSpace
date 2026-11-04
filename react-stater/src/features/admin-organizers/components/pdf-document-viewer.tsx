import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist';
import { Button } from '@/components/ui/button';

/** Canvas-only PDF rendering: no document scripts, external links or annotation actions execute. */
export function PdfDocumentViewer({ url }: { url: string }) {
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
    <div className='min-h-0 space-y-3'>
      {error && <p role='alert'>{error}</p>}
      {!error && (!pdf || rendered !== key) && <p role='status'>Rendering PDF…</p>}
      {pdf && (
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            size='sm'
            variant='outline'
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((value) => value - 1)}
          >
            Previous PDF page
          </Button>
          <label className='flex items-center gap-2 text-sm'>
            Page
            <input
              aria-label='PDF page number'
              type='number'
              min={1}
              max={pdf.numPages}
              value={pageNumber}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isInteger(value) && value >= 1 && value <= pdf.numPages)
                  setPageNumber(value);
              }}
              className='h-8 w-16 rounded border bg-background px-2'
            />{' '}
            of {pdf.numPages}
          </label>
          <Button
            size='sm'
            variant='outline'
            disabled={pageNumber >= pdf.numPages}
            onClick={() => setPageNumber((value) => value + 1)}
          >
            Next PDF page
          </Button>
          <Button
            size='sm'
            variant='outline'
            disabled={zoom <= 0.5}
            onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
          >
            Zoom out
          </Button>
          <span aria-live='polite' className='text-sm'>
            {Math.round(zoom * 100)}%
          </span>
          <Button
            size='sm'
            variant='outline'
            disabled={zoom >= 3}
            onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
          >
            Zoom in
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => setRotation((value) => (value + 90) % 360)}
          >
            Rotate
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={() => {
              setZoom(1);
              setRotation(0);
            }}
          >
            Reset view
          </Button>
        </div>
      )}
      <div ref={viewport} className='h-[55dvh] overflow-auto rounded border bg-muted p-4'>
        <canvas
          ref={canvas}
          role='img'
          aria-label={`PDF page ${pageNumber}`}
          className='mx-auto bg-white shadow-sm'
        />
      </div>
    </div>
  );
}
