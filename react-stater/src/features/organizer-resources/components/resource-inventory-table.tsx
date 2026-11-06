import { Armchair, DoorOpen, Pencil, Trash2 } from 'lucide-react';
import { useLanguage } from '@/features/landing/context/language-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { resourceMoney } from '../api/resources';
import type { ResourceDetail, ResourceOptions, ResourcePage } from '../api/resources';
export function ResourceInventoryTable({
  data,
  options,
  workspaceStatus,
  writable,
  busy,
  onEdit,
  onDelete,
  onStatus
}: {
  data: ResourcePage;
  options?: ResourceOptions;
  workspaceStatus: string;
  writable: boolean;
  busy: boolean;
  onEdit: (resource: ResourceDetail) => void;
  onDelete: (resource: ResourceDetail) => void;
  onStatus: (resource: ResourceDetail, status: 'ACTIVE' | 'DISABLED') => void;
}) {
  const { language } = useLanguage();
  const vi = language === 'vi';
  const c = (en: string, vn: string) => (vi ? vn : en);
  const statusLabel = (status: string) =>
    ({
      DRAFT: c('Not activated', 'Chưa kích hoạt'),
      ACTIVE: c('Active', 'Đang bật'),
      DISABLED: c('Disabled', 'Đã tắt'),
      ARCHIVED: c('Archived', 'Lưu trữ')
    })[status] ?? status;
  return (
    <div className='overflow-x-auto'>
      <table className='w-full min-w-[850px] text-sm'>
        <thead className='bg-muted/40 text-muted-foreground border-border border-y text-left text-xs'>
          <tr>
            {[
              c('Resource', 'Ghế/phòng'),
              c('Floor & type', 'Tầng & loại chỗ'),
              c('Capacity', 'Sức chứa'),
              c('Base price', 'Giá cơ bản'),
              c('Status', 'Trạng thái'),
              c('Actions', 'Thao tác')
            ].map((label) => (
              <th key={label} className='px-5 py-3 font-medium'>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-border divide-y'>
          {data.listObjects.map((resource) => {
            const floor = options?.floors.find((f) => f.id === resource.floorPlanId);
            const type = options?.types.find((t) => t.id === resource.resourceTypeId);
            const archived = resource.status === 'ARCHIVED';
            const canActivate =
              workspaceStatus === 'ACTIVE' &&
              floor?.status === 'PUBLISHED' &&
              type?.active &&
              !!type.currency;
            return (
              <tr key={resource.id} className='hover:bg-muted/20 transition-colors'>
                <td className='px-5 py-4' aria-label={resource.name}>
                  <div className='flex items-start gap-3'>
                    <span className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg'>
                      {resource.category === 'DESK' ? (
                        <Armchair className='size-4' />
                      ) : (
                        <DoorOpen className='size-4' />
                      )}
                    </span>
                    <div>
                      <p className='font-medium'>{resource.name}</p>
                      <p className='text-muted-foreground mt-1 font-mono text-xs'>
                        {resource.code}
                      </p>
                      {resource.zoneName && (
                        <p className='text-muted-foreground mt-1 text-xs'>{resource.zoneName}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className='px-5 py-4'>
                  <p>{resource.floorName}</p>
                  <p className='text-muted-foreground mt-1 text-xs'>{resource.resourceTypeName}</p>
                  {resource.category === 'DESK' && (
                    <Badge variant='outline' className='mt-2 text-[11px]'>
                      {resource.parentRoomId
                        ? `${c('Inside', 'Trong phòng')}: ${resource.parentRoomName ?? resource.parentRoomId}`
                        : c('Open area', 'Khu làm việc mở')}
                    </Badge>
                  )}
                </td>
                <td className='px-5 py-4 tabular-nums'>
                  {resource.capacity} {c('people', 'người')}
                </td>
                <td className='px-5 py-4'>
                  <p className='whitespace-nowrap font-medium tabular-nums'>
                    {resourceMoney(resource.effectivePricePerHour, resource.currency, vi)}{' '}
                    <span className='text-muted-foreground text-xs'>/{c('hour', 'giờ')}</span>
                  </p>
                  {resource.pricePerDay && (
                    <p className='text-muted-foreground mt-1 whitespace-nowrap text-xs'>
                      {resourceMoney(resource.pricePerDay, resource.currency, vi)} /
                      {c('day', 'ngày')}
                    </p>
                  )}
                  {resource.pricePerHour === null && (
                    <p className='text-muted-foreground mt-1 text-[11px]'>
                      {c('Inherited from type', 'Kế thừa từ loại chỗ')}
                    </p>
                  )}
                </td>
                <td className='px-5 py-4'>
                  <div className='flex items-center gap-2'>
                    {resource.status === 'DRAFT' ? (
                      <Button
                        size='sm'
                        variant='outline'
                        aria-label={`${c('Activate', 'Kích hoạt')} ${resource.code}`}
                        disabled={busy || !writable || !canActivate}
                        onClick={() => onStatus(resource, 'ACTIVE')}
                      >
                        {c('Activate', 'Kích hoạt')}
                      </Button>
                    ) : (
                      <Switch
                        checked={resource.status === 'ACTIVE'}
                        disabled={
                          busy ||
                          !writable ||
                          archived ||
                          (resource.status !== 'ACTIVE' && !canActivate)
                        }
                        aria-label={`${c('Enable/disable', 'Bật/tắt')} ${resource.code}`}
                        onCheckedChange={(checked) =>
                          onStatus(resource, checked ? 'ACTIVE' : 'DISABLED')
                        }
                      />
                    )}
                    <Badge variant={resource.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {statusLabel(resource.status)}
                    </Badge>
                  </div>
                  {resource.status !== 'ACTIVE' && !canActivate && !archived && (
                    <p className='text-muted-foreground mt-2 max-w-52 text-[11px]'>
                      {c(
                        'Requires active workspace, published floor and confirmed type.',
                        'Cần workspace hoạt động, tầng đã publish và loại chỗ hợp lệ.'
                      )}
                    </p>
                  )}
                </td>
                <td className='px-5 py-4'>
                  <div className='flex gap-1'>
                    <Button
                      size='icon'
                      variant='ghost'
                      disabled={busy || !writable || archived}
                      aria-label={`${c('Edit', 'Sửa')} ${resource.code}`}
                      onClick={() => onEdit(resource)}
                    >
                      <Pencil className='size-4' />
                    </Button>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='text-destructive hover:text-destructive'
                      disabled={busy || !writable}
                      aria-label={`${c('Delete', 'Xóa')} ${resource.code}`}
                      onClick={() => onDelete(resource)}
                    >
                      <Trash2 className='size-4' />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
