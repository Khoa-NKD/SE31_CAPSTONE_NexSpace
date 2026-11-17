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
  XCircle,
  Layers,
  Cpu,
  Coffee as CoffeeIcon,
  Building2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { useToggleAmenityStatusMutation } from '../api/mutations';
import type { AmenityDto, AmenityCategory } from '../api/types';
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
          Technology (TECH)
        </Badge>
      );
    case 'SPACE':
      return (
        <Badge
          variant='secondary'
          className='bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[11px] font-medium gap-1'
        >
          <Building2 className='size-3' />
          Space & Facility (SPACE)
        </Badge>
      );
    case 'COMFORT':
      return (
        <Badge
          variant='secondary'
          className='bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[11px] font-medium gap-1'
        >
          <CoffeeIcon className='size-3' />
          Hospitality (COMFORT)
        </Badge>
      );
    default:
      return <Badge variant='outline'>{category}</Badge>;
  }
}

export function AdminAmenitiesView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingAmenity, setEditingAmenity] = useState<AmenityDto | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAmenity, setDeletingAmenity] = useState<AmenityDto | null>(null);

  const filterParams = useMemo(() => {
    return {
      search: searchQuery.trim() || undefined,
      category:
        selectedCategory !== 'ALL'
          ? (selectedCategory as AmenityCategory)
          : undefined,
      active:
        selectedStatus === 'ACTIVE'
          ? true
          : selectedStatus === 'INACTIVE'
          ? false
          : undefined,
      size: 100 // Admin catalog full list
    };
  }, [searchQuery, selectedCategory, selectedStatus]);

  const {
    data: pageData,
    isLoading,
    isFetching,
    refetch
  } = useQuery(amenityQueries.adminList(filterParams));

  const toggleMutation = useToggleAmenityStatusMutation();

  const amenities = useMemo(() => {
    if (!pageData) return [];
    return pageData.listObjects || [];
  }, [pageData]);

  // KPI Quick Stats
  const stats = useMemo(() => {
    const total = amenities.length;
    const active = amenities.filter((a) => a.active).length;
    const inactive = total - active;
    const tech = amenities.filter((a) => a.category === 'TECH').length;
    const space = amenities.filter((a) => a.category === 'SPACE').length;
    const comfort = amenities.filter((a) => a.category === 'COMFORT').length;
    return { total, active, inactive, tech, space, comfort };
  }, [amenities]);

  const handleOpenCreate = () => {
    setEditingAmenity(null);
    setFormDialogOpen(true);
  };

  const handleOpenEdit = (item: AmenityDto) => {
    setEditingAmenity(item);
    setFormDialogOpen(true);
  };

  const handleOpenDelete = (item: AmenityDto) => {
    setDeletingAmenity(item);
    setDeleteDialogOpen(true);
  };

  const handleToggle = (item: AmenityDto) => {
    toggleMutation.mutate({
      id: item.id,
      active: !item.active
    });
  };

  return (
    <div className='flex flex-col min-h-screen pb-12 min-w-0 w-full space-y-6'>
      {/* Page Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <Badge variant='outline' className='text-[10px] uppercase font-mono tracking-wider text-muted-foreground'>
              A19 — System Catalog
            </Badge>
          </div>
          <h1 className='text-2xl font-bold tracking-tight text-foreground font-heading'>
            Amenities Catalog Management
          </h1>
          <p className='text-xs sm:text-sm text-muted-foreground mt-0.5'>
            Manage platform-wide workspace equipment, hospitality amenities, and toggle visibility for organizers and customers.
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            disabled={isFetching}
            className='gap-1.5 text-xs'
          >
            <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size='sm'
            onClick={handleOpenCreate}
            className='gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
          >
            <Plus className='size-4' />
            <span>Add Amenity</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'>
        <div className='p-3.5 rounded-xl border bg-card/60 backdrop-blur'>
          <span className='text-[11px] font-medium text-muted-foreground flex items-center gap-1.5'>
            <Layers className='size-3.5' /> Total Amenities
          </span>
          <p className='text-xl font-bold mt-1 text-foreground'>{stats.total}</p>
        </div>

        <div className='p-3.5 rounded-xl border bg-card/60 backdrop-blur'>
          <span className='text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5'>
            <CheckCircle2 className='size-3.5' /> Active
          </span>
          <p className='text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400'>
            {stats.active}
          </p>
        </div>

        <div className='p-3.5 rounded-xl border bg-card/60 backdrop-blur'>
          <span className='text-[11px] font-medium text-muted-foreground flex items-center gap-1.5'>
            <XCircle className='size-3.5' /> Deactivated
          </span>
          <p className='text-xl font-bold mt-1 text-muted-foreground'>{stats.inactive}</p>
        </div>

        <div className='p-3.5 rounded-xl border bg-card/60 backdrop-blur'>
          <span className='text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5'>
            <Cpu className='size-3.5' /> Technology
          </span>
          <p className='text-xl font-bold mt-1 text-foreground'>{stats.tech}</p>
        </div>

        <div className='p-3.5 rounded-xl border bg-card/60 backdrop-blur'>
          <span className='text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5'>
            <Building2 className='size-3.5' /> Facility
          </span>
          <p className='text-xl font-bold mt-1 text-foreground'>{stats.space}</p>
        </div>

        <div className='p-3.5 rounded-xl border bg-card/60 backdrop-blur'>
          <span className='text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5'>
            <CoffeeIcon className='size-3.5' /> Hospitality
          </span>
          <p className='text-xl font-bold mt-1 text-foreground'>{stats.comfort}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card/50'>
        <div className='relative flex-1 max-w-sm'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
          <Input
            placeholder='Search amenities by name, description...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='pl-9 text-xs h-9'
          />
        </div>

        <div className='flex items-center gap-2 flex-wrap'>
          <div className='flex items-center gap-1.5'>
            <Filter className='size-3.5 text-muted-foreground' />
            <span className='text-xs text-muted-foreground'>Category:</span>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className='w-[150px] text-xs h-9'>
                <SelectValue placeholder='All' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>All Categories</SelectItem>
                <SelectItem value='TECH'>Technology (TECH)</SelectItem>
                <SelectItem value='SPACE'>Space & Facility (SPACE)</SelectItem>
                <SelectItem value='COMFORT'>Hospitality (COMFORT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex items-center gap-1.5'>
            <span className='text-xs text-muted-foreground'>Status:</span>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className='w-[130px] text-xs h-9'>
                <SelectValue placeholder='All' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='ALL'>All Statuses</SelectItem>
                <SelectItem value='ACTIVE'>Active</SelectItem>
                <SelectItem value='INACTIVE'>Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className='rounded-xl border bg-card overflow-hidden shadow-2xs'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/30 hover:bg-muted/30'>
              <TableHead className='w-[60px] text-center'>Icon</TableHead>
              <TableHead className='w-[240px]'>Amenity Name</TableHead>
              <TableHead className='w-[200px]'>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className='w-[150px] text-center'>Status</TableHead>
              <TableHead className='w-[110px] text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className='h-32 text-center text-muted-foreground'>
                  <div className='flex items-center justify-center gap-2'>
                    <Loader2 className='size-4 animate-spin' />
                    <span className='text-xs'>Loading amenities catalog...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : amenities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className='h-32 text-center text-muted-foreground'>
                  <p className='text-sm font-medium'>No amenities found</p>
                  <p className='text-xs mt-1 text-muted-foreground'>
                    {searchQuery ? 'Try searching with a different keyword' : 'No amenities registered in the catalog yet'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              amenities.map((item) => (
                <TableRow key={item.id} className='hover:bg-muted/30 transition-colors'>
                  {/* Icon */}
                  <TableCell className='text-center'>
                    <div className='size-8 rounded-lg bg-muted flex items-center justify-center mx-auto text-muted-foreground'>
                      {renderAmenityIcon(item.icon)}
                    </div>
                  </TableCell>

                  {/* Name */}
                  <TableCell className='font-medium text-foreground text-xs sm:text-sm'>
                    <div className='flex flex-col'>
                      <span>{item.name}</span>
                      <span className='text-[10px] font-mono text-muted-foreground'>ID: #{item.id}</span>
                    </div>
                  </TableCell>

                  {/* Category */}
                  <TableCell>{getCategoryBadge(item.category)}</TableCell>

                  {/* Description */}
                  <TableCell className='text-xs text-muted-foreground max-w-md truncate'>
                    {item.description || '—'}
                  </TableCell>

                  {/* Active Switch Toggle */}
                  <TableCell className='text-center'>
                    <div className='flex items-center justify-center gap-2'>
                      <Switch
                        checked={item.active}
                        onCheckedChange={() => handleToggle(item)}
                        disabled={toggleMutation.isPending}
                      />
                      <span
                        className={`text-[11px] font-medium ${
                          item.active
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {item.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className='text-right'>
                    <div className='flex items-center justify-end gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleOpenEdit(item)}
                        title='Edit Amenity'
                        className='size-8 text-muted-foreground hover:text-foreground'
                      >
                        <Pencil className='size-3.5' />
                      </Button>

                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => handleOpenDelete(item)}
                        title='Delete Amenity'
                        className='size-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10'
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
      </div>

      {/* Dialog Form Create / Edit */}
      <AmenityFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        amenity={editingAmenity}
      />

      {/* Dialog Confirmation Delete */}
      <AmenityDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        amenity={deletingAmenity}
      />
    </div>
  );
}

