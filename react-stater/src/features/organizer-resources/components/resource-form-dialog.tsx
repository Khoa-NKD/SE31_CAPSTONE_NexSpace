import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ResourceItem, ResourceType, ZoneId } from '../types';

interface ResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceToEdit: ResourceItem | null;
  onSave: (resource: ResourceItem) => void;
}

interface ResourceFormContentProps {
  resourceToEdit: ResourceItem | null;
  onSave: (resource: ResourceItem) => void;
  onClose: () => void;
}

function ResourceFormContent({
  resourceToEdit,
  onSave,
  onClose
}: ResourceFormContentProps) {
  const isEditing = !!resourceToEdit;

  const [code, setCode] = useState(resourceToEdit?.code ?? '');
  const [subLabel, setSubLabel] = useState(resourceToEdit?.subLabel ?? '');
  const [type, setType] = useState<ResourceType>(resourceToEdit?.type ?? 'HOT_DESK');
  const [zone, setZone] = useState<ZoneId>(resourceToEdit?.zone ?? 'ZONE_A');
  const [capacity, setCapacity] = useState(resourceToEdit?.capacity ?? 1);
  const [hourlyRate, setHourlyRate] = useState(resourceToEdit?.hourlyRate ?? 2.5);
  const [dailyRate, setDailyRate] = useState(resourceToEdit?.dailyRate ?? 18.0);
  const [amenitiesInput, setAmenitiesInput] = useState(
    resourceToEdit
      ? resourceToEdit.amenities.map((a) => a.name).join(', ')
      : 'Ergonomic Chair, Power Socket'
  );
  const [isBookable, setIsBookable] = useState(
    resourceToEdit ? resourceToEdit.status === 'BOOKABLE' : true
  );
  const [warningNote, setWarningNote] = useState(resourceToEdit?.warningNote ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const zoneLabel =
      zone === 'ZONE_A'
        ? 'Zone A — Quiet Focus'
        : zone === 'ZONE_B'
          ? 'Zone B — Collaborative Hub'
          : 'Zone C — Executive Suites';

    const capacityLabel = capacity === 1 ? '1 Person' : `${capacity} People`;

    const amenities = amenitiesInput
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((name) => ({ name }));

    const resourceItem: ResourceItem = {
      id: resourceToEdit ? resourceToEdit.id : `res-${Date.now()}`,
      code: code.trim().toUpperCase(),
      subLabel: subLabel.trim() || undefined,
      type,
      zone,
      zoneLabel,
      capacity,
      capacityLabel,
      hourlyRate: Number(hourlyRate) || 0,
      dailyRate: Number(dailyRate) || 0,
      amenities,
      status: isBookable ? 'BOOKABLE' : 'DISABLED',
      warningNote: warningNote.trim() || undefined
    };

    onSave(resourceItem);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4 py-2 text-xs'>
      {/* Row 1: Code & SubLabel */}
      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-1.5'>
          <Label htmlFor='res-code' className='text-xs font-semibold'>
            Resource Code *
          </Label>
          <Input
            id='res-code'
            placeholder='e.g. DESK-A09'
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className='h-9 font-mono uppercase text-xs'
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='res-sublabel' className='text-xs font-semibold'>
            Sub-label / Hardware RFID
          </Label>
          <Input
            id='res-sublabel'
            placeholder='e.g. RFID #88225'
            value={subLabel}
            onChange={(e) => setSubLabel(e.target.value)}
            className='h-9 text-xs'
          />
        </div>
      </div>

      {/* Row 2: Type & Zone */}
      <div className='grid grid-cols-2 gap-3'>
        <div className='space-y-1.5'>
          <Label className='text-xs font-semibold'>Resource Type</Label>
          <Select value={type} onValueChange={(val) => setType(val as ResourceType)}>
            <SelectTrigger className='h-9 text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='HOT_DESK' className='text-xs'>Hot Desk</SelectItem>
              <SelectItem value='DEDICATED_DESK' className='text-xs'>Dedicated Desk</SelectItem>
              <SelectItem value='MEETING_ROOM' className='text-xs'>Meeting Room</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-1.5'>
          <Label className='text-xs font-semibold'>Zone &amp; Location</Label>
          <Select value={zone} onValueChange={(val) => setZone(val as ZoneId)}>
            <SelectTrigger className='h-9 text-xs'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ZONE_A' className='text-xs'>Zone A — Quiet Focus</SelectItem>
              <SelectItem value='ZONE_B' className='text-xs'>Zone B — Collaborative Hub</SelectItem>
              <SelectItem value='ZONE_C' className='text-xs'>Zone C — Executive Suites</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 3: Capacity, Hourly & Daily Rates */}
      <div className='grid grid-cols-3 gap-3'>
        <div className='space-y-1.5'>
          <Label htmlFor='res-cap' className='text-xs font-semibold'>
            Capacity (People)
          </Label>
          <Input
            id='res-cap'
            type='number'
            min={1}
            max={50}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            className='h-9 text-xs'
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='res-hourly' className='text-xs font-semibold'>
            Hourly Rate ($)
          </Label>
          <Input
            id='res-hourly'
            type='number'
            step='0.1'
            min={0}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Number(e.target.value))}
            className='h-9 text-xs'
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='res-daily' className='text-xs font-semibold'>
            Daily Rate ($)
          </Label>
          <Input
            id='res-daily'
            type='number'
            step='0.5'
            min={0}
            value={dailyRate}
            onChange={(e) => setDailyRate(Number(e.target.value))}
            className='h-9 text-xs'
          />
        </div>
      </div>

      {/* Row 4: Amenities Tags */}
      <div className='space-y-1.5'>
        <Label htmlFor='res-amenities' className='text-xs font-semibold'>
          Amenities &amp; Hardware (Comma separated)
        </Label>
        <Input
          id='res-amenities'
          placeholder='e.g. Ergonomic Chair, Dual 27" 4K, Motorized Desk'
          value={amenitiesInput}
          onChange={(e) => setAmenitiesInput(e.target.value)}
          className='h-9 text-xs'
        />
      </div>

      {/* Row 5: Warning / Maintenance Note */}
      <div className='space-y-1.5'>
        <Label htmlFor='res-warning' className='text-xs font-semibold'>
          Maintenance Note (Optional)
        </Label>
        <Input
          id='res-warning'
          placeholder='e.g. Port damaged, Pending hardware check'
          value={warningNote}
          onChange={(e) => setWarningNote(e.target.value)}
          className='h-9 text-xs'
        />
      </div>

      {/* Row 6: Bookable Status Toggle */}
      <div className='flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40'>
        <div>
          <p className='text-xs font-semibold text-foreground'>Bookable Status</p>
          <p className='text-[11px] text-muted-foreground'>
            Enable to permit instant booking by coworking members.
          </p>
        </div>
        <Switch
          checked={isBookable}
          onCheckedChange={setIsBookable}
          aria-label='Toggle bookable status'
        />
      </div>

      <DialogFooter className='pt-2 gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onClose}
          className='text-xs'
        >
          Cancel
        </Button>
        <Button type='submit' size='sm' className='text-xs font-semibold'>
          {isEditing ? 'Save Changes' : 'Create Resource'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function ResourceFormDialog({
  open,
  onOpenChange,
  resourceToEdit,
  onSave
}: ResourceFormDialogProps) {
  const isEditing = !!resourceToEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[520px] max-h-[90vh] overflow-y-auto p-5'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold'>
            {isEditing ? `Edit Resource: ${resourceToEdit.code}` : 'Add New Resource'}
          </DialogTitle>
          <DialogDescription className='text-xs'>
            {isEditing
              ? 'Update specifications, pricing, hardware tags and operational status.'
              : 'Add a new bookable desk, private cabin, pod, or meeting room to Floor 12.'}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <ResourceFormContent
            key={resourceToEdit?.id ?? 'new-resource'}
            resourceToEdit={resourceToEdit}
            onSave={onSave}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

