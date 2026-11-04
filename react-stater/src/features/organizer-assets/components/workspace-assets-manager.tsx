import React, { useState, useMemo } from 'react';
import {
  useWorkspaceAssetsQuery
} from '@/features/workspaces/api/queries';
import {
  useDeleteWorkspaceAssetMutation
} from '@/features/workspaces/api/mutations';
import { AssetStatusBadge } from './asset-status-badge';
import { AssetDialog } from './asset-dialog';
import { MaintenanceDialog } from './maintenance-dialog';
import { MaintenanceHistoryDialog } from './maintenance-history-dialog';
import type { AssetStatus, WorkspaceAssetDto } from '@/features/workspaces/api/types';
import {
  calculateAssetMetrics,
  filterAssets,
  paginateAssets
} from '../utils/assets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Wrench,
  History,
  Pencil,
  Trash2,
  Box,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FilterX
} from 'lucide-react';

interface WorkspaceAssetsManagerProps {
  workspaceId: number | string;
}

export function WorkspaceAssetsManager({ workspaceId }: WorkspaceAssetsManagerProps) {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Dialogs state
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<WorkspaceAssetDto | null>(null);

  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [assetForMaintenance, setAssetForMaintenance] = useState<WorkspaceAssetDto | null>(null);

  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [assetForHistory, setAssetForHistory] = useState<WorkspaceAssetDto | null>(null);

  const [assetToDelete, setAssetToDelete] = useState<WorkspaceAssetDto | null>(null);

  // TanStack Query: Fetch all assets once (all: true)
  const { data, isLoading, isError, refetch, isFetching } = useWorkspaceAssetsQuery(workspaceId, {
    all: true
  });

  const deleteMutation = useDeleteWorkspaceAssetMutation();

  // Extract all assets array from payload
  const allAssets = useMemo<WorkspaceAssetDto[]>(() => {
    return data?.listObjects || data?.content || [];
  }, [data]);

  // Overall metric counters (computed across all assets so counts stay stable across filter tabs)
  const metrics = useMemo(() => calculateAssetMetrics(allAssets), [allAssets]);

  // Instant client-side filtering (by status and search string)
  const filteredAssets = useMemo(() => {
    return filterAssets(allAssets, selectedStatus, search);
  }, [allAssets, selectedStatus, search]);

  // Instant client-side pagination
  const {
    paginatedList: currentAssets,
    totalPages,
    currentPage,
    totalRecords,
    startIndex,
    endIndex
  } = useMemo(() => {
    return paginateAssets(filteredAssets, page, pageSize);
  }, [filteredAssets, page, pageSize]);

  // Filter tabs definition with dynamic counters
  const filterTabs: { key: AssetStatus | 'ALL'; label: string; count: number }[] = [
    { key: 'ALL', label: 'Tất cả', count: metrics.total },
    { key: 'IN_USE', label: 'Đang dùng', count: metrics.inUse },
    { key: 'UNDER_MAINTENANCE', label: 'Bảo trì', count: metrics.underMaintenance },
    { key: 'BROKEN', label: 'Báo hỏng', count: metrics.broken },
    { key: 'RETIRED', label: 'Ngừng dùng', count: metrics.retired }
  ];

  const handleOpenAdd = () => {
    setAssetToEdit(null);
    setIsAssetDialogOpen(true);
  };

  const handleOpenEdit = (asset: WorkspaceAssetDto) => {
    setAssetToEdit(asset);
    setIsAssetDialogOpen(true);
  };

  const handleOpenMaintenance = (asset: WorkspaceAssetDto) => {
    setAssetForMaintenance(asset);
    setIsMaintenanceDialogOpen(true);
  };

  const handleOpenHistory = (asset: WorkspaceAssetDto) => {
    setAssetForHistory(asset);
    setIsHistoryDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!assetToDelete) return;
    deleteMutation.mutate(
      {
        workspaceId,
        assetId: assetToDelete.id,
        assetCode: assetToDelete.assetCode
      },
      {
        onSuccess: () => setAssetToDelete(null)
      }
    );
  };

  const handleResetFilters = () => {
    setSearch('');
    setSelectedStatus('ALL');
    setPage(1);
  };

  return (
    <div className='space-y-6'>
      {/* Metric Cards Banner */}
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
        <div className='bg-card p-4 rounded-xl border border-border flex items-center gap-3 shadow-2xs'>
          <div className='w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold'>
            <Box className='w-5 h-5' />
          </div>
          <div>
            <p className='text-xs text-muted-foreground font-medium'>Tổng số tài sản</p>
            <p className='text-xl font-bold text-foreground'>{metrics.total}</p>
          </div>
        </div>

        <div className='bg-card p-4 rounded-xl border border-border flex items-center gap-3 shadow-2xs'>
          <div className='w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold'>
            <CheckCircle2 className='w-5 h-5' />
          </div>
          <div>
            <p className='text-xs text-muted-foreground font-medium'>Đang hoạt động tốt</p>
            <p className='text-xl font-bold text-emerald-600 dark:text-emerald-400'>{metrics.inUse}</p>
          </div>
        </div>

        <div className='bg-card p-4 rounded-xl border border-border flex items-center gap-3 shadow-2xs'>
          <div className='w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold'>
            <Wrench className='w-5 h-5' />
          </div>
          <div>
            <p className='text-xs text-muted-foreground font-medium'>Đang bảo trì / sửa</p>
            <p className='text-xl font-bold text-amber-600 dark:text-amber-400'>{metrics.underMaintenance}</p>
          </div>
        </div>

        <div className='bg-card p-4 rounded-xl border border-border flex items-center gap-3 shadow-2xs'>
          <div className='w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold'>
            <AlertTriangle className='w-5 h-5' />
          </div>
          <div>
            <p className='text-xs text-muted-foreground font-medium'>Báo hỏng chờ sửa</p>
            <p className='text-xl font-bold text-rose-600 dark:text-rose-400'>{metrics.broken}</p>
          </div>
        </div>
      </div>

      {/* Control Bar: Search + Filter Pills + Action Buttons */}
      <div className='flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between'>
        <div className='flex flex-wrap items-center gap-2 flex-1'>
          <div className='relative w-full sm:w-72'>
            <Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground' />
            <Input
              placeholder='Tìm mã, tên hoặc vị trí thiết bị...'
              className='pl-9 h-9 text-xs sm:text-sm'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className='flex items-center gap-1.5 overflow-x-auto py-1'>
            {filterTabs.map((tab) => {
              const isActive = selectedStatus === tab.key;
              return (
                <button
                  key={tab.key}
                  type='button'
                  onClick={() => {
                    setSelectedStatus(tab.key);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-2xs font-mono font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-muted-foreground/15 text-muted-foreground'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className='flex items-center gap-2 justify-end'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            disabled={isFetching}
            className='h-9 text-xs'
            title='Làm mới dữ liệu từ máy chủ'
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1 text-muted-foreground ${isFetching ? 'animate-spin' : ''}`} />
            Tải lại
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={handleOpenAdd}
            className='h-9 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs'
          >
            <Plus className='w-4 h-4 mr-1' />
            Thêm tài sản
          </Button>
        </div>
      </div>

      {/* Assets Table Container */}
      <div className='bg-card rounded-xl border border-border shadow-2xs overflow-hidden'>
        {isLoading ? (
          <div className='py-20 flex flex-col items-center justify-center text-muted-foreground gap-3'>
            <Loader2 className='w-8 h-8 animate-spin text-indigo-600' />
            <p className='text-sm font-medium'>Đang tải danh sách cơ sở vật chất...</p>
          </div>
        ) : isError ? (
          <div className='py-16 text-center text-rose-500 space-y-2'>
            <AlertTriangle className='w-10 h-10 mx-auto' />
            <p className='font-semibold'>Không thể tải danh sách tài sản</p>
            <Button size='sm' variant='outline' onClick={() => refetch()}>
              Thử lại
            </Button>
          </div>
        ) : allAssets.length === 0 ? (
          /* Empty state: No assets registered yet */
          <div className='py-20 text-center text-muted-foreground space-y-3'>
            <Box className='w-12 h-12 mx-auto text-muted-foreground/60' />
            <p className='font-semibold text-foreground text-base'>Chưa có tài sản hoặc thiết bị nào</p>
            <p className='text-xs max-w-sm mx-auto text-muted-foreground'>
              Thêm trang thiết bị (máy chiếu, điều hòa, bàn ghế, smart TV) để quản lý tình trạng và ghi nhật ký bảo dưỡng định kỳ.
            </p>
            <Button
              size='sm'
              onClick={handleOpenAdd}
              className='mt-2 bg-indigo-600 hover:bg-indigo-700 text-white'
            >
              <Plus className='w-4 h-4 mr-1' />
              Thêm thiết bị đầu tiên
            </Button>
          </div>
        ) : filteredAssets.length === 0 ? (
          /* Empty state: Filter returned 0 results */
          <div className='py-16 text-center text-muted-foreground space-y-3'>
            <FilterX className='w-10 h-10 mx-auto text-muted-foreground/60' />
            <p className='font-semibold text-foreground text-sm'>
              Không tìm thấy thiết bị phù hợp với bộ lọc hiện tại
            </p>
            <p className='text-xs text-muted-foreground'>
              Thử đổi từ khóa tìm kiếm hoặc chuyển sang tab trạng thái khác.
            </p>
            <Button
              size='sm'
              variant='outline'
              onClick={handleResetFilters}
              className='h-8 text-xs'
            >
              Xóa bộ lọc
            </Button>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader>
                <TableRow className='bg-muted/40 hover:bg-muted/40'>
                  <TableHead className='w-28 font-bold text-xs'>Mã tài sản</TableHead>
                  <TableHead className='min-w-48 font-bold text-xs'>Tên thiết bị & Vị trí</TableHead>
                  <TableHead className='w-20 font-bold text-xs text-center'>Số lượng</TableHead>
                  <TableHead className='w-36 font-bold text-xs'>Trạng thái</TableHead>
                  <TableHead className='w-36 font-bold text-xs'>Lịch bảo trì tới</TableHead>
                  <TableHead className='w-32 font-bold text-xs text-right'>Giá mua</TableHead>
                  <TableHead className='w-44 font-bold text-xs text-right'>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentAssets.map((asset) => (
                  <TableRow key={asset.id} className='hover:bg-muted/20 transition-colors'>
                    <TableCell className='font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400'>
                      {asset.assetCode}
                    </TableCell>

                    <TableCell>
                      <div>
                        <p className='font-bold text-xs sm:text-sm text-foreground'>{asset.name}</p>
                        {asset.resourceName && (
                          <p className='text-2xs text-muted-foreground mt-0.5'>
                            Gắn với: <span className='font-medium text-foreground/80'>{asset.resourceName}</span>
                          </p>
                        )}
                        {asset.note && (
                          <p className='text-2xs text-muted-foreground/80 italic mt-0.5 line-clamp-1'>
                            {asset.note}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className='text-center font-bold text-xs'>
                      {asset.quantity}
                    </TableCell>

                    <TableCell>
                      <AssetStatusBadge status={asset.status} />
                    </TableCell>

                    <TableCell className='text-xs text-muted-foreground whitespace-nowrap'>
                      {asset.nextMaintenanceDate ? (
                        <span>{new Date(asset.nextMaintenanceDate).toLocaleDateString('vi-VN')}</span>
                      ) : (
                        <span className='text-muted-foreground/50'>Chưa lên lịch</span>
                      )}
                    </TableCell>

                    <TableCell className='text-xs text-right font-medium text-foreground whitespace-nowrap'>
                      {asset.purchasePrice
                        ? `${Number(asset.purchasePrice).toLocaleString('vi-VN')} đ`
                        : '—'}
                    </TableCell>

                    <TableCell className='text-right'>
                      <div className='flex items-center justify-end gap-1'>
                        <Button
                          type='button'
                          size='icon'
                          variant='ghost'
                          className='h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          title='Báo hỏng / Lập lịch bảo trì'
                          onClick={() => handleOpenMaintenance(asset)}
                        >
                          <Wrench className='w-3.5 h-3.5' />
                        </Button>

                        <Button
                          type='button'
                          size='icon'
                          variant='ghost'
                          className='h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                          title='Xem lịch sử bảo trì'
                          onClick={() => handleOpenHistory(asset)}
                        >
                          <History className='w-3.5 h-3.5' />
                        </Button>

                        <Button
                          type='button'
                          size='icon'
                          variant='ghost'
                          className='h-8 w-8 text-muted-foreground hover:text-foreground'
                          title='Chỉnh sửa thông tin tài sản'
                          onClick={() => handleOpenEdit(asset)}
                        >
                          <Pencil className='w-3.5 h-3.5' />
                        </Button>

                        <Button
                          type='button'
                          size='icon'
                          variant='ghost'
                          className='h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          title='Xóa tài sản'
                          onClick={() => setAssetToDelete(asset)}
                        >
                          <Trash2 className='w-3.5 h-3.5' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Client-side Pagination Footer */}
        {totalRecords > 0 && (
          <div className='p-4 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground'>
            {/* Left: Summary text */}
            <div className='flex flex-wrap items-center gap-1.5'>
              <span>Hiển thị</span>
              <span className='font-bold text-foreground'>{startIndex + 1}</span>
              <span>–</span>
              <span className='font-bold text-foreground'>{endIndex}</span>
              <span>trong tổng số</span>
              <span className='font-bold text-foreground'>{totalRecords}</span>
              <span>thiết bị</span>
              <span className='text-muted-foreground/60'>•</span>
              <span>
                Trang <span className='font-semibold text-foreground'>{currentPage}</span> / {totalPages}
              </span>
            </div>

            {/* Right: Page Size Selector + Navigation controls */}
            <div className='flex flex-wrap items-center gap-4 sm:gap-6'>
              {/* Page size selector */}
              <div className='flex items-center space-x-2'>
                <span className='text-xs font-medium text-muted-foreground whitespace-nowrap'>Số mục:</span>
                <Select
                  value={`${pageSize}`}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className='h-8 w-24 text-xs font-medium'>
                    <SelectValue placeholder={`${pageSize}`} />
                  </SelectTrigger>
                  <SelectContent side='top'>
                    <SelectItem value='5'>5 / trang</SelectItem>
                    <SelectItem value='10'>10 / trang</SelectItem>
                    <SelectItem value='20'>20 / trang</SelectItem>
                    <SelectItem value='50'>50 / trang</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Navigation button group */}
              <div className='flex items-center gap-1'>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  disabled={currentPage <= 1}
                  onClick={() => setPage(1)}
                  className='h-8 w-8 text-xs'
                  title='Về trang đầu tiên'
                >
                  <ChevronsLeft className='w-3.5 h-3.5' />
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className='h-8 w-8 text-xs'
                  title='Trang trước'
                >
                  <ChevronLeft className='w-3.5 h-3.5' />
                </Button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const isCurrent = pageNum === currentPage;
                  if (
                    totalPages > 7 &&
                    pageNum !== 1 &&
                    pageNum !== totalPages &&
                    Math.abs(pageNum - currentPage) > 1
                  ) {
                    if (pageNum === 2 || pageNum === totalPages - 1) {
                      return (
                        <span key={pageNum} className='px-1 text-muted-foreground/60 select-none'>
                          ...
                        </span>
                      );
                    }
                    return null;
                  }

                  return (
                    <Button
                      key={pageNum}
                      type='button'
                      variant={isCurrent ? 'default' : 'outline'}
                      size='sm'
                      onClick={() => setPage(pageNum)}
                      className={`h-8 w-8 p-0 text-xs ${
                        isCurrent
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className='h-8 w-8 text-xs'
                  title='Trang kế tiếp'
                >
                  <ChevronRight className='w-3.5 h-3.5' />
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(totalPages)}
                  className='h-8 w-8 text-xs'
                  title='Đến trang cuối'
                >
                  <ChevronsRight className='w-3.5 h-3.5' />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AssetDialog
        open={isAssetDialogOpen}
        onOpenChange={setIsAssetDialogOpen}
        workspaceId={workspaceId}
        assetToEdit={assetToEdit}
      />

      <MaintenanceDialog
        open={isMaintenanceDialogOpen}
        onOpenChange={setIsMaintenanceDialogOpen}
        workspaceId={workspaceId}
        asset={assetForMaintenance}
      />

      <MaintenanceHistoryDialog
        open={isHistoryDialogOpen}
        onOpenChange={setIsHistoryDialogOpen}
        workspaceId={workspaceId}
        asset={assetForHistory}
        onOpenNewLog={() => {
          if (assetForHistory) {
            handleOpenMaintenance(assetForHistory);
          }
        }}
      />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(assetToDelete)} onOpenChange={(o) => !o && setAssetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa tài sản?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa tài sản <strong>{assetToDelete?.name}</strong> ({assetToDelete?.assetCode}) khỏi không gian làm việc này? Hành động này sẽ xóa cả lịch sử bảo trì liên quan và không thể khôi phục.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className='bg-rose-600 hover:bg-rose-700 text-white'
            >
              {deleteMutation.isPending && <Loader2 className='w-4 h-4 animate-spin mr-1' />}
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
