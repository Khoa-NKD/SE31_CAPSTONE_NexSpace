import React, { useState, useMemo } from 'react';
import {
  Wifi,
  PhoneCall,
  Cast,
  Monitor,
  Printer,
  Armchair,
  MoveVertical,
  Lock,
  ShowerHead,
  Bike,
  Presentation,
  Coffee,
  Droplets,
  Utensils,
  Heart,
  Sparkles,
  Zap,
  Plus,
  Search,
  Filter,
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Cpu,
  Building2,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { amenityQueries } from '../api/queries';
import { useToggleOrganizerAmenityStatusMutation } from '../api/mutations';
import type { AmenityDto, AmenityCategory, AmenityFilterParams } from '../api/types';
import { AmenityFormDialog } from './amenity-form-dialog';
import { AmenityDeleteDialog } from './amenity-delete-dialog';

function renderAmenityIcon(iconName?: string) {
  const props = { className: 'size-4' };
  switch (iconName) {
    case 'Wifi':
      return <Wifi {...props} />;
    case 'PhoneCall':
      return <PhoneCall {...props} />;
    case 'Cast':
      return <Cast {...props} />;
    case 'Monitor':
      return <Monitor {...props} />;
    case 'Printer':
      return <Printer {...props} />;
    case 'Armchair':
      return <Armchair {...props} />;
    case 'MoveVertical':
      return <MoveVertical {...props} />;
    case 'Lock':
      return <Lock {...props} />;
    case 'ShowerHead':
      return <ShowerHead {...props} />;
    case 'Bike':
      return <Bike {...props} />;
    case 'Presentation':
      return <Presentation {...props} />;
    case 'Coffee':
      return <Coffee {...props} />;
    case 'Droplets':
      return <Droplets {...props} />;
    case 'Utensils':
      return <Utensils {...props} />;
    case 'Heart':
      return <Heart {...props} />;
    case 'Zap':
      return <Zap {...props} />;
    default:
      return <Sparkles {...props} />;
  }
}

function getCategoryBadge(category: AmenityCategory) {
  switch (category) {
    case 'TECH':
      return (
        <Badge
          variant='secondary'
          className='bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[11px] font-medium gap-1'
        >
          <Cpu className='size-3' />
          Công nghệ (TECH)
        </Badge>
      );
    case 'SPACE':
      return (
        <Badge
          variant='secondary'
          className='bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[11px] font-medium gap-1'
        >
          <Building2 className='size-3' />
          Không gian & Tiện ích (SPACE)
        </Badge>
      );
    case 'COMFORT':
      return (
        <Badge
          variant='secondary'
          className='bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] font-medium gap-1'
        >
          <Coffee className='size-3' />
          Dịch vụ & Đời sống (COMFORT)
        </Badge>
      );
    default:
      return <Badge variant='outline'>{category}</Badge>;
  }
}

export function OrganizerAmenitiesView() {
  const [activeTab, setActiveTab] = useState<'custom' | 'standard'>('custom');

  // Filters for Custom Amenities
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState<AmenityDto | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [amenityToDelete, setAmenityToDelete] = useState<AmenityDto | null>(null);

  // Queries
  const filterParams: AmenityFilterParams = useMemo(
    () => ({
      search: searchTerm.trim() || undefined,
      category: categoryFilter !== 'ALL' ? (categoryFilter as AmenityCategory) : undefined,
      active: statusFilter === 'ACTIVE' ? true : statusFilter === 'INACTIVE' ? false : undefined,
      page,
      size: pageSize,
      sortBy: 'createdAt',
      sortDir: 'desc'
    }),
    [searchTerm, categoryFilter, statusFilter, page, pageSize]
  );

  const {
    data: customPageData,
    isLoading: isLoadingCustom,
    isFetching: isFetchingCustom,
    refetch: refetchCustom
  } = useQuery(amenityQueries.organizerList(filterParams));

  // Query standard platform amenities for reference tab & stats
  const {
    data: standardAmenities,
    isLoading: isLoadingStandard
  } = useQuery(amenityQueries.available());

  // Mutations
  const toggleMutation = useToggleOrganizerAmenityStatusMutation();

  const handleOpenCreate = () => {
    setSelectedAmenity(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (amenity: AmenityDto) => {
    setSelectedAmenity(amenity);
    setIsFormOpen(true);
  };

  const handleOpenDelete = (amenity: AmenityDto) => {
    setAmenityToDelete(amenity);
    setIsDeleteOpen(true);
  };

  const handleToggleStatus = (amenity: AmenityDto, nextActive: boolean) => {
    toggleMutation.mutate({ id: amenity.id, active: nextActive });
  };

  const customAmenities = useMemo(() => customPageData?.listObjects || [], [customPageData]);
  const totalCustomElements = customPageData?.totalElements || 0;
  const totalCustomPages = customPageData?.totalPages || 1;

  // Active custom count
  const activeCustomCount = useMemo(() => {
    return customAmenities.filter((a) => a.active).length;
  }, [customAmenities]);

  // Filtered standard amenities for standard tab
  const [standardSearch, setStandardSearch] = useState('');
  const [standardCategory, setStandardCategory] = useState<string>('ALL');

  const filteredStandardAmenities = useMemo(() => {
    if (!standardAmenities) return [];
    return standardAmenities.filter((item) => {
      const matchSearch = standardSearch.trim() === '' ||
        item.name.toLowerCase().includes(standardSearch.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(standardSearch.toLowerCase()));
      const matchCat = standardCategory === 'ALL' || item.category === standardCategory;
      return matchSearch && matchCat;
    });
  }, [standardAmenities, standardSearch, standardCategory]);

  return (
    <div className='flex flex-col gap-6 p-1 md:p-2'>
      {/* Page Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2'>
            <h1 className='text-2xl font-bold tracking-tight'>Quản lý tiện ích không gian</h1>
            <Badge variant='outline' className='bg-primary/5 text-primary border-primary/20 text-xs font-semibold'>
              Đối tác (Organizer)
            </Badge>
          </div>
          <p className='text-sm text-muted-foreground mt-1'>
            Tạo và quản lý các tiện ích riêng biệt của tổ chức bạn, hoặc tra cứu danh mục tiện ích chuẩn của NexSpace.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetchCustom()}
            disabled={isFetchingCustom}
            className='gap-1.5'
          >
            <RefreshCw className={`size-3.5 ${isFetchingCustom ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button
            size='sm'
            onClick={handleOpenCreate}
            className='gap-1.5 shadow-sm'
          >
            <Plus className='size-4' />
            Tạo tiện ích riêng
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
        <Card className='border shadow-sm'>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <CardDescription className='text-xs font-medium uppercase text-muted-foreground'>
                Tiện ích riêng đã tạo
              </CardDescription>
              <div className='size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center'>
                <Sparkles className='size-4' />
              </div>
            </div>
            <CardTitle className='text-2xl font-bold'>{totalCustomElements}</CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            <p className='text-xs text-muted-foreground'>
              Bộ tiện ích độc quyền của tổ chức bạn
            </p>
          </CardContent>
        </Card>

        <Card className='border shadow-sm'>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <CardDescription className='text-xs font-medium uppercase text-muted-foreground'>
                Đang kích hoạt
              </CardDescription>
              <div className='size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center'>
                <CheckCircle2 className='size-4' />
              </div>
            </div>
            <CardTitle className='text-2xl font-bold'>{activeCustomCount}</CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            <p className='text-xs text-muted-foreground'>
              Sẵn sàng để gắn vào các không gian làm việc
            </p>
          </CardContent>
        </Card>

        <Card className='border shadow-sm'>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <CardDescription className='text-xs font-medium uppercase text-muted-foreground'>
                Tiện ích chuẩn NexSpace
              </CardDescription>
              <div className='size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center'>
                <ShieldCheck className='size-4' />
              </div>
            </div>
            <CardTitle className='text-2xl font-bold'>
              {isLoadingStandard ? '...' : standardAmenities?.length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            <p className='text-xs text-muted-foreground'>
              Tiện ích toàn hệ thống có thể sử dụng ngay
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'custom' | 'standard')}>
        <TabsList className='grid w-full max-w-md grid-cols-2'>
          <TabsTrigger value='custom' className='gap-2'>
            <Sparkles className='size-4' />
            Tiện ích riêng ({totalCustomElements})
          </TabsTrigger>
          <TabsTrigger value='standard' className='gap-2'>
            <ShieldCheck className='size-4' />
            Tiện ích chuẩn hệ thống ({standardAmenities?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Custom Amenities */}
        <TabsContent value='custom' className='space-y-4 pt-4'>
          {/* Filter Bar */}
          <div className='flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl border'>
            <div className='relative w-full sm:w-72'>
              <Search className='absolute left-2.5 top-2.5 size-4 text-muted-foreground' />
              <Input
                placeholder='Tìm theo tên hoặc mô tả...'
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className='pl-8 bg-background h-9 text-xs'
              />
            </div>

            <div className='flex items-center gap-2 w-full sm:w-auto'>
              <div className='flex items-center gap-1.5'>
                <Filter className='size-3.5 text-muted-foreground hidden sm:block' />
                <Select
                  value={categoryFilter}
                  onValueChange={(val) => {
                    setCategoryFilter(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className='h-9 text-xs w-[150px] bg-background'>
                    <SelectValue placeholder='Nhóm tiện ích' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='ALL'>Tất cả phân loại</SelectItem>
                    <SelectItem value='TECH'>Công nghệ (TECH)</SelectItem>
                    <SelectItem value='SPACE'>Không gian (SPACE)</SelectItem>
                    <SelectItem value='COMFORT'>Dịch vụ (COMFORT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className='h-9 text-xs w-[130px] bg-background'>
                  <SelectValue placeholder='Trạng thái' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>Tất cả trạng thái</SelectItem>
                  <SelectItem value='ACTIVE'>Đang bật</SelectItem>
                  <SelectItem value='INACTIVE'>Đang tắt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Amenities Table */}
          <div className='rounded-xl border bg-card shadow-sm overflow-hidden'>
            <Table>
              <TableHeader className='bg-muted/50'>
                <TableRow>
                  <TableHead className='w-[60px] text-center'>Icon</TableHead>
                  <TableHead className='min-w-[180px]'>Tên tiện ích</TableHead>
                  <TableHead className='w-[170px]'>Phân loại</TableHead>
                  <TableHead className='min-w-[220px]'>Mô tả chi tiết</TableHead>
                  <TableHead className='w-[120px] text-center'>Trạng thái</TableHead>
                  <TableHead className='w-[100px] text-right'>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingCustom ? (
                  <TableRow>
                    <TableCell colSpan={6} className='h-48 text-center'>
                      <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground'>
                        <Loader2 className='size-6 animate-spin text-primary' />
                        <span className='text-xs'>Đang tải danh sách tiện ích riêng...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : customAmenities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className='h-48 text-center'>
                      <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground max-w-md mx-auto'>
                        <div className='size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1'>
                          <Sparkles className='size-6' />
                        </div>
                        <p className='font-semibold text-foreground text-sm'>
                          Chưa có tiện ích riêng nào
                        </p>
                        <p className='text-xs leading-relaxed'>
                          Tổ chức của bạn có thể tạo các tiện ích độc quyền (ví dụ: máy pha specialty coffee, phòng live stream riêng, thiết bị VR) để bổ sung vào không gian.
                        </p>
                        <Button
                          size='sm'
                          onClick={handleOpenCreate}
                          className='mt-2 gap-1.5'
                        >
                          <Plus className='size-4' />
                          Tạo tiện ích đầu tiên
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  customAmenities.map((amenity) => (
                    <TableRow key={amenity.id} className='hover:bg-muted/30 transition-colors'>
                      <TableCell className='text-center'>
                        <div className='size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm'>
                          {renderAmenityIcon(amenity.icon)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-col'>
                          <span className='font-medium text-sm text-foreground'>
                            {amenity.name}
                          </span>
                          <span className='text-[11px] text-muted-foreground'>
                            ID: #{amenity.id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(amenity.category)}</TableCell>
                      <TableCell>
                        <p className='text-xs text-muted-foreground line-clamp-2 max-w-md'>
                          {amenity.description || 'Không có mô tả chi tiết'}
                        </p>
                      </TableCell>
                      <TableCell className='text-center'>
                        <div className='flex items-center justify-center gap-2'>
                          <Switch
                            checked={amenity.active}
                            onCheckedChange={(checked) => handleToggleStatus(amenity, checked)}
                            disabled={toggleMutation.isPending}
                          />
                          <span className={`text-[11px] font-medium ${amenity.active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            {amenity.active ? 'Bật' : 'Tắt'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className='text-right'>
                        <div className='flex items-center justify-end gap-1'>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleOpenEdit(amenity)}
                            className='size-8 text-muted-foreground hover:text-foreground'
                            title='Chỉnh sửa'
                          >
                            <Pencil className='size-3.5' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleOpenDelete(amenity)}
                            className='size-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10'
                            title='Xóa'
                          >
                            <Trash2 className='size-3.5' />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalCustomPages > 1 && (
              <div className='flex items-center justify-between p-3 border-t bg-muted/20 text-xs'>
                <span className='text-muted-foreground'>
                  Trang {page} / {totalCustomPages} (Tổng {totalCustomElements} tiện ích)
                </span>
                <div className='flex items-center gap-1.5'>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className='h-7 px-2.5 text-xs'
                  >
                    Trước
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    disabled={page >= totalCustomPages}
                    onClick={() => setPage((p) => Math.min(totalCustomPages, p + 1))}
                    className='h-7 px-2.5 text-xs'
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Standard Platform Amenities */}
        <TabsContent value='standard' className='space-y-4 pt-4'>
          {/* Info Banner */}
          <div className='p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 flex items-start gap-3'>
            <ShieldCheck className='size-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0' />
            <div className='text-xs leading-relaxed'>
              <p className='font-semibold text-blue-900 dark:text-blue-200'>
                Danh mục tiện ích chuẩn của NexSpace
              </p>
              <p className='text-blue-700 dark:text-blue-300 mt-0.5'>
                Các tiện ích này do ban quản trị NexSpace chuẩn hóa và cấp phép toàn nền tảng. Tổ chức của bạn có thể gắn bất kỳ tiện ích chuẩn nào vào không gian khi tạo hoặc cập nhật hồ sơ không gian.
              </p>
            </div>
          </div>

          {/* Standard Filters */}
          <div className='flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl border'>
            <div className='relative w-full sm:w-72'>
              <Search className='absolute left-2.5 top-2.5 size-4 text-muted-foreground' />
              <Input
                placeholder='Tìm tiện ích chuẩn...'
                value={standardSearch}
                onChange={(e) => setStandardSearch(e.target.value)}
                className='pl-8 bg-background h-9 text-xs'
              />
            </div>

            <Select
              value={standardCategory}
              onValueChange={setStandardCategory}
            >
              <SelectTrigger className='h-9 text-xs w-[170px] bg-background'>
                <SelectValue placeholder='Phân loại tiện ích' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>Tất cả phân loại</SelectItem>
                <SelectItem value='TECH'>Công nghệ (TECH)</SelectItem>
                <SelectItem value='SPACE'>Không gian (SPACE)</SelectItem>
                <SelectItem value='COMFORT'>Dịch vụ (COMFORT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Standard Amenities Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5'>
            {isLoadingStandard ? (
              <div className='col-span-full h-40 flex items-center justify-center text-muted-foreground gap-2'>
                <Loader2 className='size-5 animate-spin text-primary' />
                <span className='text-xs'>Đang tải danh mục tiện ích chuẩn...</span>
              </div>
            ) : filteredStandardAmenities.length === 0 ? (
              <div className='col-span-full h-40 flex items-center justify-center text-muted-foreground text-xs'>
                Không tìm thấy tiện ích chuẩn phù hợp.
              </div>
            ) : (
              filteredStandardAmenities.map((item) => (
                <Card key={item.id} className='border shadow-sm hover:border-primary/40 transition-colors'>
                  <CardHeader className='p-3.5 pb-2'>
                    <div className='flex items-start justify-between gap-2'>
                      <div className='flex items-center gap-2.5'>
                        <div className='size-9 rounded-lg bg-muted flex items-center justify-center text-primary shrink-0'>
                          {renderAmenityIcon(item.icon)}
                        </div>
                        <div>
                          <CardTitle className='text-sm font-semibold leading-tight'>
                            {item.name}
                          </CardTitle>
                          <span className='text-[10px] text-muted-foreground'>
                            Chuẩn hệ thống • ID: #{item.id}
                          </span>
                        </div>
                      </div>
                      {getCategoryBadge(item.category)}
                    </div>
                  </CardHeader>
                  <CardContent className='p-3.5 pt-1 text-xs text-muted-foreground leading-relaxed'>
                    {item.description || 'Tiện ích chuẩn phục vụ khách hàng trên nền tảng.'}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <AmenityFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        amenity={selectedAmenity}
        isOrganizer={true}
      />

      {/* Delete Dialog */}
      <AmenityDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        amenity={amenityToDelete}
        isOrganizer={true}
      />
    </div>
  );
}
