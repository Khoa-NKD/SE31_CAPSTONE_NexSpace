import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
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

export function DocumentActions({
  applicationId,
  document
}: {
  applicationId: string;
  document: AdminOrganizerDocument;
}) {
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
      const blob = await fetchDocumentContent(applicationId, String(document.id), signal, true);
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
          aria-label={`View document ${document.fileName}`}
        >
          View
        </Button>
        <Button
          size='sm'
          variant='outline'
          disabled={downloading}
          onClick={() => void download()}
          aria-label={`Download document ${document.fileName}`}
        >
          {downloading ? 'Downloading…' : 'Download'}
        </Button>
      </div>
      {downloadError && (
        <p role='alert' className='max-w-60 whitespace-normal text-sm text-destructive'>
          {downloadError}
        </p>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        {open && <DocumentPreview applicationId={applicationId} document={document} />}
      </Dialog>
    </div>
  );
}

function DocumentPreview({
  applicationId,
  document
}: {
  applicationId: string;
  document: AdminOrganizerDocument;
}) {
  const [attempt, setAttempt] = useState(0);
  const actorId = useAuthStore((state) => state.user?.id);
  return (
    <DocumentPreviewContent
      key={`${actorId}:${applicationId}:${document.id}:${attempt}`}
      applicationId={applicationId}
      document={document}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  );
}

function DocumentPreviewContent({
  applicationId,
  document,
  onRetry
}: {
  applicationId: string;
  document: AdminOrganizerDocument;
  onRetry: () => void;
}) {
  const [file, setFile] = useState<{ url: string; mime: string } | null>(null);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let url: string | undefined;
    void fetchDocumentContent(applicationId, String(document.id), controller.signal)
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
  }, [applicationId, document.id]);

  return (
    <DialogContent className='flex max-h-[95dvh] flex-col overflow-y-auto sm:max-w-6xl'>
      <DialogHeader className='min-w-0 pr-7'>
        <DialogTitle className='break-words [overflow-wrap:anywhere]'>
          {document.fileName}
        </DialogTitle>
        <DialogDescription>
          Private verification document. Viewing or downloading does not change its verification
          status.
        </DialogDescription>
      </DialogHeader>
      {!file && !error && <p role='status'>Loading document…</p>}
      {error && (
        <div className='space-y-3'>
          <p role='alert'>{error}</p>
          <Button onClick={onRetry}>Try again</Button>
        </div>
      )}
      {file && (
        <>
          <div className='flex flex-wrap items-center gap-2'>
            <Button variant='outline' size='sm' asChild>
              <a href={file.url} target='_blank' rel='noopener noreferrer'>
                Open in new tab
              </a>
            </Button>
            <Button variant='outline' size='sm' asChild>
              <a href={file.url} download={safeDocumentFilename(document.fileName, file.mime)}>
                Download
              </a>
            </Button>
            {file.mime !== 'application/pdf' && (
              <>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={zoom <= 0.25}
                  onClick={() => setZoom((value) => Math.max(0.25, value - 0.25))}
                >
                  Zoom out
                </Button>
                <span className='text-sm' aria-live='polite'>
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={zoom >= 3}
                  onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
                >
                  Zoom in
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setRotation((value) => (value + 90) % 360)}
                >
                  Rotate
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                  }}
                >
                  Reset view
                </Button>
              </>
            )}
          </div>
          {file.mime === 'application/pdf' ? (
            <PdfDocumentViewer url={file.url} />
          ) : (
            <div className='h-[65dvh] overflow-auto rounded border bg-muted p-4'>
              <img
                src={file.url}
                alt={`Verification document: ${document.fileName}`}
                className='mx-auto max-w-none origin-center'
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
