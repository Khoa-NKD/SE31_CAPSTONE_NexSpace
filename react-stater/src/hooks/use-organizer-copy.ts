import { useLanguage } from '@/features/landing/context/language-context';

export type OrganizerCopy = (english: string, vietnamese: string) => string;

const englishCopy: OrganizerCopy = (english) => english;
const vietnameseCopy: OrganizerCopy = (_, vietnamese) => vietnamese;

/** Return stable copy selectors so memoized tables also react to language changes. */
export function useOrganizerCopy(): OrganizerCopy {
  const { language } = useLanguage();
  return language === 'vi' ? vietnameseCopy : englishCopy;
}
