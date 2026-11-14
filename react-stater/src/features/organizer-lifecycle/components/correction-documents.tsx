import { useLanguage } from '@/features/landing/context/language-context';
import type { ApplicationInput } from '@/features/organizer-application/api/application';
import {
  documentPoliciesQueryOptions,
  documentTypeLabel
} from '@/features/organizer-application/api/document-requirements';
import { useOrganizerTranslation } from '@/features/organizer-application/hooks/use-organizer-translation';
import { useApplicationNotice } from '@/features/organizer-application/hooks/use-application-notice';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  FileText,
  UploadCloud,
  ShieldCheck,
  Check,
  LoaderCircle,
  FileCheck2,
  ArrowUpFromLine,
  ArrowLeftRight,
  ChevronDown,
  Trash2,
  X
} from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { OwnerDocumentActions } from '@/features/organizer-verification-documents/components/owner-document-actions';
import {
  DOCUMENT_LABELS,
  allowsDocumentPages,
  documentAccept,
  documentFileError,
  isIdentityDocument,
  verificationDocumentsQueryOptions,
  verificationDocumentKeys,
  type VerificationDocuments,
  type VerificationDocument,
  type UploadDocumentType
} from '@/features/organizer-verification-documents/api/documents';
import { addDocumentPages, checkIdentityPhoto, correctDocument, deleteDraftDocument, ownerLifecycleQueryOptions, type LifecycleContext } from '../api/lifecycle';

const identitySides = ['ID_CARD_FRONT', 'ID_CARD_BACK'] as const;
const wrongIdentitySide = 'The photo shows the other side of the identity card';

function SelectedPhoto({ file }: { file: File }) {
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const url = URL.createObjectURL(file);
    image.setAttribute('src', url);
    return () => {
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [file]);
  return <img ref={imageRef} alt={file.name} className='h-24 w-full rounded-lg bg-background object-contain' />;
}

