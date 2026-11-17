import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserAvatarProfileProps {
  className?: string;
  showInfo?: boolean;
  user: {
    imageUrl?: string;
    fullName?: string | null;
    emailAddresses: Array<{ emailAddress: string }>;
  } | null;
}

export function UserAvatarProfile({ className, showInfo = false, user }: UserAvatarProfileProps) {
  return (
    <div className='flex items-center gap-2'>
      <Avatar className={className}>
        <AvatarImage src={user?.imageUrl || ''} alt={user?.fullName || ''} />
        <AvatarFallback className='rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 font-semibold select-none'>
          {(user?.fullName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0] || 'U').toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {showInfo && (
        <div className='grid flex-1 text-left text-sm leading-tight'>
          <span className='truncate font-semibold'>{user?.fullName || ''}</span>
          <span className='truncate text-xs'>{user?.emailAddresses[0].emailAddress || ''}</span>
        </div>
      )}
    </div>
  );
}
