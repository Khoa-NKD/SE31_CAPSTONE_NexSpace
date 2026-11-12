import { useQuery } from '@tanstack/react-query';
import { Check, FileText, CircleDashed, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/features/landing/context/language-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  documentPoliciesQueryOptions,
  documentTypeLabel,
  missingRequiredDocuments
} from '../api/document-requirements';
import { verificationDocumentsQueryOptions } from '@/features/organizer-verification-documents/api/documents';
import type { ApplicationInput } from '../api/application';

export function DocumentRequirementsChecklist({
  actorId,
  businessType,
  revisionRequested = false
}: {
  actorId: number;
  businessType: ApplicationInput['businessType'];
  revisionRequested?: boolean;
}) {
  const { language } = useLanguage();
  const vi = language === 'vi';
  const catalog = useQuery(documentPoliciesQueryOptions());
  const documents = useQuery(verificationDocumentsQueryOptions(actorId));
  const policy = catalog.data?.find((item) => item.businessType === businessType);
  const missing = policy ? missingRequiredDocuments(policy, documents.data?.documents ?? []) : [];
  return (
    <section
      className='bg-card overflow-hidden rounded-2xl border border-indigo-500/15 shadow-sm'
      aria-label={vi ? 'Giấy tờ bắt buộc' : 'Required documents'}
    >
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-indigo-500/10 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-transparent px-5 py-4'>
        <h3 className='flex items-center gap-2 text-sm font-semibold'>
          <FileText className='size-4 text-indigo-600 dark:text-indigo-300' />
          {vi ? 'Giấy tờ bắt buộc theo loại hình' : 'Required documents for your business type'}
        </h3>
        {policy && documents.isSuccess ? (
          <Badge variant={missing.length ? 'secondary' : 'outline'}>
            {policy.requiredDocuments.length - missing.length}/{policy.requiredDocuments.length}{' '}
            {vi ? 'đã tải lên' : 'uploaded'}
          </Badge>
        ) : null}
      </div>
      <div className='space-y-4 p-5'>
        {catalog.isPending || documents.isPending ? (
          <p role='status' className='text-muted-foreground text-sm'>
            {vi ? 'Đang tải checklist giấy tờ…' : 'Loading document checklist…'}
          </p>
        ) : catalog.isError || documents.isError || !policy ? (
          <div role='alert' className='space-y-2'>
            <p className='text-destructive text-sm'>
              {vi
                ? 'Chưa tải được yêu cầu giấy tờ. Vui lòng thử lại trước khi gửi.'
                : 'Could not load document requirements. Reload before submitting.'}
            </p>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => {
                void catalog.refetch();
                void documents.refetch();
              }}
            >
              <RefreshCw className='size-3.5' />
              {vi ? 'Thử lại' : 'Try again'}
            </Button>
          </div>
        ) : (
          <ul
            className={`grid gap-3 ${policy.requiredDocuments.length > 1 ? 'lg:grid-cols-2' : ''}`}
          >
            {policy.requiredDocuments.map((requirement) => {
              const needed = missing.some((item) => item.documentType === requirement.documentType);
              const uploaded = documents.data?.documents.find(
                (item) => item.documentType === requirement.documentType
              );
              return (
                <li
                  key={requirement.documentType}
                  className={`flex gap-3.5 rounded-xl border p-4 ${needed ? 'border-indigo-500/10 bg-gradient-to-br from-indigo-500/[0.035] via-background to-violet-500/[0.025]' : 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5'}`}
                >
                  {needed ? (
                    <span className='flex size-9 shrink-0 items-center justify-center rounded-xl border border-indigo-500/15 bg-gradient-to-br from-indigo-500/15 to-violet-500/10 text-indigo-600 dark:text-indigo-300'>
                      <CircleDashed className='size-4' />
                    </span>
                  ) : (
                    <span className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'>
                      <Check className='size-4' />
                    </span>
                  )}
                  <div className='min-w-0'>
                    <p className='text-sm font-semibold leading-6'>
                      {documentTypeLabel(requirement.documentType, language, policy)}
                    </p>
                    <p className='text-muted-foreground mt-1 text-xs leading-5'>
                      {vi ? requirement.guidanceVi : requirement.guidanceEn}
                    </p>
                    <p
                      className={`mt-2 text-xs font-medium ${needed ? 'text-indigo-600 dark:text-indigo-300' : 'text-emerald-700 dark:text-emerald-300'}`}
                    >
                      {needed
                        ? vi
                          ? revisionRequested
                            ? 'Cần thay theo yêu cầu'
                            : 'Chưa có file hợp lệ'
                          : revisionRequested
                            ? 'Requested replacement needed'
                            : 'Upload needed'
                        : vi
                          ? uploaded?.status === 'VERIFIED'
                            ? 'Đã xác minh'
                            : 'Đã tải lên'
                          : uploaded?.status === 'VERIFIED'
                            ? 'Verified'
                            : 'Uploaded'}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className='text-muted-foreground text-xs leading-5'>
          {vi
            ? 'Có thể lưu nháp khi chưa đủ giấy tờ. Chỉ gửi khi đã đủ tất cả mục bắt buộc. Giấy chứng nhận thuế và ngân hàng không bắt buộc; CCCD phải là hai mặt của cùng chủ. Đổi loại hình sẽ cập nhật checklist và giữ nguyên file đang có.'
            : 'Drafts may be incomplete. Submission requires every listed document. Tax and bank certificates are not required; identity-card sides must belong to the same owner. Changing business type updates the checklist and preserves existing files.'}
        </p>
      </div>
    </section>
  );
}
