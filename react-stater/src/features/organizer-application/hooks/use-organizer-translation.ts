import { useLanguage } from '@/features/landing/context/language-context';
import { translateOrganizer } from '../i18n';

export function useOrganizerTranslation() {
  const { language } = useLanguage();
  return (message: string | null | undefined) => translateOrganizer(message, language);
}
