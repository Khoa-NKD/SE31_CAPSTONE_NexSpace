import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { backendRequest } from '../../auth/api/session.ts';

const logo = z
  .string()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      ['cdn.vietqr.io', 'api.vietqr.io'].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port &&
      url.pathname.startsWith('/img/')
    );
  });
export const bankCatalogSchema = z
  .array(
    z.object({
      code: z.string().min(1).max(30),
      bin: z.string().regex(/^[0-9]{6}$/),
      name: z.string().min(1).max(250),
      shortName: z.string().min(1).max(100),
      logo: logo.nullable()
    })
  )
  .min(1)
  .max(250);
export type BankOption = z.infer<typeof bankCatalogSchema>[number];

export function bankCatalogQueryOptions() {
  return queryOptions({
    queryKey: ['public-bank-catalog'],
    queryFn: async ({ signal }) =>
      bankCatalogSchema.parse(
        await backendRequest<unknown>('/public/banks', 'GET', undefined, false, signal)
      ),
    staleTime: 24 * 60 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false
  });
}

export function bankSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
}

export function findSelectedBank(options: BankOption[], value: string) {
  const normalized = bankSearchText(value.trim());
  return options.find((bank) =>
    [bank.shortName, bank.code, bank.name].some((name) => bankSearchText(name) === normalized)
  );
}
