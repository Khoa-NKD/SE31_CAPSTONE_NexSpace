import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  documentPoliciesSchema,
  missingRequiredDocuments
} from '../../src/features/organizer-application/api/document-requirements.ts';
import type { VerificationDocument } from '../../src/features/organizer-verification-documents/api/documents.ts';
const documents = ['BUSINESS_LICENSE', 'ID_CARD_FRONT', 'ID_CARD_BACK'] as const;
const policy = {
  businessType: 'HOUSEHOLD_BUSINESS' as const,
  requiredDocuments: documents.map((documentType) => ({
    documentType,
    labelVi: documentType,
    labelEn: documentType,
    guidanceVi: 'Hướng dẫn',
    guidanceEn: 'Guidance'
  }))
};
const uploaded = documents.map(
  (documentType, index): VerificationDocument => ({
    id: index + 1,
    documentType,
    fileName: 'sample.pdf',
    status: 'PENDING',
    uploadedAt: '2026-11-05T00:00:00'
  })
);

test('requires both identity sides for the household policy and accepts pending uploads', () => {
  assert.equal(missingRequiredDocuments(policy, uploaded).length, 0);
  assert.deepEqual(
    missingRequiredDocuments(policy, uploaded.slice(0, 1)).map((item) => item.documentType),
    ['ID_CARD_FRONT', 'ID_CARD_BACK']
  );
});
test('does not count rejected, replaced or duplicate current documents as complete', () => {
  for (const status of ['REJECTED', 'REPLACED'] as const)
    assert.equal(
      missingRequiredDocuments(
        policy,
        uploaded.map((item, index) => (index === 1 ? { ...item, status } : item))
      ).length,
      1
    );
  assert.equal(missingRequiredDocuments(policy, [...uploaded, uploaded[0]]).length, 1);
});
test('rejects incomplete or duplicate business policy catalogs', () => {
  assert.equal(documentPoliciesSchema.safeParse([policy]).success, false);
  assert.equal(documentPoliciesSchema.safeParse(Array(5).fill(policy)).success, false);
});
