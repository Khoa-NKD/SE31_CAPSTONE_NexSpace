import { ApiError } from '../../../lib/api-client.ts';
import { useAuthStore } from '../../auth/store/auth-store.ts';
import { validApplicationId } from './application-details.ts';

export function documentContentEndpoint(
  applicationId: string,
  documentId: string,
  download = false,
  audience: 'admin' | 'owner' = 'admin'
) {
  if (!validApplicationId(applicationId) || !validApplicationId(documentId))
    throw new ApiError(400, 'Bad Request', { message: 'Invalid application or document ID.' });
  const path =
    audience === 'owner'
      ? `/organizer/documents/${documentId}/content`
      : `/admin/organizer-applications/${applicationId}/documents/${documentId}/content`;
  return `${path}${download ? '?download=true' : ''}`;
}

export function safeDocumentFilename(name: string, mime: string): string {
  const extension = mime === 'application/pdf' ? '.pdf' : mime === 'image/png' ? '.png' : '.jpg';
  let safe =
    name
      .replaceAll('\\', '/')
      .split('/')
      .pop()
      ?.replace(/[\p{Cc}<>:"|?*]/gu, '_')
      .trim()
      .slice(0, 180) || 'verification-document';
  if (
    !safe.toLowerCase().endsWith(extension) &&
    !(extension === '.jpg' && safe.toLowerCase().endsWith('.jpeg'))
  )
    safe += extension;
  return safe;
}

/** Binary requests reuse the existing Bearer session; content never enters the JSON/query cache. */
export async function fetchDocumentContent(
  applicationId: string,
  documentId: string,
  signal?: AbortSignal,
  download = false,
  audience: 'admin' | 'owner' = 'admin'
): Promise<Blob> {
  const endpoint = documentContentEndpoint(applicationId, documentId, download, audience);
  const session = useAuthStore.getState();
  const token = typeof window !== 'undefined' ? session.accessToken : null;
  const allowed =
    audience === 'admin'
      ? session.user?.role === 'ADMIN'
      : ['USER', 'ORGANIZER'].includes(session.user?.role ?? '');
  if (!token || !allowed)
    throw new ApiError(token ? 403 : 401, 'Unauthorized', {
      message:
        audience === 'admin'
          ? 'Administrator sign-in is required.'
          : 'Applicant sign-in is required.'
    });
  const response = await fetch(`${import.meta.env?.VITE_BACKEND_API_URL || '/api'}${endpoint}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    signal,
    cache: 'no-store',
    credentials: 'omit',
    redirect: 'error'
  });
  const sameSession = () =>
    useAuthStore.getState().accessToken === token &&
    useAuthStore.getState().user?.id === session.user?.id;
  if (!response.ok) {
    if (response.status === 401 && sameSession()) useAuthStore.getState().clearAuth();
    let payload: unknown = { message: 'Could not load the verification document.' };
    try {
      payload = await response.json();
    } catch {
      /* Binary/network errors may not carry a JSON envelope. */
    }
    throw new ApiError(response.status, response.statusText, payload);
  }
  const mime = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (!mime || !['application/pdf', 'image/png', 'image/jpeg'].includes(mime))
    throw new Error('The document format is not supported.');
  const blob = await response.blob();
  if (!sameSession())
    throw new ApiError(401, 'Unauthorized', {
      message: 'Your session changed. Please reopen the document.'
    });
  if (!blob.size || blob.size > 5 * 1024 * 1024)
    throw new Error('The document is empty or exceeds the 5 MB limit.');
  const head = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
  const valid =
    mime === 'application/pdf'
      ? new TextDecoder().decode(head).startsWith('%PDF-')
      : mime === 'image/png'
        ? [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => head[index] === value)
        : head[0] === 255 && head[1] === 216 && head[2] === 255;
  if (!valid) throw new Error('The document content does not match its file type.');
  return new Blob([blob], { type: mime });
}
