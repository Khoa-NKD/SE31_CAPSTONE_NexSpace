import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Laptop,
  Users2,
  Sparkles,
  Volume2,
  Volume1,
  VolumeX,
  Briefcase,
  GraduationCap,
  Calendar,
  Layers,
  Check,
  Plus,
  X,
  RotateCcw,
  Save,
  AlertCircle,
  ChevronsUpDown,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { amenityService } from '@/features/amenities/api/service';
import {
  useSaveCustomerPreferenceMutation,
  useDeleteCustomerPreferenceMutation
} from '../api/mutations';
import { VIETNAM_PROVINCE_GROUPS } from '../data/vietnam-locations';
import type {
  CustomerPreferenceDto,
  ResourceCategoryPreference,
  NoiseLevel,
  BookingPurpose,
  UpdateCustomerPreferencePayload
} from '../api/types';

interface CustomerPreferenceFormProps {
  initialData?: CustomerPreferenceDto;
}

function formatCurrency(val: string) {
  const num = Number(val);
  if (!val || Number.isNaN(num)) return '';
  return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
}

export function CustomerPreferenceForm({ initialData }: CustomerPreferenceFormProps) {
  const saveMutation = useSaveCustomerPreferenceMutation();
  const deleteMutation = useDeleteCustomerPreferenceMutation();

  // Load platform amenities
  const { data: availableAmenities = [], isLoading: isLoadingAmenities } = useQuery({
    queryKey: ['amenities', 'available'],
    queryFn: () => amenityService.getAvailableAmenities(),
    staleTime: 10 * 60 * 1000
  });

  // State form
  const [districts, setDistricts] = useState<string[]>(
    Array.isArray(initialData?.districts) ? initialData.districts : []
  );
  const [customDistrict, setCustomDistrict] = useState('');
  const [amenityIds, setAmenityIds] = useState<number[]>(
    Array.isArray(initialData?.amenityIds) ? initialData.amenityIds : []
  );
  const [budgetMin, setBudgetMin] = useState<string>(
    initialData?.budgetMin !== null && initialData?.budgetMin !== undefined
      ? String(initialData.budgetMin)
      : ''
  );
  const [budgetMax, setBudgetMax] = useState<string>(
    initialData?.budgetMax !== null && initialData?.budgetMax !== undefined
      ? String(initialData.budgetMax)
      : ''
  );
  const [resourceCategory, setResourceCategory] = useState<ResourceCategoryPreference>(
    initialData?.resourceCategory || 'ANY'
  );
  const [noiseLevel, setNoiseLevel] = useState<NoiseLevel | null>(
    initialData?.noiseLevel || null
  );
  const [purpose, setPurpose] = useState<BookingPurpose | null>(initialData?.purpose || null);

  const [validationError, setValidationError] = useState<string | null>(null);

  // Dropdown search & popover state
  const [isDistrictDropdownOpen, setIsDistrictDropdownOpen] = useState(false);
  const [districtSearchTerm, setDistrictSearchTerm] = useState('');

  const filteredProvinceGroups = React.useMemo(() => {
    const term = districtSearchTerm.trim().toLowerCase();
    if (!term) return VIETNAM_PROVINCE_GROUPS;

    return VIETNAM_PROVINCE_GROUPS.map((group) => {
      const matchProvince = group.province.toLowerCase().includes(term);
      const matchedDistricts = group.districts.filter(
        (d) => matchProvince || d.toLowerCase().includes(term)
      );
      return {
        province: group.province,
        districts: matchedDistricts
      };
    }).filter((group) => group.districts.length > 0);
  }, [districtSearchTerm]);

  // District handlers: Hỗ trợ chọn và bỏ chọn linh hoạt
  const handleToggleDistrict = (locationName: string) => {
    setValidationError(null);
    const existingIndex = districts.findIndex((d) => d === locationName);
    if (existingIndex !== -1) {
      setDistricts(districts.filter((_, idx) => idx !== existingIndex));
    } else {
      if (districts.length >= 5) {
        setValidationError('Bạn chỉ có thể chọn tối đa 5 khu vực/quận.');
        return;
      }
      setDistricts([...districts, locationName]);
    }
  };

  const handleAddCustomDistrict = () => {
    const trimmed = customDistrict.trim();
    if (!trimmed) return;
    if (districts.includes(trimmed)) {
      setCustomDistrict('');
      return;
    }
    if (districts.length >= 5) {
      setValidationError('Bạn chỉ có thể chọn tối đa 5 khu vực/quận.');
      return;
    }
    setDistricts([...districts, trimmed]);
    setCustomDistrict('');
    setValidationError(null);
  };

  // Amenity handler
  const handleToggleAmenity = (id: number) => {
    setValidationError(null);
    if (amenityIds.includes(id)) {
      setAmenityIds(amenityIds.filter((item) => item !== id));
    } else {
      if (amenityIds.length >= 10) {
        setValidationError('Bạn chỉ có thể chọn tối đa 10 tiện ích.');
        return;
      }
      setAmenityIds([...amenityIds, id]);
    }
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const minNum = budgetMin ? Number(budgetMin) : null;
    const maxNum = budgetMax ? Number(budgetMax) : null;

    if (minNum !== null && Number.isNaN(minNum)) {
      setValidationError('Ngân sách tối thiểu không hợp lệ');
      return;
    }
    if (maxNum !== null && Number.isNaN(maxNum)) {
      setValidationError('Ngân sách tối đa không hợp lệ');
      return;
    }
    if (minNum !== null && minNum < 0) {
      setValidationError('Ngân sách tối thiểu không được âm');
      return;
    }
    if (maxNum !== null && maxNum < 0) {
      setValidationError('Ngân sách tối đa không được âm');
      return;
    }
    if (minNum !== null && maxNum !== null && minNum > maxNum) {
      setValidationError('Ngân sách tối thiểu không được lớn hơn ngân sách tối đa');
      return;
    }

    const hasDistricts = districts.length > 0;
    const hasSpecificCategory = resourceCategory !== 'ANY';
    if (!hasDistricts && !hasSpecificCategory) {
      setValidationError(
        'Vui lòng chọn ít nhất một khu vực (quận) hoặc một loại không gian cụ thể (Bàn hoặc Phòng) để hệ thống có cơ sở gợi ý.'
      );
      return;
    }

    const payload: UpdateCustomerPreferencePayload = {
      districts,
      amenityIds,
      budgetMin: minNum,
      budgetMax: maxNum,
      resourceCategory,
      noiseLevel: noiseLevel || undefined,
      purpose: purpose || undefined
    };

    saveMutation.mutate(payload);
  };

  const handleResetToDefault = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        setDistricts([]);
        setAmenityIds([]);
        setBudgetMin('');
        setBudgetMax('');
        setResourceCategory('ANY');
        setNoiseLevel(null);
        setPurpose(null);
        setValidationError(null);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-8'>
      {/* Validation Alert */}
      {validationError && (
        <div className='flex items-center gap-2 p-4 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20'>
          <AlertCircle className='w-4 h-4 shrink-0' />
          <span>{validationError}</span>
        </div>
      )}

      {/* 1. KHU VỰC / QUẬN MONG MUỐN */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <Label className='text-base font-semibold flex items-center gap-2'>
            <MapPin className='w-4 h-4 text-primary' />
            Khu vực ưu tiên tìm kiếm
          </Label>
          <span className='text-xs font-medium text-muted-foreground'>
            Đã chọn {districts.length}/5 khu vực
          </span>
        </div>
        <p className='text-xs text-muted-foreground'>
          Chọn tối đa 5 quận/huyện trên toàn quốc từ danh sách để nhận đề xuất không gian gần nhất. Có thể nhấp để chọn hoặc bỏ chọn dễ dàng.
        </p>

        {/* Dropdown Multi-Select Combobox & Custom Input */}
        <div className='flex flex-col sm:flex-row gap-2 max-w-2xl'>
          <Popover open={isDistrictDropdownOpen} onOpenChange={setIsDistrictDropdownOpen}>
            <PopoverTrigger asChild>
              <Button
                type='button'
                variant='outline'
                className='w-full sm:max-w-md justify-between font-normal text-left h-10 border-input bg-background hover:bg-muted/50 cursor-pointer'
              >
                <span className='flex items-center gap-2 truncate text-xs sm:text-sm text-foreground'>
                  <MapPin className='w-4 h-4 text-primary shrink-0' />
                  {districts.length === 0
                    ? 'Chọn tỉnh thành, quận/huyện... (Tối đa 5 khu vực)'
                    : `Đã chọn ${districts.length}/5 khu vực`}
                </span>
                <ChevronsUpDown className='w-4 h-4 text-muted-foreground opacity-70 shrink-0 ml-2' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-[calc(100vw-2rem)] sm:w-96 p-3 shadow-xl' align='start'>
              {/* Search input */}
              <div className='relative mb-2.5'>
                <Search className='w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground' />
                <Input
                  placeholder='Tìm quận/huyện, tỉnh thành (Hải Châu, Quận 1, Cầu Giấy...)'
                  value={districtSearchTerm}
                  onChange={(e) => setDistrictSearchTerm(e.target.value)}
                  className='pl-8 h-8 text-xs'
                />
              </div>

              {/* Scrollable list grouped by Province */}
              <div className='max-h-64 overflow-y-auto pr-1 space-y-3 [scrollbar-width:thin]'>
                {filteredProvinceGroups.length === 0 ? (
                  <div className='text-center py-4 text-xs text-muted-foreground'>
                    Không tìm thấy khu vực phù hợp.
                  </div>
                ) : (
                  filteredProvinceGroups.map((group) => (
                    <div key={group.province} className='space-y-1'>
                      <div className='text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1'>
                        {group.province}
                      </div>
                      <div className='grid grid-cols-2 gap-1'>
                        {group.districts.map((district) => {
                          const fullLocationName = `${district} (${group.province})`;
                          // Kiểm tra đã chọn (khớp cả tên đầy đủ hoặc tên quận)
                          const isSelected = districts.includes(fullLocationName) || districts.includes(district);
                          const isDisabled = !isSelected && districts.length >= 5;
                          const activeValue = districts.find((d) => d === fullLocationName || d === district) || fullLocationName;
                          return (
                            <button
                              key={district}
                              type='button'
                              disabled={isDisabled}
                              onClick={() => handleToggleDistrict(activeValue)}
                              className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors text-left ${
                                isSelected
                                  ? 'bg-primary/10 text-primary font-semibold border border-primary/30'
                                  : isDisabled
                                    ? 'opacity-40 cursor-not-allowed text-muted-foreground'
                                    : 'hover:bg-muted text-foreground cursor-pointer'
                              }`}
                            >
                              <span className='truncate'>{district}</span>
                              {isSelected && <Check className='w-3.5 h-3.5 text-primary shrink-0 ml-1' />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Nhập khu vực tùy chỉnh khác (nếu có) */}
          <div className='flex items-center gap-1.5 w-full sm:w-auto'>
            <Input
              placeholder='Hoặc nhập khu vực khác...'
              value={customDistrict}
              onChange={(e) => setCustomDistrict(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomDistrict();
                }
              }}
              disabled={districts.length >= 5}
              className='h-10 text-xs flex-1 sm:w-48'
            />
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleAddCustomDistrict}
              disabled={!customDistrict.trim() || districts.length >= 5}
              className='h-10 px-3 shrink-0'
            >
              <Plus className='w-3.5 h-3.5 mr-1' />
              Thêm
            </Button>
          </div>
        </div>

        {/* Selected District Badges with Clear & Remove */}
        {districts.length > 0 && (
          <div className='space-y-1.5 pt-1.5'>
            <div className='flex items-center justify-between'>
              <span className='text-[11px] font-medium text-muted-foreground'>
                Khu vực đã chọn ({districts.length}/5):
              </span>
              <button
                type='button'
                onClick={() => setDistricts([])}
                className='text-[11px] text-destructive hover:underline cursor-pointer'
              >
                Bỏ chọn tất cả
              </button>
            </div>
            <div className='flex flex-wrap gap-2'>
              {districts.map((d) => (
                <Badge
                  key={d}
                  variant='secondary'
                  className='flex items-center gap-1.5 px-3 py-1 text-xs border border-border/80 bg-background text-foreground shadow-2xs hover:bg-muted/70'
                >
                  <MapPin className='w-3 h-3 text-primary' />
                  <span>{d}</span>
                  <button
                    type='button'
                    aria-label={`Bỏ chọn ${d}`}
                    onClick={() => handleToggleDistrict(d)}
                    className='text-muted-foreground hover:text-destructive transition-colors ml-0.5 cursor-pointer'
                  >
                    <X className='w-3.5 h-3.5' />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. LOẠI HÌNH KHÔNG GIAN */}
      <div className='space-y-3'>
        <Label className='text-base font-semibold flex items-center gap-2'>
          <Layers className='w-4 h-4 text-primary' />
          Loại hình không gian ưu tiên
        </Label>
        <p className='text-xs text-muted-foreground'>
          Bạn có nhu cầu làm việc cá nhân hay hội họp nhóm?
        </p>

        <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1'>
          {/* DESK */}
          <button
            type='button'
            className={`p-4 rounded-xl flex flex-col items-center text-center gap-2 transition-all border-2 cursor-pointer ${
              resourceCategory === 'DESK'
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-border hover:border-muted-foreground/40 bg-card'
            }`}
            onClick={() => setResourceCategory('DESK')}
          >
            <div
              className={`p-2.5 rounded-full ${
                resourceCategory === 'DESK'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Laptop className='w-5 h-5' />
            </div>
            <span className='font-semibold text-sm'>Bàn làm việc</span>
            <span className='text-xs text-muted-foreground'>
              Bàn đơn, chỗ ngồi linh hoạt, cá nhân
            </span>
          </button>

          {/* ROOM */}
          <button
            type='button'
            className={`p-4 rounded-xl flex flex-col items-center text-center gap-2 transition-all border-2 cursor-pointer ${
              resourceCategory === 'ROOM'
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-border hover:border-muted-foreground/40 bg-card'
            }`}
            onClick={() => setResourceCategory('ROOM')}
          >
            <div
              className={`p-2.5 rounded-full ${
                resourceCategory === 'ROOM'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Users2 className='w-5 h-5' />
            </div>
            <span className='font-semibold text-sm'>Phòng họp / Riêng</span>
            <span className='text-xs text-muted-foreground'>
              Phòng làm việc nhóm, phòng họp kín
            </span>
          </button>

          {/* ANY */}
          <button
            type='button'
            className={`p-4 rounded-xl flex flex-col items-center text-center gap-2 transition-all border-2 cursor-pointer ${
              resourceCategory === 'ANY'
                ? 'border-primary bg-primary/5 shadow-xs'
                : 'border-border hover:border-muted-foreground/40 bg-card'
            }`}
            onClick={() => setResourceCategory('ANY')}
          >
            <div
              className={`p-2.5 rounded-full ${
                resourceCategory === 'ANY'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Sparkles className='w-5 h-5' />
            </div>
            <span className='font-semibold text-sm'>Bất kỳ loại nào</span>
            <span className='text-xs text-muted-foreground'>
              Linh hoạt tùy theo không gian phù hợp
            </span>
          </button>
        </div>
      </div>

      {/* 3. MỨC ĐỘ YÊN TĨNH & MỤC ĐÍCH SỬ DỤNG */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Mức độ ồn */}
        <div className='space-y-3'>
          <Label className='text-sm font-semibold flex items-center gap-2'>
            <Volume2 className='w-4 h-4 text-primary' />
            Mức độ yên tĩnh mong muốn
          </Label>
          <div className='grid grid-cols-3 gap-2'>
            {[
              { id: 'QUIET', label: 'Yên tĩnh', icon: VolumeX, desc: 'Tập trung cao' },
              { id: 'MODERATE', label: 'Vừa phải', icon: Volume1, desc: 'Làm việc chuẩn' },
              { id: 'LIVELY', label: 'Sôi động', icon: Volume2, desc: 'Trao đổi nhóm' }
            ].map((item) => {
              const isSelected = noiseLevel === item.id;
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => setNoiseLevel(isSelected ? null : (item.id as NoiseLevel))}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <IconComp className='w-4 h-4 mx-auto mb-1' />
                  <div className='text-xs font-semibold text-foreground'>{item.label}</div>
                  <div className='text-[10px] text-muted-foreground mt-0.5'>{item.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mục đích sử dụng */}
        <div className='space-y-3'>
          <Label className='text-sm font-semibold flex items-center gap-2'>
            <Briefcase className='w-4 h-4 text-primary' />
            Mục đích làm việc chính
          </Label>
          <div className='grid grid-cols-3 gap-2'>
            {[
              { id: 'FREELANCE', label: 'Freelance', icon: Laptop },
              { id: 'STUDY', label: 'Học tập', icon: GraduationCap },
              { id: 'TEAM_WORK', label: 'Làm nhóm', icon: Users2 },
              { id: 'MEETING', label: 'Hội họp', icon: Calendar },
              { id: 'EVENT', label: 'Sự kiện', icon: Sparkles },
              { id: 'OTHER', label: 'Mục đích khác', icon: Layers }
            ].map((item) => {
              const isSelected = purpose === item.id;
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type='button'
                  onClick={() => setPurpose(isSelected ? null : (item.id as BookingPurpose))}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <IconComp className='w-4 h-4 mx-auto mb-1' />
                  <div className='text-xs text-foreground'>{item.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. KHOẢNG NGÂN SÁCH DỰ KIẾN */}
      <div className='space-y-3'>
        <Label className='text-base font-semibold'>Khoảng ngân sách dự kiến (VNĐ)</Label>
        <p className='text-xs text-muted-foreground'>
          Thiết lập mức giá tối thiểu và tối đa bạn sẵn sàng chi trả để bộ lọc gợi ý đúng tầm giá.
        </p>

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg'>
          <div>
            <Label className='text-xs text-muted-foreground mb-1 block'>Ngân sách tối thiểu</Label>
            <div className='relative'>
              <Input
                type='number'
                min='0'
                step='5000'
                placeholder='Ví dụ: 30000'
                value={budgetMin}
                onChange={(e) => {
                  setBudgetMin(e.target.value);
                  setValidationError(null);
                }}
                className='h-10 text-sm'
              />
              {budgetMin && (
                <span className='absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none'>
                  {formatCurrency(budgetMin)}
                </span>
              )}
            </div>
          </div>

          <div>
            <Label className='text-xs text-muted-foreground mb-1 block'>Ngân sách tối đa</Label>
            <div className='relative'>
              <Input
                type='number'
                min='0'
                step='5000'
                placeholder='Ví dụ: 150000'
                value={budgetMax}
                onChange={(e) => {
                  setBudgetMax(e.target.value);
                  setValidationError(null);
                }}
                className='h-10 text-sm'
              />
              {budgetMax && (
                <span className='absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none'>
                  {formatCurrency(budgetMax)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Preset quick buttons */}
        <div className='flex flex-wrap gap-2 pt-1'>
          <span className='text-xs text-muted-foreground self-center mr-1'>Gợi ý nhanh:</span>
          {[
            { label: 'Dưới 50k', min: '0', max: '50000' },
            { label: '50k - 100k', min: '50000', max: '100000' },
            { label: '100k - 200k', min: '100000', max: '200000' },
            { label: 'Trên 200k', min: '200000', max: '500000' }
          ].map((preset) => (
            <Button
              key={preset.label}
              type='button'
              variant='outline'
              size='sm'
              className='h-7 text-xs px-2.5'
              onClick={() => {
                setBudgetMin(preset.min);
                setBudgetMax(preset.max);
                setValidationError(null);
              }}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 5. TIỆN ÍCH MONG MUỐN */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <Label className='text-base font-semibold'>Tiện ích mong muốn</Label>
          <span className='text-xs text-muted-foreground'>
            Đã chọn {amenityIds.length}/10 tiện ích
          </span>
        </div>
        <p className='text-xs text-muted-foreground'>
          Chọn tối đa 10 tiện ích bạn cần có (như Wi-Fi tốc độ cao, máy in, ổ cắm điện, máy lạnh...).
        </p>

        {isLoadingAmenities ? (
          <div className='text-xs text-muted-foreground py-2'>Đang tải danh mục tiện ích...</div>
        ) : !Array.isArray(availableAmenities) || availableAmenities.length === 0 ? (
          <div className='text-xs text-muted-foreground py-2'>Không có danh mục tiện ích nào.</div>
        ) : (
          <div className='flex flex-wrap gap-2 pt-1'>
            {availableAmenities.map((amenity) => {
              const isSelected = amenityIds.includes(amenity.id);
              return (
                <Badge
                  key={amenity.id}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`cursor-pointer px-3 py-1.5 text-xs transition-colors select-none ${
                    isSelected
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'hover:bg-muted text-foreground'
                  }`}
                  onClick={() => handleToggleAmenity(amenity.id)}
                >
                  {isSelected && <Check className='w-3 h-3 mr-1 inline' />}
                  {amenity.name}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. THAO TÁC / BUTTONS */}
      <div className='flex items-center justify-between pt-6 border-t'>
        {/* Reset / Delete Dialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type='button'
              variant='outline'
              className='text-destructive hover:bg-destructive/10'
              disabled={deleteMutation.isPending || saveMutation.isPending}
            >
              <RotateCcw className='w-4 h-4 mr-2' />
              Đặt lại mặc định
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Đặt lại sở thích không gian?</AlertDialogTitle>
              <AlertDialogDescription>
                Thao tác này sẽ xóa toàn bộ cấu hình khu vực, ngân sách và tiện ích bạn đã lưu.
                Hệ thống sẽ chuyển về trạng thái mặc định chưa thiết lập.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetToDefault}
                className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              >
                Xác nhận đặt lại
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Save button */}
        <Button
          type='submit'
          disabled={saveMutation.isPending || deleteMutation.isPending}
          className='min-w-[140px]'
        >
          {saveMutation.isPending ? (
            <span className='flex items-center gap-2'>
              <span className='animate-spin'>⏳</span>
              Đang lưu...
            </span>
          ) : (
            <>
              <Save className='w-4 h-4 mr-2' />
              Lưu sở thích
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

