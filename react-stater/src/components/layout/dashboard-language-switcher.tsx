import { Check, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/features/landing/context/language-context';

export function DashboardLanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='gap-2 border-border bg-background text-foreground'
          aria-label={language === 'vi' ? 'Chọn ngôn ngữ' : 'Choose language'}
        >
          <Languages className='size-4' />
          <span>{language === 'vi' ? 'VI' : 'EN'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-44'>
        <DropdownMenuItem onSelect={() => setLanguage('vi')} className='justify-between'>
          <span lang='vi'>Tiếng Việt</span>
          {language === 'vi' && <Check className='size-4 text-primary' />}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setLanguage('en')} className='justify-between'>
          <span lang='en'>English</span>
          {language === 'en' && <Check className='size-4 text-primary' />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
