import { useQuery } from '@tanstack/react-query';
import { Check, FileText, CircleDashed, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/features/landing/context/language-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  documentPoliciesQueryOptions,
  missingRequiredDocuments
} from '../api/document-requirements';
import { verificationDocumentsQueryOptions } from '@/features/organizer-verification-documents/api/documents';
import type { ApplicationInput } from '../api/application';

export function DocumentRequirementsChecklist({
  actorId,
  businessType
}: {
  actorId: number;
  businessType: ApplicationInput['businessType'];
}) {
  const { language } = useLanguage();
  const vi = language === 'vi';
  const catalog = useQuery(documentPoliciesQueryOptions());
  const documents = useQuery(verificationDocumentsQueryOptions(actorId));
  const policy = catalog.data?.find((item) => item.businessType === businessType);
  const missing = policy ? missingRequiredDocuments(policy, documents.data?.documents ?? []) : [];
  return (
    <section
      className='border-border bg-card overflow-hidden rounded-xl border'
      aria-label={vi ? 'Giấy tờ bắt buộc' : 'Required documents'}
    >
      <div className='border-border flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4'>
        <h3 className='flex items-center gap-2 text-sm font-semibold'>
          <FileText className='text-primary size-4' />
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
          <ul className='grid gap-3 sm:grid-cols-2'>
            {policy.requiredDocuments.map((requirement) => {
              const needed = missing.some((item) => item.documentType === requirement.documentType);
              return (
                <li
                  key={requirement.documentType}
                  className={`flex gap-3 rounded-lg border p-3 ${needed ? 'border-border bg-muted/20' : 'border-primary/20 bg-primary/5'}`}
                >
                  {needed ? (
                    <CircleDashed className='text-muted-foreground mt-0.5 size-5 shrink-0' />
                  ) : (
                    <Check className='text-primary mt-0.5 size-5 shrink-0' />
                  )}
                  <div className='min-w-0'>
                    <p className='text-sm font-medium'>
                      {vi ? requirement.labelVi : requirement.labelEn}
                    </p>
                    <p className='text-muted-foreground mt-1 text-xs leading-5'>
                      {vi ? requirement.guidanceVi : requirement.guidanceEn}
                    </p>
                    <p
                      className={`mt-2 text-xs font-medium ${needed ? 'text-muted-foreground' : 'text-primary'}`}
                    >
                      {needed
                        ? vi
                          ? 'Cần tải lên / thay lại'
                          : 'Upload or replacement needed'
                        : vi
                          ? 'Đã tải lên · Chờ Admin kiểm tra'
                          : 'Uploaded · Subject to admin review'}
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
