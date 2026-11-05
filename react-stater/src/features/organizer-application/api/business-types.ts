import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { backendRequest } from '../../auth/api/session.ts';
import { BUSINESS_TYPE_CODES } from './application.ts';

const businessTypesSchema = z
  .array(
    z.object({
      code: z.enum(BUSINESS_TYPE_CODES),
      nameVi: z.string().trim().min(1).max(100),
      nameEn: z.string().trim().min(1).max(100),
      sortOrder: z.number().int()
    })
  )
  .min(1, 'The business type catalog is empty.');
export type BusinessTypeOption = z.infer<typeof businessTypesSchema>[number];

export function businessTypeLabel(
  options: BusinessTypeOption[],
  code: string | null | undefined,
  language: 'vi' | 'en'
) {
  const option = options.find((item) => item.code === code);
  return option
    ? language === 'vi'
      ? option.nameVi
      : option.nameEn
    : code || (language === 'vi' ? 'Chưa có' : 'Not provided');
}
export function businessTypesQueryOptions() {
  return queryOptions({
    queryKey: ['business-types'],
    queryFn: async ({ signal }) => {
      const result = await backendRequest<unknown>(
        '/public/business-types',
        'GET',
        undefined,
        false,
        signal
      );
      return businessTypesSchema.parse(result);
    },
    staleTime: 5 * 60 * 1000,
    retry: false
  });
}
