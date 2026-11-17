import { useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/features/landing/context/language-context';
import { businessTypeLabel, businessTypesQueryOptions } from '../api/business-types';

const emptySubscribe = () => () => {};
/** Share the public bilingual catalog and use the existing site language preference. */
export function useBusinessTypes() {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const { language } = useLanguage();
  const query = useQuery({ ...businessTypesQueryOptions(), enabled: mounted });
  const options = query.data ?? [];
  return {
    query,
    options,
    language,
    label: (code: string | null | undefined) => businessTypeLabel(options, code, language)
  };
}
