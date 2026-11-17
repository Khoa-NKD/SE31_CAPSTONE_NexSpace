import { useOrganizerTranslation } from '@/features/organizer-application/hooks/use-organizer-translation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Eye,
  Download,
  LoaderCircle,
  FileText,
  ShieldCheck,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { fetchDocumentContent, safeDocumentFilename } from '../api/document-content';
import type { AdminOrganizerDocument } from '../api/application-details';
import { PdfDocumentViewer } from './pdf-document-viewer';

type PreviewDocument = Pick<AdminOrganizerDocument, 'id' | 'fileName'>;
export type DocumentContentLoader = (
  documentId: string,
  signal?: AbortSignal,
  download?: boolean
) => Promise<Blob>;

export function DocumentActions({
  applicationId,
  document,
  fetchContent
}: {
  applicationId: string;
  document: PreviewDocument;
  fetchContent?: DocumentContentLoader;
}) {
  const tr = useOrganizerTranslation();
  const loadContent = useCallback<DocumentContentLoader>(
    (id, signal, download) =>
      fetchContent
        ? fetchContent(id, signal, download)
        : fetchDocumentContent(applicationId, id, signal, download),
    [fetchContent, applicationId]
  );
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function download() {
    controller.current?.abort();
    controller.current = new AbortController();
    const signal = controller.current.signal;
    setDownloading(true);
    setDownloadError('');
    try {
      const blob = await loadContent(String(document.id), signal, true);
      if (signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = safeDocumentFilename(document.fileName, blob.type);
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      if (!signal.aborted)
        setDownloadError(error instanceof Error ? error.message : 'Could not download document.');
    } finally {
      if (!signal.aborted) setDownloading(false);
    }
  }

  return (
    <div className='space-y-2'>
      <div className='flex flex-wrap gap-2'>
        <Button
          size='sm'
          variant='outline'
          onClick={() => setOpen(true)}
          className='rounded-md text-xs'
          aria-label={`View document ${document.fileName}`}
        >
          <Eye className='size-3.5' aria-hidden='true' />
          {tr('View')}
        </Button>
        <Button
          size='sm'
          variant='outline'
          disabled={downloading}
          className='rounded-md text-xs'
          onClick={() => void download()}
          aria-label={`Download document ${document.fileName}`}
        >
          {downloading ? (
            <LoaderCircle className='size-3.5 animate-spin' aria-hidden='true' />
          ) : (
            <Download className='size-3.5' aria-hidden='true' />
          )}
          {downloading ? tr('Downloading…') : tr('Download')}
        </Button>
      </div>
      {downloadError && (
        <p role='alert' className='max-w-60 whitespace-normal text-sm text-destructive'>
          {tr(downloadError)}
        </p>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <DocumentPreview
            applicationId={applicationId}
            document={document}
            fetchContent={loadContent}
          />
        )}
      </Dialog>
    </div>
  );
}

function DocumentPreview({
  applicationId,
  document,
  fetchContent
}: {
  applicationId: string;
  document: PreviewDocument;
  fetchContent: DocumentContentLoader;
}) {
  const [attempt, setAttempt] = useState(0);
  const actorId = useAuthStore((state) => state.user?.id);
  return (
    <DocumentPreviewContent
      key={`${actorId}:${applicationId}:${document.id}:${attempt}`}
      document={document}
      fetchContent={fetchContent}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  );
}

function DocumentPreviewContent({
  document,
  fetchContent,
  onRetry
}: {
  document: PreviewDocument;
  fetchContent: DocumentContentLoader;
  onRetry: () => void;
}) {
  const tr = useOrganizerTranslation();
  const [file, setFile] = useState<{ url: string; mime: string } | null>(null);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    void fetchContent(String(document.id), controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        url = URL.createObjectURL(blob);
        setFile({ url, mime: blob.type });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Could not load document.');
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [fetchContent, document.id]);

  return (
    <DialogContent className='flex max-h-[94dvh] w-[calc(100%_-_1.5rem)] flex-col gap-0 overflow-y-auto rounded-lg border border-border bg-card p-0 font-sans text-card-foreground shadow-lg sm:max-w-6xl [&>button]:right-5 [&>button]:top-5 [&>button]:rounded-md [&>button]:bg-muted [&>button]:p-1'>
      <DialogHeader className='min-w-0 border-b px-5 py-5 pr-14 text-left sm:px-7 sm:pr-16'>
        <div className='mb-2 flex items-center gap-2 text-xs font-medium text-primary'>
          <FileText className='size-4' aria-hidden='true' />
          {tr('Document preview')}
        </div>
        <DialogTitle className='break-words text-base font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-xl'>
          {document.fileName}
        </DialogTitle>
        <DialogDescription className='mt-2 flex items-start gap-2 text-xs leading-5'>
          <ShieldCheck className='mt-0.5 size-3.5 shrink-0 text-primary' aria-hidden='true' />
          {tr(
            'Private verification document. Viewing or downloading does not change its verification status.'
          )}{' '}
        </DialogDescription>
      </DialogHeader>
      {!file && !error && (
        <p
          role='status'
          className='flex min-h-60 items-center justify-center gap-2 text-sm text-muted-foreground'
        >
          <LoaderCircle className='size-5 animate-spin text-primary' aria-hidden='true' />
          {tr('Loading document…')}
        </p>
      )}
      {error && (
        <div className='m-5 space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm'>
          <p role='alert'>{tr(error)}</p>
          <Button onClick={onRetry}>{tr('Try again')}</Button>
        </div>
      )}
      {file && (
        <>
          <div className='flex flex-wrap items-center justify-between gap-3 bg-muted/20 px-5 py-3 sm:px-7'>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                variant='outline'
                size='sm'
                className='rounded-md bg-background text-xs'
                asChild
              >
                <a href={file.url} target='_blank' rel='noopener noreferrer'>
                  <ExternalLink className='size-3.5' aria-hidden='true' />
                  {tr('Open in new tab')}{' '}
                </a>
              </Button>
              <Button
                size='sm'
                className='rounded-md bg-primary text-xs text-primary-foreground hover:bg-primary/90'
                asChild
              >
                <a href={file.url} download={safeDocumentFilename(document.fileName, file.mime)}>
                  <Download className='size-3.5' aria-hidden='true' />
                  {tr('Download')}{' '}
                </a>
              </Button>
            </div>
            {file.mime !== 'application/pdf' && (
              <div className='flex items-center gap-1 rounded-lg border bg-background p-1 [&_button]:rounded-lg'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={zoom <= 0.25}
                  aria-label={tr('Zoom out')}
                  title={tr('Zoom out')}
                  onClick={() => setZoom((value) => Math.max(0.25, value - 0.25))}
                >
                  <ZoomOut className='size-4' aria-hidden='true' />
                </Button>
                <span className='min-w-12 text-center text-xs tabular-nums' aria-live='polite'>
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={zoom >= 3}
                  aria-label={tr('Zoom in')}
                  title={tr('Zoom in')}
                  onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
                >
                  <ZoomIn className='size-4' aria-hidden='true' />
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setRotation((value) => (value + 90) % 360)}
                  aria-label={tr('Rotate')}
                  title={tr('Rotate')}
                >
                  <RotateCw className='size-4' aria-hidden='true' />
                </Button>
                <Button
                  variant='outline'
                  size='sm'
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
            )}
          </div>
          {file.mime === 'application/pdf' ? (
            <PdfDocumentViewer url={file.url} />
          ) : (
            <div className='h-[65dvh] overflow-auto border-t bg-muted p-5 sm:p-8'>
              <img
                src={file.url}
                alt={`Verification document: ${document.fileName}`}
                className='mx-auto max-w-none origin-center rounded-sm shadow-xl'
                style={{ width: `${zoom * 100}%`, transform: `rotate(${rotation}deg)` }}
                onError={() =>
                  setError(
                    'The image could not be displayed. You can download the file to inspect it.'
                  )
                }
              />
            </div>
          )}
        </>
      )}
    </DialogContent>
  );
}
