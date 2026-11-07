import { useId, useState } from 'react';
import { Building2, Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { useLanguage } from '@/features/landing/context/language-context';
import type { WorkspaceOption } from '../api/resources';

const searchText = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();

export function WorkspaceSelector({
  workspaces,
  value,
  onChange
}: {
  workspaces: WorkspaceOption[];
  value: number;
  onChange: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const { language } = useLanguage();
  const vi = language === 'vi';
  const selected = workspaces.find((workspace) => workspace.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          aria-controls={listId}
          aria-label={vi ? 'Chọn không gian làm việc' : 'Choose workspace'}
          className='h-11 w-full justify-between gap-3 rounded-lg px-3 font-normal'
        >
          <Building2 className='size-4 shrink-0 text-muted-foreground' />
          <span className='min-w-0 flex-1 truncate text-left'>
            {selected
              ? `${selected.name || `#${selected.id}`} · ${selected.status}`
              : vi
                ? 'Chọn không gian làm việc'
                : 'Choose workspace'}
          </span>
          <ChevronsUpDown className='size-4 shrink-0 text-muted-foreground' />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl p-0'
      >
        <Command
          filter={(value, search) => (searchText(value).includes(searchText(search)) ? 1 : 0)}
        >
          <CommandInput
            placeholder={vi ? 'Tìm theo tên hoặc mã workspace…' : 'Search workspace name or ID…'}
          />
          <CommandList id={listId} className='max-h-64 overscroll-contain'>
            <CommandEmpty>
              {vi ? 'Không tìm thấy workspace phù hợp.' : 'No matching workspace found.'}
            </CommandEmpty>
            <CommandGroup>
              {workspaces.map((workspace) => (
                <CommandItem
                  key={workspace.id}
                  value={`${workspace.id} ${workspace.name ?? ''} ${workspace.status}`}
                  onSelect={() => {
                    onChange(workspace.id);
                    setOpen(false);
                  }}
                  className='cursor-pointer gap-3 rounded-lg px-3 py-3'
                >
                  <Building2 className='size-4 shrink-0 text-muted-foreground' />
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate font-medium'>
                      {workspace.name || `#${workspace.id}`}
                    </span>
                    <span className='text-xs text-muted-foreground'>
                      #{workspace.id} · {workspace.status}
                    </span>
                  </span>
                  {workspace.id === value && <Check className='size-4 shrink-0 text-primary' />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
