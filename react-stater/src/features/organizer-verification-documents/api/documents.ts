import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { backendRequest } from '../../auth/api/session.ts';

export const DOCUMENT_LABELS = {
  BUSINESS_LICENSE: 'Business license',
  ID_CARD_FRONT: 'Identity card — front',
  ID_CARD_BACK: 'Identity card — back',
  TAX_CERTIFICATE: 'Tax certificate',
  WORKSPACE_OVERVIEW: 'Workspace overview (optional PDF)',
  OTHER: 'Ownership, operation or other evidence',
  BANK_CERTIFICATE: 'Bank certificate (read-only)'
} as const;
export type DocumentType = keyof typeof DOCUMENT_LABELS;
export type UploadDocumentType = Exclude<DocumentType, 'BANK_CERTIFICATE'>;
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const allowsDocumentPages = (type: string) =>
  ['BUSINESS_LICENSE', 'TAX_CERTIFICATE', 'OTHER'].includes(type);
export const isIdentityDocument = (type?: string) =>
  type === 'ID_CARD_FRONT' || type === 'ID_CARD_BACK';
export const documentAccept = (type?: string) =>
  type === 'WORKSPACE_OVERVIEW' ? '.pdf,application/pdf'
    : isIdentityDocument(type) ? '.jpg,.jpeg,.png,image/jpeg,image/png'
    : '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';

export interface VerificationDocument {
  id: number;
  documentType: DocumentType;
  fileName: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REPLACED';
  uploadedAt: string;
  adminFeedback?: string | null;
}

export interface VerificationDocuments {
  profileId: number;
  uploadAllowed: boolean;
  maxFileSizeBytes: number;
  supportedDocumentTypes: UploadDocumentType[];
  documents: VerificationDocument[];
}

export function documentFileError(file: File | null, maxBytes = MAX_DOCUMENT_BYTES, type?: DocumentType): string | null {
  if (!file) return 'Choose a verification document.';
  const controlCharacter = Array.from(file.name).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || (code >= 127 && code <= 159);
  });
  if (!file.name || file.name.length > 255 || /[/\\:<>"|?*]/.test(file.name) || controlCharacter)
    return 'Choose a file with a safe filename.';
  const extension = file.name.toLowerCase().split('.').pop();
  const expectedMime =
    extension === 'pdf'
      ? 'application/pdf'
      : extension === 'png'
        ? 'image/png'
        : extension === 'jpg' || extension === 'jpeg'
          ? 'image/jpeg'
          : undefined;
  if (!expectedMime || file.type !== expectedMime) return 'Choose a JPG, PNG or PDF file.';
  if (isIdentityDocument(type) && expectedMime === 'application/pdf')
    return 'Upload a JPG or PNG identity card photo';
  if (type === 'WORKSPACE_OVERVIEW' && expectedMime !== 'application/pdf')
    return 'The workspace overview must be a PDF file';
  if (!file.size || file.size > Math.min(maxBytes, MAX_DOCUMENT_BYTES))
    return 'The document must be nonempty and no larger than 5 MB.';
  return null;
}

export function verificationDocumentPayload(
  documentType: UploadDocumentType,
  file: File
): FormData {
  if (
    !Object.keys(DOCUMENT_LABELS).includes(documentType) ||
    documentType === ('BANK_CERTIFICATE' as DocumentType)
  )
    throw new Error('Unsupported verification document type.');
  const error = documentFileError(file, MAX_DOCUMENT_BYTES, documentType);
  if (error) throw new Error(error);
  const payload = new FormData();
  payload.append('documentType', documentType);
  payload.append('file', file);
  return payload;
}

export const verificationDocumentKeys = {
  detail: (actorId: number) => ['organizer-verification-documents', actorId] as const
};

export function verificationDocumentsQueryOptions(actorId: number) {
  return queryOptions({
    queryKey: verificationDocumentKeys.detail(actorId),
    queryFn: ({ signal }) =>
      backendRequest<VerificationDocuments>(
        '/organizer/verification-documents',
        'GET',
        undefined,
        true,
        signal
      ),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false
  });
}

export function verificationDocumentMutationOptions(queryClient: QueryClient, actorId: number) {
  return {
    mutationFn: ({ documentType, file }: { documentType: UploadDocumentType; file: File }) =>
      backendRequest<VerificationDocument>(
        '/organizer/verification-documents',
        'POST',
        verificationDocumentPayload(documentType, file)
      ),
    onSuccess: async (document: VerificationDocument) => {
      const queryKey = verificationDocumentKeys.detail(actorId);
      queryClient.setQueryData<VerificationDocuments>(queryKey, (current) =>
        current
          ? {
              ...current,
              documents: [document, ...current.documents.filter((item) => item.id !== document.id)]
            }
          : current
      );
      await queryClient.invalidateQueries({ queryKey, exact: true });
    }
  };
}
