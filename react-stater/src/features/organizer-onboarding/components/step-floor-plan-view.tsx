import React, { useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import {
  Layers,
  Plus,
  Grid,
  Ruler,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Upload,
  Download,
  Trash2,
  Settings2,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Check,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useWizardStore } from '../store/wizard-store';
import type { FloorItem, ZoneItem } from '../types/wizard';

const ZONE_COLORS = [
  { name: 'Ocean Blue', hex: '#3B82F6', ring: 'ring-blue-200' },
  { name: 'Amber Gold', hex: '#F59E0B', ring: 'ring-amber-200' },
  { name: 'Royal Purple', hex: '#8B5CF6', ring: 'ring-purple-200' },
  { name: 'Emerald Green', hex: '#10B981', ring: 'ring-emerald-200' },
  { name: 'Rose Pink', hex: '#F43F5E', ring: 'ring-rose-200' },
  { name: 'Indigo Slate', hex: '#6366F1', ring: 'ring-indigo-200' }
];

export function StepFloorPlanView() {
  const router = useRouter();
  const {
    basicInfo,
    location,
    floorPlan,
    setSelectedFloor,
    addFloor,
    removeFloor,
    addZone,
    updateZone,
    removeZone,
    setFloorPlanSettings,
    saveDraft
  } = useWizardStore();

  const { selectedFloorId, floors, zones, gridSnap, showDimensions, zoomLevel } = floorPlan;

  const activeFloor = floors.find((f) => f.id === selectedFloorId) || floors[0];
  const activeFloorZones = zones.filter((z) => z.floorId === activeFloor?.id);

  // Selected Zone in UI
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(activeFloorZones[0]?.id || null);

  // Modals state
  const [isNewFloorOpen, setIsNewFloorOpen] = useState(false);
  const [isNewZoneOpen, setIsNewZoneOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneItem | null>(null);
  const [deletingFloorId, setDeletingFloorId] = useState<string | null>(null);
  const [deletingZoneId, setDeletingZoneId] = useState<string | null>(null);
  const [isCadModalOpen, setIsCadModalOpen] = useState(false);

  // Form states for New Floor
  const [floorForm, setFloorForm] = useState({
    number: (floors[floors.length - 1]?.number || 12) + 1,
    name: '',
    subtitle: '',
    usableAreaSqm: 450,
    capacity: 60
  });

  // Form states for New/Edit Zone
  const [zoneForm, setZoneForm] = useState<Partial<ZoneItem>>({
    name: '',
    code: '',
    type: 'quiet_focus',
    color: '#3B82F6',
    baseHourlyRate: 3.0,
    areaSqm: 150,
    capacity: 20,
    amenities: ['Ergonomic Chairs']
  });

  // Handle Floor addition
  const handleCreateFloor = () => {
    if (!floorForm.name.trim()) {
      toast.error('Please enter a floor name');
      return;
    }
    const newFloorId = `floor-${floorForm.number}-${Date.now().toString().slice(-4)}`;
    const newFloor: FloorItem = {
      id: newFloorId,
      number: floorForm.number,
      name: `Floor ${floorForm.number} — ${floorForm.name}`,
      subtitle: `${floorForm.usableAreaSqm} m² Usable • ${floorForm.capacity} Capacity`,
      usableAreaSqm: floorForm.usableAreaSqm,
      capacity: floorForm.capacity,
      status: 'active'
    };
    addFloor(newFloor);
    setIsNewFloorOpen(false);
    setFloorForm({
      number: floorForm.number + 1,
      name: '',
      subtitle: '',
      usableAreaSqm: 450,
      capacity: 60
    });
    toast.success(`Created Floor ${floorForm.number}`);
  };

  // Handle Zone addition/editing
  const handleSaveZone = () => {
    if (!zoneForm.name?.trim() || !zoneForm.code?.trim()) {
      toast.error('Please provide a zone name and identification code');
      return;
    }

    if (editingZone) {
      updateZone(editingZone.id, zoneForm);
      toast.success(`Updated ${zoneForm.name}`);
      setEditingZone(null);
    } else {
      const newZoneId = `zone-${Date.now().toString().slice(-6)}`;
      const newZone: ZoneItem = {
        id: newZoneId,
        name: zoneForm.name,
        code: zoneForm.code,
        floorId: activeFloor.id,
        type: zoneForm.type || 'quiet_focus',
        color: zoneForm.color || '#3B82F6',
        baseHourlyRate: Number(zoneForm.baseHourlyRate) || 2.5,
        areaSqm: Number(zoneForm.areaSqm) || 120,
        capacity: Number(zoneForm.capacity) || 20,
        occupiedCount: 0,
        amenities: zoneForm.amenities || ['Ergonomic Chairs'],
        polygonPoints: '100,50 300,50 300,400 100,400'
      };
      addZone(newZone);
      setSelectedZoneId(newZoneId);
      toast.success(`Added ${newZone.name}`);
    }
    setIsNewZoneOpen(false);
  };

  const handleOpenEditZone = (zone: ZoneItem) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      code: zone.code,
      type: zone.type,
      color: zone.color,
      baseHourlyRate: zone.baseHourlyRate,
      areaSqm: zone.areaSqm,
      capacity: zone.capacity,
      amenities: [...zone.amenities]
    });
    setIsNewZoneOpen(true);
  };

  const handleZoom = (delta: number) => {
    const next = Math.min(200, Math.max(50, zoomLevel + delta));
    setFloorPlanSettings({ zoomLevel: next });
  };

  const handleSaveAndExport = () => {
    saveDraft();
    toast.success('Floor Plan Blueprint Exported', {
      description: 'Architectural schematic CAD/SVG vectors compiled for review.'
    });
  };

  const handleProceedToReview = () => {
    saveDraft();
    toast.success('Floor Plan draft saved successfully', {
      description: 'Proceeding to Pre-submission Review Checklist (O15).'
    });
    router.navigate({ to: '/dashboard/organizer/workspaces/create/review' });
  };

  return (
    <div className='flex flex-col min-h-[calc(100vh-4rem)] bg-background text-foreground select-none'>
      {/* Sub-Header / Breadcrumbs & Live Status */}
      <div className='px-4 sm:px-8 pt-4 pb-2 border-b border-border bg-card/60 backdrop-blur-xs'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs'>
          <nav aria-label='Breadcrumb' className='flex items-center gap-1.5 text-muted-foreground truncate'>
            <span className='hover:text-foreground transition-colors'>Workspaces</span>
            <span>&gt;</span>
            <span className='truncate'>{location.district || 'District 1, HCMC'}</span>
            <span>&gt;</span>
            <span className='font-medium text-foreground truncate'>{basicInfo.name}</span>
            <span>&gt;</span>
            <span className='font-bold text-indigo-600 dark:text-indigo-400'>Floor Plan &amp; Zones (O10)</span>
          </nav>
          <div className='flex items-center gap-2'>
            <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium'>
              <span className='size-1.5 rounded-full bg-emerald-500 animate-pulse' />
              <span>Live Sync Active</span>
            </span>
          </div>
        </div>
      </div>

      {/* Floor Switcher & Blueprint Controls Bar */}
      <div className='px-4 sm:px-8 py-3 bg-card border-b border-border flex flex-wrap items-center justify-between gap-3'>
        {/* Left: Floor Selector & Pills */}
        <div className='flex flex-wrap items-center gap-2.5'>
          {/* Floor Selector Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='outline'
                className='flex items-center gap-2.5 h-10 px-3 bg-muted/40 border-border hover:bg-muted font-medium text-xs sm:text-sm'
              >
                <Layers className='size-4 text-indigo-600 dark:text-indigo-400 shrink-0' />
                <div className='flex flex-col text-left'>
                  <span className='font-semibold text-foreground leading-tight truncate max-w-[160px] sm:max-w-[240px]'>
                    {activeFloor?.name || 'Select Floor'}
                  </span>
                  <span className='text-[10px] text-muted-foreground leading-tight'>
                    {activeFloor?.subtitle || `${activeFloor?.usableAreaSqm || 0} m² Usable`}
                  </span>
                </div>
                <ChevronDown className='size-3.5 text-muted-foreground ml-1' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='start' className='w-64'>
              {floors.map((fl) => (
                <DropdownMenuItem
                  key={fl.id}
                  onClick={() => {
                    setSelectedFloor(fl.id);
                    const floorZones = zones.filter((z) => z.floorId === fl.id);
                    setSelectedZoneId(floorZones[0]?.id || null);
                  }}
                  className='flex items-center justify-between py-2 text-xs'
                >
                  <div className='flex flex-col'>
                    <span className='font-semibold text-foreground'>{fl.name}</span>
                    <span className='text-[11px] text-muted-foreground'>{fl.subtitle}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    {fl.id === selectedFloorId && (
                      <Check className='size-4 text-indigo-600 dark:text-indigo-400 shrink-0' />
                    )}
                    {floors.length > 1 && (
                      <button
                        type='button'
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingFloorId(fl.id);
                        }}
                        className='p-1 hover:text-red-600 text-muted-foreground'
                        title='Delete Floor'
                      >
                        <Trash2 className='size-3.5' />
                      </button>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Floor Switcher Pills */}
          <div className='hidden md:flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border text-xs'>
            {floors.map((fl) => (
              <button
                key={fl.id}
                type='button'
                onClick={() => {
                  setSelectedFloor(fl.id);
                  const floorZones = zones.filter((z) => z.floorId === fl.id);
                  setSelectedZoneId(floorZones[0]?.id || null);
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  fl.id === selectedFloorId
                    ? 'bg-card text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Floor {fl.number}
              </button>
            ))}
          </div>

          {/* Add Floor Button */}
          <Button
            type='button'
            variant='outline'
            onClick={() => setIsNewFloorOpen(true)}
            className='h-9 px-2.5 text-xs border-dashed border-border hover:border-indigo-500 hover:text-indigo-600 gap-1.5'
          >
            <Plus className='size-3.5' />
            <span>New Floor</span>
          </Button>
        </div>

        {/* Right Blueprint Controls */}
        <div className='flex items-center gap-2 sm:gap-3'>
          {/* View Toggles */}
          <div className='flex items-center gap-1 bg-muted/40 border border-border p-0.5 rounded-lg text-xs'>
            <button
              type='button'
              onClick={() => setFloorPlanSettings({ gridSnap: !gridSnap })}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-colors ${
                gridSnap
                  ? 'bg-card text-foreground font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title='Toggle Grid Snapping'
            >
              <Grid className='size-3.5 text-indigo-600 dark:text-indigo-400' />
              <span className='hidden sm:inline'>Grid Snap</span>
            </button>
            <button
              type='button'
              onClick={() => setFloorPlanSettings({ showDimensions: !showDimensions })}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-colors ${
                showDimensions
                  ? 'bg-card text-foreground font-semibold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title='Toggle Dimension Labels'
            >
              <Ruler className='size-3.5' />
              <span className='hidden sm:inline'>Dimensions</span>
            </button>
          </div>

          {/* Zoom Controls */}
          <div className='flex items-center bg-muted/40 border border-border rounded-lg px-2 py-1 gap-1 text-xs'>
            <button
              type='button'
              onClick={() => handleZoom(-10)}
              className='p-1 text-muted-foreground hover:text-foreground'
              title='Zoom Out'
            >
              <ZoomOut className='size-3.5' />
            </button>
            <span className='font-mono font-bold text-[11px] text-foreground min-w-[36px] text-center'>
              {zoomLevel}%
            </span>
            <button
              type='button'
              onClick={() => handleZoom(10)}
              className='p-1 text-muted-foreground hover:text-foreground'
              title='Zoom In'
            >
              <ZoomIn className='size-3.5' />
            </button>
            <div className='h-3 w-[1px] bg-border mx-1' />
            <button
              type='button'
              onClick={() => setFloorPlanSettings({ zoomLevel: 100 })}
              className='p-1 text-muted-foreground hover:text-foreground'
              title='Reset Zoom'
            >
              <Maximize2 className='size-3.5' />
            </button>
          </div>

          {/* Upload CAD / SVG Modal Button */}
          <Button
            type='button'
            variant='outline'
            onClick={() => setIsCadModalOpen(true)}
            className='h-9 px-3 text-xs gap-1.5 border-border hover:bg-muted font-medium'
          >
            <Upload className='size-3.5 text-muted-foreground' />
            <span className='hidden sm:inline'>Upload CAD / SVG</span>
          </Button>
        </div>
      </div>

      {/* Main Workspace Split: 32% Left Zones Stack, 68% Right Blueprint */}
      <main className='flex-1 p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden'>
        {/* ==================== LEFT: ZONE MANAGEMENT PANEL (32-35%) ==================== */}
        <section className='lg:col-span-4 flex flex-col bg-card rounded-xl border border-border shadow-2xs overflow-hidden max-h-[720px]'>
          {/* Panel Header */}
          <div className='p-4 sm:p-5 border-b border-border flex items-start justify-between bg-card shrink-0'>
            <div>
              <div className='flex items-center gap-2'>
                <h2 className='text-sm sm:text-base font-bold text-foreground'>Floor Zones</h2>
                <Badge variant='outline' className='bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold'>
                  {activeFloorZones.length} Configured
                </Badge>
              </div>
              <p className='text-xs text-muted-foreground mt-0.5'>
                Define spatial boundaries and baseline rates
              </p>
            </div>
            <Button
              type='button'
              onClick={() => {
                setEditingZone(null);
                setZoneForm({
                  name: `Zone ${String.fromCharCode(65 + activeFloorZones.length)}`,
                  code: `Z${String.fromCharCode(65 + activeFloorZones.length)}-${activeFloor?.number || 12}`,
                  type: 'quiet_focus',
                  color: ZONE_COLORS[activeFloorZones.length % ZONE_COLORS.length]?.hex || '#3B82F6',
                  baseHourlyRate: 3.0,
                  areaSqm: 160,
                  capacity: 20,
                  amenities: ['Ergonomic Chairs', 'Acoustic Baffles']
                });
                setIsNewZoneOpen(true);
              }}
              className='h-8 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1 shadow-2xs font-medium'
            >
              <Plus className='size-3.5' />
              <span>Add Zone</span>
            </Button>
          </div>

          {/* Zone List (Scrollable Stack) */}
          <div className='flex-1 overflow-y-auto p-4 space-y-3'>
            {activeFloorZones.length === 0 ? (
              <div className='p-8 text-center flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed border-border rounded-xl'>
                <Layers className='size-8 text-muted-foreground/60 mb-2' />
                <p className='font-semibold text-sm text-foreground'>No zones created on this floor</p>
                <p className='text-xs mt-1 max-w-[200px]'>
                  Add functional zones (e.g. Quiet Focus, Team Hub) to organize your workspace layout.
                </p>
              </div>
            ) : (
              activeFloorZones.map((zone) => {
                const isSelected = selectedZoneId === zone.id;
                return (
                  <div
                    key={zone.id}
                    role='button'
                    tabIndex={0}
                    onClick={() => setSelectedZoneId(zone.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedZoneId(zone.id);
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-2 border-indigo-600 dark:border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-2xs'
                        : 'border-border bg-card hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className='flex items-center justify-between mb-2'>
                      <div className='flex items-center gap-2 min-w-0'>
                        <span
                          className='size-3 rounded-full shrink-0'
                          style={{ backgroundColor: zone.color }}
                        />
                        <span className='font-bold text-xs sm:text-sm text-foreground truncate'>
                          {zone.name}
                        </span>
                      </div>
                      <Badge variant='secondary' className='text-[10px] font-semibold shrink-0'>
                        {zone.capacity} Desks / Seats
                      </Badge>
                    </div>

                    {/* Metrics Matrix Grid */}
                    <div className='grid grid-cols-3 gap-2 py-2 my-2 border-y border-border/70 bg-muted/40 rounded-lg px-2.5 text-center'>
                      <div>
                        <span className='block text-[10px] text-muted-foreground'>Base Rate</span>
                        <span className='text-xs font-bold text-foreground'>
                          ${zone.baseHourlyRate.toFixed(2)}
                          <span className='text-muted-foreground font-normal text-[10px]'>/hr</span>
                        </span>
                      </div>
                      <div>
                        <span className='block text-[10px] text-muted-foreground'>Floor Area</span>
                        <span className='text-xs font-bold text-foreground'>{zone.areaSqm} m²</span>
                      </div>
                      <div>
                        <span className='block text-[10px] text-muted-foreground'>Capacity</span>
                        <span className='text-xs font-bold text-emerald-600 dark:text-emerald-400'>
                          {zone.occupiedCount || 0}/{zone.capacity}
                        </span>
                      </div>
                    </div>

                    {/* Amenities Tags */}
                    {zone.amenities.length > 0 && (
                      <div className='flex flex-wrap gap-1 mb-3'>
                        {zone.amenities.map((am) => (
                          <span
                            key={am}
                            className='px-2 py-0.5 rounded-md bg-muted/60 border border-border text-[10px] text-muted-foreground'
                          >
                            {am}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className='flex items-center justify-between pt-1 text-muted-foreground text-xs'>
                      <span className='font-mono text-[11px] font-medium'>
                        Code: {zone.code}
                      </span>
                      <div className='flex items-center gap-1'>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditZone(zone);
                          }}
                          className='p-1.5 hover:text-indigo-600 hover:bg-card rounded transition-colors'
                          title='Edit Zone Details'
                        >
                          <Settings2 className='size-3.5' />
                        </button>
                        <button
                          type='button'
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingZoneId(zone.id);
                          }}
                          className='p-1.5 hover:text-red-600 hover:bg-card rounded transition-colors'
                          title='Delete Zone'
                        >
                          <Trash2 className='size-3.5' />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ==================== RIGHT: ARCHITECTURAL BLUEPRINT (68%) ==================== */}
        <section className='lg:col-span-8 flex flex-col bg-card rounded-xl border border-border shadow-2xs overflow-hidden relative min-h-[500px]'>
          {/* Blueprint SVG Schematic Viewport */}
          <div
            className='flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4'
            style={{
              backgroundImage: gridSnap
                ? 'radial-gradient(var(--border) 1.5px, transparent 1.5px)'
                : 'none',
              backgroundSize: '24px 24px'
            }}
          >
            {/* Architectural SVG Schematic Canvas */}
            <div
              className='relative transition-transform duration-200'
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
            >
              <svg
                width='860'
                height='520'
                viewBox='0 0 860 520'
                className='border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg shadow-sm'
              >
                <defs>
                  <pattern id='deskPattern' width='20' height='20' patternUnits='userSpaceOnUse'>
                    <rect width='16' height='10' rx='2' fill='#E2E8F0' stroke='#94A3B8' strokeWidth='1' />
                    <circle cx='8' cy='15' r='3' fill='#CBD5E1' />
                  </pattern>
                </defs>

                {/* Outer Architectural Perimeter Wall */}
                <rect
                  x='10'
                  y='10'
                  width='840'
                  height='500'
                  rx='8'
                  fill='none'
                  stroke='#334155'
                  strokeWidth='6'
                />
                <rect
                  x='14'
                  y='14'
                  width='832'
                  height='492'
                  rx='6'
                  fill='none'
                  stroke='#94A3B8'
                  strokeWidth='1.5'
                  strokeDasharray='8 4'
                />

                {/* ZONE A POLYGON (Quiet Focus Area) */}
                <g
                  onClick={() => setSelectedZoneId('zone-a')}
                  className='cursor-pointer transition-opacity'
                >
                  <polygon
                    points='20,30 230,30 230,490 20,490'
                    fill='#3B82F6'
                    fillOpacity={selectedZoneId === 'zone-a' ? '0.22' : '0.12'}
                    stroke='#2563EB'
                    strokeWidth={selectedZoneId === 'zone-a' ? '2.5' : '1.5'}
                    strokeDasharray='6 3'
                  />
                  {/* Desks inside Zone A */}
                  <g transform='translate(40, 60)'>
                    {[0, 1, 2, 3].map((row) => (
                      <g key={row} transform={`translate(0, ${row * 90})`}>
                        <rect x='0' y='0' width='60' height='35' rx='3' fill='#EFF6FF' stroke='#3B82F6' strokeWidth='1.5' />
                        <rect x='80' y='0' width='60' height='35' rx='3' fill='#EFF6FF' stroke='#3B82F6' strokeWidth='1.5' />
                        <circle cx='30' cy='45' r='6' fill='#BFDBFE' stroke='#2563EB' strokeWidth='1' />
                        <circle cx='110' cy='45' r='6' fill='#BFDBFE' stroke='#2563EB' strokeWidth='1' />
                      </g>
                    ))}
                  </g>
                </g>

                {/* ZONE B POLYGON (Team Hub Area) */}
                <g
                  onClick={() => setSelectedZoneId('zone-b')}
                  className='cursor-pointer transition-opacity'
                >
                  <polygon
                    points='250,30 530,30 530,490 250,490'
                    fill='#F59E0B'
                    fillOpacity={selectedZoneId === 'zone-b' ? '0.22' : '0.12'}
                    stroke='#D97706'
                    strokeWidth={selectedZoneId === 'zone-b' ? '2.5' : '1.5'}
                    strokeDasharray='6 3'
                  />
                  {/* Collaborative Desks & Pods */}
                  <g transform='translate(280, 80)'>
                    <rect x='0' y='0' width='100' height='70' rx='6' fill='#FFFBEB' stroke='#F59E0B' strokeWidth='1.5' />
                    <circle cx='25' cy='-12' r='6' fill='#FDE68A' stroke='#D97706' strokeWidth='1' />
                    <circle cx='75' cy='-12' r='6' fill='#FDE68A' stroke='#D97706' strokeWidth='1' />
                    <circle cx='25' cy='82' r='6' fill='#FDE68A' stroke='#D97706' strokeWidth='1' />
                    <circle cx='75' cy='82' r='6' fill='#FDE68A' stroke='#D97706' strokeWidth='1' />

                    {/* Circular Discussion Tables */}
                    <circle cx='50' cy='220' r='35' fill='#FFFBEB' stroke='#F59E0B' strokeWidth='1.5' />
                    <circle cx='50' cy='175' r='5' fill='#FDE68A' stroke='#D97706' strokeWidth='1' />
                    <circle cx='50' cy='265' r='5' fill='#FDE68A' stroke='#D97706' strokeWidth='1' />
                    <circle cx='5' cy='220' r='5' fill='#FDE68A' stroke='#D97706' strokeWidth='1' />
                    <circle cx='95' cy='220' r='5' fill='#FDE68A' stroke='#D97706' strokeWidth='1' />
                  </g>
                </g>

                {/* ZONE C POLYGON (Executive Suites) */}
                <g
                  onClick={() => setSelectedZoneId('zone-c')}
                  className='cursor-pointer transition-opacity'
                >
                  <polygon
                    points='550,30 830,30 830,490 550,490'
                    fill='#8B5CF6'
                    fillOpacity={selectedZoneId === 'zone-c' ? '0.22' : '0.12'}
                    stroke='#7C3AED'
                    strokeWidth={selectedZoneId === 'zone-c' ? '2.5' : '1.5'}
                    strokeDasharray='6 3'
                  />
                  {/* Glass Partition Meeting Suites */}
                  <g transform='translate(570, 50)'>
                    <rect x='0' y='0' width='240' height='120' rx='4' fill='#F5F3FF' stroke='#7C3AED' strokeWidth='2' />
                    <rect x='50' y='35' width='140' height='50' rx='12' fill='#EDE9FE' stroke='#8B5CF6' strokeWidth='1.5' />
                    <text x='15' y='22' fill='#6D28D9' fontSize='11' fontWeight='700' fontFamily='sans-serif'>
                      CR-01: Executive Boardroom
                    </text>
                  </g>
                  <g transform='translate(570, 190)'>
                    <rect x='0' y='0' width='240' height='120' rx='4' fill='#F5F3FF' stroke='#7C3AED' strokeWidth='2' />
                    <rect x='60' y='35' width='120' height='50' rx='10' fill='#EDE9FE' stroke='#8B5CF6' strokeWidth='1.5' />
                    <text x='15' y='22' fill='#6D28D9' fontSize='11' fontWeight='700' fontFamily='sans-serif'>
                      CR-02: Strategy Room
                    </text>
                  </g>
                  <g transform='translate(570, 330)'>
                    <rect x='0' y='0' width='240' height='120' rx='4' fill='#F5F3FF' stroke='#7C3AED' strokeWidth='2' />
                    <rect x='70' y='35' width='100' height='50' rx='8' fill='#EDE9FE' stroke='#8B5CF6' strokeWidth='1.5' />
                    <text x='15' y='22' fill='#6D28D9' fontSize='11' fontWeight='700' fontFamily='sans-serif'>
                      CR-03: Media Studio
                    </text>
                  </g>
                </g>

                {/* Central Corridor Marker */}
                <path d='M 180 260 L 530 260' stroke='#94A3B8' strokeWidth='1.5' strokeDasharray='5 5' />
                <text x='280' y='264' fill='#64748B' fontSize='10' fontWeight='700' letterSpacing='1'>
                  MAIN CIRCULATION CORRIDOR
                </text>

                {/* Dimension markers if enabled */}
                {showDimensions && (
                  <g fill='#64748B' fontSize='10' fontFamily='monospace'>
                    <line x1='20' y1='20' x2='830' y2='20' stroke='#64748B' strokeWidth='1' markerEnd='url(#arrow)' />
                    <text x='410' y='16' textAnchor='middle'>38.5 meters Usable Span</text>
                    <line x1='15' y1='30' x2='15' y2='490' stroke='#64748B' strokeWidth='1' />
                    <text x='8' y='260' textAnchor='middle' transform='rotate(-90 8 260)'>24.0 meters</text>
                  </g>
                )}
              </svg>

              {/* Floating Readability Badges on Blueprint */}
              <div className='absolute top-6 left-8 bg-card/95 backdrop-blur-xs px-2.5 py-1 rounded-md border border-blue-300 dark:border-blue-800 shadow-2xs flex items-center gap-1.5 text-xs pointer-events-none'>
                <span className='size-2 rounded-full bg-blue-600' />
                <span className='font-bold text-foreground'>Zone A: Quiet Focus</span>
                <span className='text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1 rounded'>
                  28 Desks
                </span>
              </div>

              <div className='absolute top-6 left-[280px] bg-card/95 backdrop-blur-xs px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-800 shadow-2xs flex items-center gap-1.5 text-xs pointer-events-none'>
                <span className='size-2 rounded-full bg-amber-500' />
                <span className='font-bold text-foreground'>Zone B: Team Hub</span>
                <span className='text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1 rounded'>
                  16 Desks
                </span>
              </div>

              <div className='absolute top-6 right-8 bg-card/95 backdrop-blur-xs px-2.5 py-1 rounded-md border border-purple-300 dark:border-purple-800 shadow-2xs flex items-center gap-1.5 text-xs pointer-events-none'>
                <span className='size-2 rounded-full bg-purple-600' />
                <span className='font-bold text-foreground'>Zone C: Suites</span>
                <span className='text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-1 rounded'>
                  3 Suites
                </span>
              </div>
            </div>

            {/* Bottom-Left: Mini-map Overview */}
            <div className='absolute bottom-4 left-4 bg-card/95 backdrop-blur-xs border border-border p-2 rounded-lg shadow-sm w-28 hidden sm:flex flex-col gap-1'>
              <div className='flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase'>
                <span>Overview</span>
                <span className='text-indigo-600 dark:text-indigo-400'>1:200</span>
              </div>
              <div className='w-full h-12 bg-muted/60 border border-border rounded relative flex items-center justify-center overflow-hidden'>
                <div className='w-20 h-8 border border-muted-foreground/30 rounded-xs relative'>
                  <div className='absolute top-0.5 left-1 w-5 h-3 bg-blue-500/40' />
                  <div className='absolute top-0.5 left-7 w-6 h-3 bg-amber-500/40' />
                  <div className='absolute top-0.5 right-1 w-6 h-6 bg-purple-500/40' />
                  <div className='absolute inset-0 border border-indigo-600 bg-indigo-600/10' />
                </div>
              </div>
            </div>

            {/* Bottom-Right: Scale & Pan Widget */}
            <div className='absolute bottom-4 right-4 bg-card/95 backdrop-blur-xs border border-border px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-3 text-xs text-muted-foreground'>
              <div className='flex items-center gap-1.5'>
                <Ruler className='size-3.5 text-foreground' />
                <span>1 Grid = 1.0 m</span>
              </div>
              <div className='h-3 w-[1px] bg-border' />
              <div className='flex items-center gap-1'>
                <div className='w-8 h-1 bg-foreground rounded-full' />
                <span className='text-[10px] font-mono'>5m</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ==================== BOTTOM STICKY ACTION NAVIGATION BAR ==================== */}
      <footer className='h-16 bg-card border-t border-border px-4 sm:px-8 flex items-center justify-between shrink-0 z-20'>
        {/* Left Secondary Options */}
        <div className='flex items-center gap-2 sm:gap-3'>
          <Button
            type='button'
            variant='outline'
            onClick={() => router.navigate({ to: '/dashboard/organizer/workspaces/create/media' })}
            className='h-10 px-3 sm:px-4 text-xs sm:text-sm font-medium border-border hover:bg-muted gap-1.5'
          >
            <ArrowLeft className='size-4' />
            <span className='hidden sm:inline'>Back to Photos</span>
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={handleSaveAndExport}
            className='h-10 px-3 sm:px-4 text-xs sm:text-sm font-medium border-border hover:bg-muted gap-1.5'
          >
            <Download className='size-4 text-muted-foreground' />
            <span className='hidden md:inline'>Export Blueprint (PDF/DXF)</span>
          </Button>
        </div>

        {/* Right Step Progression & Primary CTA */}
        <div className='flex items-center gap-3 sm:gap-4'>
          <div className='text-right hidden sm:block'>
            <div className='text-xs text-muted-foreground font-medium'>
              Next Step: Pre-submission Review
            </div>
            <div className='text-[11px] text-foreground font-semibold'>
              {zones.reduce((acc, z) => acc + z.capacity, 0)} Desks &amp; Suites mapped
            </div>
          </div>

          <Button
            type='button'
            onClick={handleProceedToReview}
            className='h-11 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all'
          >
            <span>Next Step: Pre-submission Review</span>
            <ArrowRight className='size-4' />
          </Button>
        </div>
      </footer>

      {/* ==================== MODAL: NEW FLOOR ==================== */}
      <Dialog open={isNewFloorOpen} onOpenChange={setIsNewFloorOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Add New Workspace Floor</DialogTitle>
            <DialogDescription>
              Configure an additional structural floor level for {basicInfo.name}.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-3'>
            <div className='grid grid-cols-3 gap-3'>
              <div>
                <Label htmlFor='floor-num' className='text-xs font-semibold'>Floor Number</Label>
                <Input
                  id='floor-num'
                  type='number'
                  value={floorForm.number}
                  onChange={(e) => setFloorForm({ ...floorForm, number: Number(e.target.value) })}
                  className='mt-1 text-xs'
                />
              </div>
              <div className='col-span-2'>
                <Label htmlFor='floor-name' className='text-xs font-semibold'>Floor Name</Label>
                <Input
                  id='floor-name'
                  placeholder='e.g. Executive Suites or Terrace'
                  value={floorForm.name}
                  onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
                  className='mt-1 text-xs'
                />
              </div>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <Label htmlFor='floor-area' className='text-xs font-semibold'>Usable Area (m²)</Label>
                <Input
                  id='floor-area'
                  type='number'
                  value={floorForm.usableAreaSqm}
                  onChange={(e) => setFloorForm({ ...floorForm, usableAreaSqm: Number(e.target.value) })}
                  className='mt-1 text-xs'
                />
              </div>
              <div>
                <Label htmlFor='floor-cap' className='text-xs font-semibold'>Capacity (persons)</Label>
                <Input
                  id='floor-cap'
                  type='number'
                  value={floorForm.capacity}
                  onChange={(e) => setFloorForm({ ...floorForm, capacity: Number(e.target.value) })}
                  className='mt-1 text-xs'
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsNewFloorOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateFloor} className='bg-indigo-600 hover:bg-indigo-700 text-white'>
              Create Floor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== MODAL: ADD / EDIT ZONE ==================== */}
      <Dialog open={isNewZoneOpen} onOpenChange={setIsNewZoneOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{editingZone ? 'Edit Zone Configuration' : 'Add Functional Floor Zone'}</DialogTitle>
            <DialogDescription>
              Define the boundaries, baseline hourly rate, and target occupancy for this zone.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4 py-3'>
            <div className='grid grid-cols-2 gap-3'>
              <div>
                <Label htmlFor='zone-name' className='text-xs font-semibold'>Zone Public Name</Label>
                <Input
                  id='zone-name'
                  placeholder='e.g. Zone D — Quiet Nook'
                  value={zoneForm.name || ''}
                  onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                  className='mt-1 text-xs'
                />
              </div>
              <div>
                <Label htmlFor='zone-code' className='text-xs font-semibold'>Zone Code / ID</Label>
                <Input
                  id='zone-code'
                  placeholder='e.g. ZD-12'
                  value={zoneForm.code || ''}
                  onChange={(e) => setZoneForm({ ...zoneForm, code: e.target.value })}
                  className='mt-1 text-xs'
                />
              </div>
            </div>

            <div className='grid grid-cols-3 gap-3'>
              <div>
                <Label htmlFor='zone-rate' className='text-xs font-semibold'>Base Rate ($/hr)</Label>
                <Input
                  id='zone-rate'
                  type='number'
                  step='0.25'
                  value={zoneForm.baseHourlyRate ?? 3.0}
                  onChange={(e) => setZoneForm({ ...zoneForm, baseHourlyRate: Number(e.target.value) })}
                  className='mt-1 text-xs'
                />
              </div>
              <div>
                <Label htmlFor='zone-area' className='text-xs font-semibold'>Floor Area (m²)</Label>
                <Input
                  id='zone-area'
                  type='number'
                  value={zoneForm.areaSqm ?? 150}
                  onChange={(e) => setZoneForm({ ...zoneForm, areaSqm: Number(e.target.value) })}
                  className='mt-1 text-xs'
                />
              </div>
              <div>
                <Label htmlFor='zone-cap' className='text-xs font-semibold'>Capacity (Desks)</Label>
                <Input
                  id='zone-cap'
                  type='number'
                  value={zoneForm.capacity ?? 20}
                  onChange={(e) => setZoneForm({ ...zoneForm, capacity: Number(e.target.value) })}
                  className='mt-1 text-xs'
                />
              </div>
            </div>

            {/* Color Palette Selector */}
            <div>
              <Label className='text-xs font-semibold block mb-1.5'>Zone Color Representation</Label>
              <div className='flex items-center gap-2.5'>
                {ZONE_COLORS.map((col) => (
                  <button
                    key={col.hex}
                    type='button'
                    onClick={() => setZoneForm({ ...zoneForm, color: col.hex })}
                    className={`size-7 rounded-full transition-transform flex items-center justify-center ${
                      zoneForm.color === col.hex ? 'ring-2 ring-offset-2 ring-indigo-600 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: col.hex }}
                    title={col.name}
                  >
                    {zoneForm.color === col.hex && <Check className='size-3.5 text-white stroke-[3]' />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsNewZoneOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveZone} className='bg-indigo-600 hover:bg-indigo-700 text-white'>
              {editingZone ? 'Save Changes' : 'Create Zone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== CONFIRM DELETE ZONE ==================== */}
      <Dialog open={!!deletingZoneId} onOpenChange={() => setDeletingZoneId(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-red-600 flex items-center gap-2'>
              <AlertTriangle className='size-5' />
              <span>Confirm Zone Removal</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this zone from Floor {activeFloor?.number}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeletingZoneId(null)}>Cancel</Button>
            <Button
              variant='destructive'
              onClick={() => {
                if (deletingZoneId) {
                  removeZone(deletingZoneId);
                  toast.success('Zone removed from floor');
                  setDeletingZoneId(null);
                }
              }}
            >
              Delete Zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== CONFIRM DELETE FLOOR ==================== */}
      <Dialog open={!!deletingFloorId} onOpenChange={() => setDeletingFloorId(null)}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-red-600 flex items-center gap-2'>
              <AlertTriangle className='size-5' />
              <span>Confirm Floor Deletion</span>
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this floor? All functional zones configured on this floor will also be removed from the draft.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeletingFloorId(null)}>Cancel</Button>
            <Button
              variant='destructive'
              onClick={() => {
                if (deletingFloorId) {
                  removeFloor(deletingFloorId);
                  toast.success('Floor removed from workspace draft');
                  setDeletingFloorId(null);
                }
              }}
            >
              Delete Floor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== CAD / SVG UPLOAD MODAL ==================== */}
      <Dialog open={isCadModalOpen} onOpenChange={setIsCadModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Upload Architectural CAD / SVG</DialogTitle>
            <DialogDescription>
              Import structural vector blueprints in .DWG, .DXF, or layered .SVG format.
            </DialogDescription>
          </DialogHeader>
          <div className='border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/30 my-2'>
            <Upload className='size-10 text-indigo-500 mb-2' />
            <p className='text-xs font-semibold text-foreground'>Drag &amp; drop CAD blueprint file here</p>
            <p className='text-[11px] text-muted-foreground mt-1'>Supports AutoCAD DXF 2020+, SVG Layers (Max 25MB)</p>
            <Button
              variant='outline'
              onClick={() => {
                toast.info('CAD Parser Simulation', {
                  description: 'AutoCAD DXF imported. 3 structural polygons mapped to active floor.'
                });
                setIsCadModalOpen(false);
              }}
              className='mt-4 h-8 text-xs'
            >
              Select Local File
            </Button>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsCadModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