export function CorrectionDocuments({
  focusRequest,
  businessType,
  actorId,
  context,
  disabled,
  onUpdated,
  onBusyChange
}: {
  focusRequest?: { documentId: number; requestId: number } | null;
  businessType?: ApplicationInput['businessType'];
  actorId: number;
  context: LifecycleContext;
  disabled: boolean;
  onUpdated: (value: LifecycleContext) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const tr = useOrganizerTranslation();
  const { language } = useLanguage();
  const query = useQuery(verificationDocumentsQueryOptions(actorId));
  const client = useQueryClient();
  const policies = useQuery(documentPoliciesQueryOptions());
  const policy = policies.data?.find((item) => item.businessType === businessType);
  const [selectedType, setType] = useState<UploadDocumentType>('BUSINESS_LICENSE');
  const [files, setFiles] = useState<File[]>([]);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VerificationDocument | null>(null);
  const correcting = context.status === 'REVISION_REQUESTED';
  const [dragging, setDragging] = useState(false);
  const allowedTypes = Object.keys(DOCUMENT_LABELS).filter(
    (value): value is UploadDocumentType =>
      value !== 'BANK_CERTIFICATE' &&
      (context.status === 'DRAFT' ||
        (context.status === 'REVISION_REQUESTED' &&
          !!query.data?.documents.some(
            (document) => document.documentType === value && document.status === 'REJECTED'
          )))
  );
  const lastJump = useRef(-1);
  useEffect(() => {
    if (!focusRequest || lastJump.current === focusRequest.requestId) return;
    const target = query.data?.documents.find(
      (document) => document.id === focusRequest.documentId && document.status === 'REJECTED'
    );
    if (!target) return;
    const frame = requestAnimationFrame(() => {
      lastJump.current = focusRequest.requestId;
      setType(target.documentType as UploadDocumentType);
      setTargetId(target.id);
      setFiles([]);
      setConfirmed(false);
      const element = document.getElementById('organizer-document-' + target.id);
      const group = element?.closest('details');
      if (group) group.open = true;
      element?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'center'
      });
      element?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusRequest, query.data]);
  const type = allowedTypes.includes(selectedType) ? selectedType : (allowedTypes[0] ?? '');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  useApplicationNotice(feedback, error, disabled);
  const input = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const matching = (query.data?.documents ?? []).filter((document) => document.documentType === type);
  const current = matching.find((document) => document.id === targetId)
    ?? (!allowsDocumentPages(type) ? matching[0] : undefined);
  const addingPages = allowsDocumentPages(type) && !current;
  const remaining = matching.filter((document) => document.id !== current?.id);
  const vi = language === 'vi';
  const groupIdentityOptions = identitySides.every((side) => allowedTypes.includes(side));
  const canPickPair = isIdentityDocument(type) && groupIdentityOptions;
  const autoSortIdentity = canPickPair && targetId === null;
  const checkingIdentityGroup = autoSortIdentity && files.length > 0 && files.length <= 2;
  const hasPdf = [...remaining.map((item) => item.fileName), ...files.map((file) => file.name)]
    .some((name) => name?.toLowerCase().endsWith('.pdf'));
  const fileError =
    files.map((file) => documentFileError(file, query.data?.maxFileSizeBytes, type || undefined)).find(Boolean) ??
    (autoSortIdentity && files.length > 2
      ? (vi ? 'Chọn tối đa hai ảnh CCCD mỗi lượt.' : 'Select at most two identity photos.')
      : files.length > 1 && !addingPages && !checkingIdentityGroup
      ? (vi ? 'Chỉ chọn một tệp cho thao tác này.' : 'Choose one file for this action.')
      : files.length && remaining.length + files.length > 10
        ? (vi ? 'Tối đa 10 tệp cho mỗi loại giấy tờ.' : 'Maximum 10 files per document type.')
        : files.length && allowsDocumentPages(type) && remaining.length + files.length > 1 && hasPdf
          ? (vi ? 'Chọn nhiều ảnh hoặc một tệp PDF cho mỗi loại.' : 'Choose multiple images or one PDF per type.')
          : files.reduce((sum, file) => sum + file.size, 0) >= 20 * 1024 * 1024
            ? (vi ? 'Tổng dung lượng mỗi lượt tải phải dưới 20 MB.' : 'Each upload must total less than 20 MB.')
            : null);
  const identityFile = !autoSortIdentity && isIdentityDocument(type) && !fileError && files.length === 1 ? files[0] : null;
  const [identityResult, setIdentityResult] = useState<{
    file: File; type: UploadDocumentType; applicationId: number; error: string | null;
  } | null>(null);
  useEffect(() => {
    if (!identityFile || !type) return;
    const controller = new AbortController();
    void checkIdentityPhoto(context.id, type, identityFile, controller.signal).then(
      () => {
        if (!controller.signal.aborted)
          setIdentityResult({ file: identityFile, type, applicationId: context.id, error: null });
      },
      (failure: unknown) => {
        if (!controller.signal.aborted)
          setIdentityResult({ file: identityFile, type, applicationId: context.id,
            error: failure instanceof Error ? failure.message : 'Identity photo checking is temporarily unavailable. Try again.' });
      }
    );
    return () => controller.abort();
  }, [context.id, identityFile, type]);
  const identityCheck = identityResult?.file === identityFile && identityResult.type === type &&
    identityResult.applicationId === context.id ? identityResult : null;
  const [pair, setPair] = useState<{ files: File[]; applicationId: number; items: {
    side: (typeof identitySides)[number] | null; error: string | null;
  }[] } | null>(null);
  useEffect(() => {
    if (!checkingIdentityGroup || fileError) return;
    const controller = new AbortController();
    const items = files.map(async (file) => {
      try {
        await checkIdentityPhoto(context.id, 'ID_CARD_FRONT', file, controller.signal);
        return { side: 'ID_CARD_FRONT' as const, error: null };
      } catch (failure) {
        const error = failure instanceof Error ? failure.message : 'Identity photo checking is temporarily unavailable. Try again.';
        return error === wrongIdentitySide
          ? { side: 'ID_CARD_BACK' as const, error: null }
          : { side: null, error };
      }
    });
    void Promise.all(items).then((results) => {
      if (!controller.signal.aborted) setPair({ files, applicationId: context.id, items: results });
    });
    return () => controller.abort();
  }, [checkingIdentityGroup, context.id, fileError, files]);
  const pairItems = pair?.files === files && pair.applicationId === context.id ? pair.items : null;
  const pairReady = !!pairItems && pairItems.every((item) => item.side !== null) &&
    new Set(pairItems.map((item) => item.side)).size === files.length;
  const replacements = autoSortIdentity
    ? (query.data?.documents ?? []).filter((doc) => pairItems?.some((item) => item.side === doc.documentType))
    : current ? [current] : [];
  const identityBlocked = checkingIdentityGroup ? !pairReady : !!identityFile && (!identityCheck || !!identityCheck.error);
  const oppositeSide = type === 'ID_CARD_FRONT' ? 'ID_CARD_BACK' : 'ID_CARD_FRONT';
  const wrongSide = identityCheck?.error === wrongIdentitySide;
  const canSwitchSide = wrongSide && allowedTypes.includes(oppositeSide);

  function switchIdentitySide() {
    setType(oppositeSide);
    setTargetId(null);
    setIdentityResult(null);
    setConfirmed(false);
    setError('');
    setFeedback('');
  }

  const label = (value: UploadDocumentType | keyof typeof DOCUMENT_LABELS) =>
    documentTypeLabel(value, language, policy);
  const requirement = policy?.requiredDocuments.find((item) => item.documentType === type);
  function selectType(value: string, documentId: number | null = null) {
    setType(value as UploadDocumentType);
    setTargetId(documentId);
    setFiles([]);
    setConfirmed(false);
    setError('');
    setFeedback('');
  }
  function selectFiles(value: FileList | File[] | null) {
    setIdentityResult(null);
    setFiles(Array.from(value ?? []));
    setConfirmed(false);
    setError('');
    setFeedback('');
  }
  async function syncDocuments(value: LifecycleContext, deletedId?: number) {
    const key = verificationDocumentKeys.detail(actorId);
    const lifecycleKey = ownerLifecycleQueryOptions(actorId).queryKey;
    await Promise.all([
      client.cancelQueries({ queryKey: key, exact: true }),
      client.cancelQueries({ queryKey: lifecycleKey, exact: true })
    ]);
    client.setQueryData(lifecycleKey, value);
    onUpdated(value);
    if (deletedId !== undefined) {
      client.setQueryData<VerificationDocuments>(key, (previous) => previous?.profileId === value.id
        ? { ...previous, documents: previous.documents.filter((document) => document.id !== deletedId) }
        : previous);
      void client.invalidateQueries({ queryKey: key, exact: true });
      return;
    }
    await client.invalidateQueries({ queryKey: key, exact: true });
  }

  const mutation = useMutation({
    mutationFn: async (deleteId?: number) => {
      if (deleteId !== undefined) return deleteDraftDocument(context.revision, deleteId);
      if (!type) throw new Error('No requested documents remain to be replaced.');
      if (fileError || !files.length) throw new Error(fileError || 'Choose a file.');
      if (identityBlocked) throw new Error('Identity photo checking is temporarily unavailable. Try again.');
      if (replacements.length && !confirmed) throw new Error('Confirm replacement of the current document.');
      if (checkingIdentityGroup && pairItems) {
        let latest = context;
        const saved = new Set<File>();
        try {
          for (const [index, item] of pairItems.entries()) {
            if (!item.side) continue;
            const existing = query.data?.documents.find((doc) => doc.documentType === item.side);
            latest = await correctDocument(latest.revision, item.side, existing?.id ?? null, files[index]);
            saved.add(files[index]);
          }
          return latest;
        } catch (failure) {
          if (saved.size) {
            const pendingIndex = files.findIndex((file) => !saved.has(file));
            const pendingSide = pairItems[pendingIndex].side;
            if (pendingSide) setType(pendingSide);
            setTargetId(null);
            setFiles(files.filter((file) => !saved.has(file)));
            setConfirmed(false);
            await syncDocuments(latest);
            throw new Error(
              vi ? 'Đã lưu một mặt CCCD. Vui lòng thử tải lại mặt còn lại.' : 'One side was saved. Retry the remaining side.',
              { cause: failure }
            );
          }
          throw failure;
        }
      }
      if (addingPages) return addDocumentPages(context.id, context.revision, type, files);
      if (files.length !== 1) throw new Error('Choose one file.');
      return correctDocument(context.revision, type, current?.id ?? null, files[0]);
    },
    onSuccess: async (value: LifecycleContext, deleteId) => {
      await syncDocuments(value, deleteId);
      if (deleteId === undefined || current?.id === deleteId) {
        setFiles([]);
        setTargetId(null);
        setConfirmed(false);
      }
      setFeedback(
        deleteId !== undefined ? (language === 'vi' ? 'Đã xóa tệp khỏi bản nháp.' : 'File removed from the draft.') : correcting
          ? 'Document saved. Previous versions are retained. Submit the corrected application when ready.'
          : 'Document uploaded. Your draft has not been submitted.'
      );
    }
  });
  async function upload(deleteId?: number) {
    if (submitting.current) return;
    submitting.current = true;
    onBusyChange(true);
    setError('');
    setFeedback('');
    try {
      await mutation.mutateAsync(deleteId);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Upload failed.');
    } finally {
      submitting.current = false;
      onBusyChange(false);
    }
  }
  if (query.isPending) return <p role='status'>{tr('Loading current documents…')}</p>;
  if (query.isError)
    return (
      <div>
        <p role='alert'>{tr(query.error.message)}</p>
        <Button onClick={() => void query.refetch()}>{tr('Reload documents')}</Button>
      </div>
    );
  return (
    <section
      aria-busy={mutation.isPending}
      className='overflow-hidden rounded-2xl border border-indigo-500/15 bg-card shadow-sm'
      aria-label={tr(
        correcting ? 'Correct verification documents' : 'Upload verification document'
      )}
    >
      <div className='flex flex-wrap items-center justify-between gap-3 border-b bg-muted/20 px-5 py-4 sm:px-6'>
        <h3 className='flex items-center gap-2 text-sm font-semibold'>
          <FileText className='size-4 text-indigo-600 dark:text-indigo-300' aria-hidden='true' />
          {tr('Your documents')}
          <span className='rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground'>
            {query.data.documents.length}
          </span>
        </h3>
        <span className='inline-flex items-center gap-1.5 text-xs text-muted-foreground'>
          <ShieldCheck className='size-3.5 text-emerald-600' aria-hidden='true' />
          {tr('Documents stay private')}
        </span>
      </div>
      <div className='grid min-w-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'>
        <ul className='min-w-0 space-y-3 bg-muted/10 p-4 sm:p-6'>
          <li className='flex items-center gap-2 pb-1 text-xs font-medium text-muted-foreground'>
            <FileCheck2 className='size-4' />
            {language === 'vi' ? 'Giấy tờ đã tải lên' : 'Uploaded documents'}
          </li>
          {!query.data.documents.length && (
            <li className='flex min-h-44 flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-muted/20 px-5 text-center text-sm text-muted-foreground'>
              <FileText
                className='size-8 text-indigo-500/60 dark:text-indigo-300'
                aria-hidden='true'
              />
              <p>{tr('No current documents have been uploaded.')}</p>
            </li>
          )}
          {Array.from(new Set(query.data.documents.map((document) =>
            isIdentityDocument(document.documentType) ? 'ID_CARD_FRONT' : document.documentType
          ))).map((groupType) => {
            const identityGroup = groupType === 'ID_CARD_FRONT';
            const group = query.data.documents.filter((document) =>
              identityGroup ? isIdentityDocument(document.documentType) : document.documentType === groupType
            );
            const needsReplacement = correcting && group.some((document) => document.status === 'REJECTED');
            return <li key={groupType}>
              <details className='group overflow-hidden rounded-xl border bg-background open:shadow-sm'>
                <summary className='flex min-h-14 cursor-pointer list-none items-center gap-2.5 px-3 py-2.5 text-sm font-semibold hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden'>
                  <span className='grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'>
                    <FileText className='size-4' aria-hidden='true' />
                  </span>
                  <span className='min-w-0 flex-1'>{identityGroup ? (vi ? 'Căn cước công dân (CCCD)' : 'Identity card') : label(groupType)}</span>
                  {needsReplacement && <Badge variant='destructive'>{vi ? 'Cần thay' : 'Replace'}</Badge>}
                  <Badge variant='secondary' className='shrink-0'>
                    {identityGroup ? (vi ? `${group.length}/2 mặt` : `${group.length}/2 sides`) : (vi ? `${group.length} tệp` : `${group.length} files`)}
                  </Badge>
                  <ChevronDown className='size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180' aria-hidden='true' />
                </summary>
                <ul className='space-y-2 border-t p-2.5'>{group.map((document) => (
            <li
              key={document.id}
              id={'organizer-document-' + document.id}
              tabIndex={-1}
              className={`scroll-mt-24 min-w-0 space-y-3 rounded-xl border p-4 focus-visible:ring-2 focus-visible:ring-ring ${type === document.documentType ? 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/[0.08] to-violet-500/[0.04]' : 'bg-background'}`}
            >
              <div className='flex items-start gap-3'>
                <span className='flex size-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/15 to-violet-500/10 text-indigo-600 dark:text-indigo-300'>
                  <FileText className='size-5' aria-hidden='true' />
                </span>
                <div className='min-w-0 flex-1'>
                  {identityGroup && <p className='text-xs text-muted-foreground'>{label(document.documentType)}</p>}
                  <p className='break-all text-sm font-medium leading-5'>
                    {document.fileName}
                  </p>
                </div>
              </div>
              <Badge
                variant={document.status === 'REJECTED' ? 'destructive' : 'secondary'}
                className='rounded-md text-[11px]'
              >
                {tr(
                  context.status === 'REVISION_REQUESTED' && document.status === 'REJECTED'
                    ? 'Replacement required'
                    : document.status
                )}
              </Badge>
              {document.adminFeedback?.trim() && (
                <p className='whitespace-pre-wrap break-words rounded-lg bg-amber-500/5 p-3 text-xs leading-5 text-muted-foreground'>
                  {tr('Last document feedback:')} {document.adminFeedback}
                </p>
              )}
              <OwnerDocumentActions profileId={query.data.profileId} document={document} />
              {allowedTypes.includes(document.documentType as UploadDocumentType)
                && (!correcting || document.status === 'REJECTED') && (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  disabled={disabled || mutation.isPending}
                  className='h-8 px-2 text-xs text-primary'
                  onClick={() => {
                    selectType(document.documentType, document.id);
                    input.current?.focus();
                  }}
                >
                  <UploadCloud className='size-3.5' />
                  {language === 'vi' ? 'Chọn để thay file' : 'Choose to replace file'}
                </Button>
              )}
              {context.status === 'DRAFT' && (
                <Button type='button' variant='ghost' size='sm' className='text-destructive'
                  disabled={disabled || mutation.isPending}
                  onClick={() => setDeleteTarget(document)}>
                  <Trash2 className='size-3.5' aria-hidden='true' />
                  {mutation.isPending && mutation.variables === document.id
                    ? (vi ? 'Đang xóa…' : 'Removing…')
                    : (vi ? 'Xóa tệp' : 'Remove file')}
                </Button>
              )}
            </li>
          ))}</ul>
              </details>
          </li>;
          })}
        </ul>
        {allowedTypes.length ? (
          <fieldset
            disabled={
              disabled || mutation.isPending || !(context.status === 'DRAFT' || context.canCorrect)
            }
            className='min-w-0 space-y-5 border-t bg-gradient-to-br from-indigo-500/[0.035] via-background to-violet-500/[0.045] p-5 disabled:opacity-60 sm:p-6 lg:border-t-0 lg:border-l'
          >
            <legend className='sr-only'>{tr('Upload verification document')}</legend>
            <div className='flex items-start gap-3'>
              <span className='flex size-10 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/15 to-violet-500/15 text-indigo-600 dark:text-indigo-300'>
                <UploadCloud className='size-5' />
              </span>
              <div>
                <h3 className='text-base font-semibold'>
                  {tr(correcting ? 'Upload requested documents' : 'Upload verification document')}
                </h3>
                <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                  {tr(
                    correcting
                      ? 'Only replace the documents requested by the administrator.'
                      : 'Choose a document type, then select your file.'
                  )}
                </p>
              </div>
            </div>
            <div className='space-y-2'>
              <label
                htmlFor='organizer-upload-document-type'
                className='text-xs font-semibold text-muted-foreground'
              >
                {tr('Document type')}
              </label>
              <Select
                value={canPickPair ? 'ID_CARD_FRONT' : type}
                disabled={
                  disabled ||
                  mutation.isPending ||
                  !(context.status === 'DRAFT' || context.canCorrect)
                }
                onValueChange={(value) => selectType(value)}
              >
                <SelectTrigger
                  id='organizer-upload-document-type'
                  className='h-auto min-h-12 w-full rounded-xl bg-background px-3.5 py-3 text-left shadow-none [&_[data-slot=select-value]]:whitespace-normal'
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position='popper'
                  className='max-h-72 w-[var(--radix-select-trigger-width)] rounded-xl'
                >
                  {allowedTypes.filter((value) => !groupIdentityOptions || value !== 'ID_CARD_BACK').map((value) => (
                    <SelectItem
                      key={value}
                      value={value}
                      className='py-3 [&_[data-slot=select-item-text]]:whitespace-normal'
                    >
                      {groupIdentityOptions && value === 'ID_CARD_FRONT'
                        ? (vi ? 'Căn cước công dân (CCCD)' : 'Identity card')
                        : label(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canPickPair && !autoSortIdentity && (
                <div className='flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background/70 px-3 py-2'>
                  <span className='text-xs font-medium'>{label(type)}</span>
                  <Button type='button' variant='ghost' size='sm' onClick={() => selectType('ID_CARD_FRONT')}>
                    {vi ? 'Về chế độ tự nhận diện' : 'Use automatic detection'}
                  </Button>
                </div>
              )}
              {current && allowsDocumentPages(type) && (
                <Button type='button' variant='outline' size='sm' onClick={() => selectType(type)}>
                  {language === 'vi' ? 'Thêm trang thay vì thay tệp' : 'Add pages instead'}
                </Button>
              )}
              <div className='flex items-start gap-2 pt-1 text-xs leading-5 text-muted-foreground'>
                <Badge variant='secondary' className='mt-0.5 shrink-0 text-[10px]'>
                  {language === 'vi'
                    ? requirement
                      ? 'Bắt buộc'
                      : 'Tùy chọn'
                    : requirement
                      ? 'Required'
                      : 'Optional'}
                </Badge>
                <p>
                  {autoSortIdentity ? (vi
                    ? 'Chọn một hoặc hai ảnh. Hệ thống tự nhận diện mặt trước và mặt sau.'
                    : 'Choose one or two photos. The system detects each side automatically.'
                  ) : requirement?.[language === 'vi' ? 'guidanceVi' : 'guidanceEn'] ||
                    (language === 'vi'
                      ? 'Chỉ tải lên nếu phù hợp với hồ sơ của bạn.'
                      : 'Upload only if relevant to your application.')}
                </p>
              </div>
            </div>
            <div
              onDragOver={(event) => {
                event.preventDefault();
                if (!disabled && !mutation.isPending) setDragging(true);
              }}
              onDragLeave={(event) => {
                if (
                  !(
                    event.relatedTarget instanceof Node &&
                    event.currentTarget.contains(event.relatedTarget)
                  )
                )
                  setDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (
                  disabled ||
                  mutation.isPending ||
                  !(context.status === 'DRAFT' || context.canCorrect)
                )
                  return;
                selectFiles(event.dataTransfer.files);
              }}
              className={`relative flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-4 text-center transition-colors hover:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/30 sm:p-5 ${fileError ? 'border-destructive/40 bg-destructive/5' : dragging ? 'border-indigo-500 bg-indigo-500/10' : files.length && !isIdentityDocument(type) ? 'border-emerald-500/35 bg-emerald-500/5' : 'border-indigo-500/20 bg-indigo-500/5'}`}
            >
              {files.length ? (
                <div className='w-full space-y-3'>
                  <div className={`grid gap-2 ${files.length > 1 ? 'grid-cols-2 sm:grid-cols-3' : 'mx-auto max-w-52'}`}>
                    {files.slice(0, 10).map((file, index) => (
                      <div key={index} className='relative min-w-0 space-y-1.5 rounded-xl border bg-background/80 p-2'>
                        <button
                          type='button'
                          className='absolute top-2 right-2 z-10 grid size-8 place-items-center rounded-full border bg-background text-foreground shadow-sm transition-colors hover:border-destructive/40 hover:text-destructive focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50'
                          aria-label={vi ? `Bỏ tệp ${file.name}` : `Remove ${file.name}`}
                          title={vi ? 'Bỏ tệp này' : 'Remove this file'}
                          disabled={disabled || mutation.isPending}
                          onClick={() => selectFiles(files.filter((_, fileIndex) => fileIndex !== index))}
                        >
                          <X className='size-4' aria-hidden='true' />
                        </button>
                        {/^image\/(jpeg|png)$/.test(file.type) && !documentFileError(file, query.data.maxFileSizeBytes, type || undefined)
                          ? <SelectedPhoto key={file.name + file.size + file.lastModified} file={file} />
                          : <div className='grid h-24 place-items-center rounded-lg bg-muted text-indigo-500'>
                              <FileText className='size-6' aria-hidden='true' />
                            </div>}
                        <p className='truncate text-xs font-medium' title={file.name}>{file.name}</p>
                        {pairItems?.[index]?.side && (
                          <p className='text-xs font-medium text-primary'>{label(pairItems[index].side)}</p>
                        )}
                        <p className='text-[11px] text-muted-foreground'>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ))}
                  </div>
                  <span className='block text-xs font-medium text-indigo-600 dark:text-indigo-300'>
                    {vi ? 'Bấm hoặc kéo tệp vào để chọn lại' : 'Click or drop files to choose again'}
                  </span>
                </div>
              ) : (
                <>
                  <span className='grid size-12 place-items-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'>
                    <ArrowUpFromLine className='size-5' aria-hidden='true' />
                  </span>
                  <span className='text-sm font-medium'>
                    {autoSortIdentity
                      ? (vi ? 'Chọn hoặc kéo thả ảnh CCCD' : 'Choose or drop identity card photos')
                      : addingPages
                        ? (vi ? 'Chọn hoặc kéo thả nhiều tệp' : 'Choose or drop multiple files')
                        : tr('Drop a file here or click to browse')}
                  </span>
                  <span className='text-xs text-muted-foreground'>
                    {type === 'WORKSPACE_OVERVIEW' ? 'PDF · 5 MB'
                      : isIdentityDocument(type) ? 'JPG / PNG · 5 MB' : tr('JPG, PNG or PDF · Up to 5 MB')}
                  </span>
                </>
              )}
              <input
                ref={input}
                type='file'
                accept={documentAccept(type)}
                multiple={addingPages || autoSortIdentity}
                aria-label={tr('New file')}
                onChange={(event) => {
                  selectFiles(event.target.files);
                  event.target.value = '';
                }}
                className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
              />
            </div>
            {!!files.length && (
              <Button type='button' variant='ghost' size='sm' onClick={() => selectFiles(null)}>
                <X className='size-3.5' aria-hidden='true' /> {vi ? 'Bỏ tệp đã chọn' : 'Clear selection'}
              </Button>
            )}
            {checkingIdentityGroup && !fileError && (
              <div className='space-y-2 rounded-xl border bg-background/75 p-3 text-sm'>
                <p role='status' className={pairItems && !pairReady ? 'text-destructive' : 'text-muted-foreground'}>
                  {!pairItems
                    ? (vi ? 'Đang kiểm tra ảnh CCCD…' : 'Checking identity photos…')
                    : pairReady
                      ? files.length === 2
                        ? (vi ? 'Đã nhận diện đủ mặt trước và mặt sau.' : 'Front and back recognized.')
                        : (vi ? 'Đã nhận diện đúng mặt CCCD. Bạn có thể tải ảnh này lên.' : 'Identity card side recognized. You can upload this photo.')
                      : pairItems.some((item) => item.error)
                        ? (vi ? 'Một hoặc nhiều ảnh chưa nhận diện được.' : 'One or more photos could not be recognized.')
                        : (vi ? 'Hai ảnh cùng một mặt. Hãy chọn thêm ảnh mặt còn lại.' : 'Both photos show the same side. Choose the other side.')}
                </p>
                {pairItems && !pairReady && pairItems.map((item, index) => item.side ? (
                  <Button key={index} type='button' size='sm' variant='outline' onClick={() => {
                    if (!item.side) return;
                    setType(item.side);
                    setTargetId(null);
                    setFiles([files[index]]);
                    setConfirmed(false);
                  }}>
                    {vi ? 'Giữ ảnh' : 'Keep photo'} {index + 1}
                  </Button>
                ) : <p key={index} className='text-xs text-destructive'>{files[index].name} · {tr(item.error)}</p>)}
              </div>
            )}
            {identityFile && (
              <div className={wrongSide ? 'space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3' : undefined}>
              <p role={identityCheck?.error ? 'alert' : 'status'}
                className={`flex items-center gap-2 text-sm ${identityCheck?.error ? 'text-destructive' : identityCheck ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                {!identityCheck && <LoaderCircle className='size-4 animate-spin' aria-hidden='true' />}
                {wrongSide
                  ? (oppositeSide === 'ID_CARD_BACK'
                      ? (vi ? 'Bạn đã chọn nhầm ảnh mặt sau CCCD.' : 'You selected the back of the identity card.')
                      : (vi ? 'Bạn đã chọn nhầm ảnh mặt trước CCCD.' : 'You selected the front of the identity card.'))
                  : identityCheck?.error
                  ? tr(identityCheck.error)
                  : identityCheck
                    ? (vi ? 'Đã nhận diện đúng mặt căn cước.' : 'Identity card side recognized.')
                    : (vi ? 'Đang kiểm tra ảnh căn cước…' : 'Checking identity card photo…')}
              </p>
              {canSwitchSide && (
                <Button type='button' variant='outline' size='sm' onClick={switchIdentitySide}>
                  <ArrowLeftRight className='size-3.5' aria-hidden='true' />
                  {oppositeSide === 'ID_CARD_BACK'
                    ? (vi ? 'Chuyển sang mặt sau' : 'Switch to back')
                    : (vi ? 'Chuyển sang mặt trước' : 'Switch to front')}
                </Button>
              )}
              </div>
            )}
            {!!replacements.length && (
              <label
                aria-label={tr('Confirm document replacement')}
                className='flex cursor-pointer items-start gap-3 rounded-md border border-primary/15 bg-primary/5 p-3 text-xs leading-5'
              >
                <input
                  type='checkbox'
                  className='mt-0.5 size-4 shrink-0 accent-primary'
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span className='min-w-0'>
                  <span className='block font-medium'>{tr('Confirm document replacement')}</span>
                  <span className='break-all text-muted-foreground'>
                    {replacements.map((document) => document.fileName).join(', ')}
                  </span>
                  <span className='mt-1 block text-muted-foreground'>
                    {tr('The previous version will be retained.')}
                  </span>
                </span>
              </label>
            )}
            <Button
              type='button'
              className='h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/15 hover:from-indigo-700 hover:to-violet-700 disabled:shadow-none'
              disabled={
                disabled ||
                mutation.isPending ||
                !files.length ||
                !!fileError ||
                identityBlocked ||
                (!!replacements.length && !confirmed)
              }
              onClick={() => void upload()}
            >
              {mutation.isPending && mutation.variables === undefined ? (
                <LoaderCircle className='size-4 animate-spin' aria-hidden='true' />
              ) : (
                <UploadCloud className='size-4' aria-hidden='true' />
              )}
              {mutation.isPending && mutation.variables === undefined
                ? tr('Uploading…')
                : checkingIdentityGroup && files.length === 2
                  ? (vi ? 'Tải lên cả hai mặt CCCD' : 'Upload both identity card sides')
                : addingPages && matching.length > 0
                  ? (language === 'vi' ? 'Bổ sung trang' : 'Add pages')
                  : correcting
                  ? tr('Upload requested replacement')
                  : current
                    ? tr('Replace current document')
                    : tr('Upload document')}
            </Button>
            <p className='text-center text-xs leading-5 text-muted-foreground'>
              {tr('Uploading does not submit your application.')}
            </p>
          </fieldset>
        ) : (
          <div className='flex flex-col items-center justify-center gap-3 border-t bg-muted/20 p-6 text-center lg:border-t-0 lg:border-l'>
            <Check className='size-8 text-primary' aria-hidden='true' />
            <p className='text-sm font-semibold'>
              {tr('All requested documents have been replaced.')}
            </p>
            <p className='text-xs leading-5 text-muted-foreground'>
              {tr('Review your updates, then resubmit the application below.')}
            </p>
          </div>
        )}
      </div>
      {fileError && (
        <p
          role='alert'
          className='mx-5 mb-5 rounded-md bg-destructive/5 p-3 text-sm text-destructive'
        >
          {tr(fileError)}
        </p>
      )}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className='rounded-2xl'>
          <AlertDialogHeader>
            <AlertDialogTitle>{vi ? 'Xóa tệp khỏi bản nháp?' : 'Remove file from draft?'}</AlertDialogTitle>
            <AlertDialogDescription className='break-all'>{deleteTarget?.fileName}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{vi ? 'Giữ tệp' : 'Keep file'}</AlertDialogCancel>
            <AlertDialogAction variant='destructive' disabled={disabled} onClick={() => {
              if (deleteTarget) void upload(deleteTarget.id);
            }}>
              {vi ? 'Xóa tệp' : 'Remove file'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
