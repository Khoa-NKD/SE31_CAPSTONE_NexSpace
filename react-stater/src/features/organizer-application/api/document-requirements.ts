import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { backendRequest } from '../../auth/api/session.ts';
import { BUSINESS_TYPE_CODES } from './application.ts';
import type { VerificationDocument } from '../../organizer-verification-documents/api/documents.ts';
import {
  DOCUMENT_LABELS,
  allowsDocumentPages,
  type DocumentType
} from '../../organizer-verification-documents/api/documents.ts';
import { translateOrganizer } from '../i18n.ts';

export const requiredDocumentTypeSchema = z.enum([
  'BUSINESS_LICENSE',
  'ID_CARD_FRONT',
  'ID_CARD_BACK',
  'OTHER'
]);
export const documentPoliciesSchema = z
  .array(
    z.object({
      businessType: z.enum(BUSINESS_TYPE_CODES),
      requiredDocuments: z
        .array(
          z.object({
            documentType: requiredDocumentTypeSchema,
            labelVi: z.string().min(1),
            labelEn: z.string().min(1),
            guidanceVi: z.string().min(1),
            guidanceEn: z.string().min(1)
          })
        )
        .min(1)
    })
  )
  .length(BUSINESS_TYPE_CODES.length)
  .refine(
    (policies) =>
      new Set(policies.map((policy) => policy.businessType)).size === BUSINESS_TYPE_CODES.length,
    'Invalid document policy catalog'
  );
export type DocumentPolicy = z.infer<typeof documentPoliciesSchema>[number];
export type RequiredDocument = DocumentPolicy['requiredDocuments'][number];

/** Checklist, upload choices and uploaded files share the business policy's canonical labels. */
export function documentTypeLabel(
  type: DocumentType,
  language: 'vi' | 'en',
  policy?: DocumentPolicy
) {
  const requirement = policy?.requiredDocuments.find((item) => item.documentType === type);
  return (
    requirement?.[language === 'vi' ? 'labelVi' : 'labelEn'] ??
    translateOrganizer(DOCUMENT_LABELS[type], language)
  );
}

export function documentPoliciesQueryOptions() {
  return queryOptions({
    queryKey: ['organizer-document-requirements'],
    queryFn: async ({ signal }) =>
      documentPoliciesSchema.parse(
        await backendRequest<unknown>(
          '/public/organizer-document-requirements',
          'GET',
          undefined,
          false,
          signal
        )
      ),
    staleTime: 5 * 60 * 1000,
    retry: false
  });
}

export function missingRequiredDocuments(
  policy: DocumentPolicy,
  documents: VerificationDocument[]
) {
  return policy.requiredDocuments.filter((requirement) => {
    const matching = documents.filter(
      (document) => document.documentType === requirement.documentType
    );
    return !matching.length || (!allowsDocumentPages(requirement.documentType) && matching.length !== 1)
      || matching.some((document) => !['PENDING', 'VERIFIED'].includes(document.status));
  });
}
