import React, { useState, useMemo } from 'react';
import {
  Lock,
  DoorClosed,
  Calendar,
  Clock,
  Timer,
  Tag,
  FileText,
  BellRing
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  BlockoutTargetResource,
  BlockoutReason,
  BlockoutEvent
} from '../types';

interface BlockoutCreationFormProps {
  availableResources: BlockoutTargetResource[];
  onSubmitBlockout: (newEvent: Omit<BlockoutEvent, 'id'>) => void;
}

const REASONS: BlockoutReason[] = [
  'Facility Maintenance',
  'Private Enterprise Event',
  'Holiday Closure',
  'Deep Cleaning & Sanitation',
  'Network & Electrical Upgrade'
];

export function BlockoutCreationForm({
  availableResources,
  onSubmitBlockout
}: BlockoutCreationFormProps) {
  const [selectedResourceId, setSelectedResourceId] = useState<string>(
    availableResources[0]?.id || 'res-meet-c01'
  );

  const [startDate, setStartDate] = useState<string>('2026-01-26');
  const [startTime, setStartTime] = useState<string>('13:00');
  const [endDate, setEndDate] = useState<string>('2026-01-26');
  const [endTime, setEndTime] = useState<string>('17:00');

  const [reason, setReason] = useState<BlockoutReason>('Facility Maintenance');
  const [memo, setMemo] = useState<string>(
    'Annual HVAC overhaul & air quality filter certification by Daikin Team.'
  );
  const [autoNotify, setAutoNotify] = useState<boolean>(true);

  // Compute duration in hours between start and end
  const durationHours = useMemo(() => {
    try {
      const start = new Date(`${startDate}T${startTime}`);
      const end = new Date(`${endDate}T${endTime}`);
      const diffMs = end.getTime() - start.getTime();
      const diffHrs = diffMs / (1000 * 60 * 60);
      return Math.max(0.5, Number(diffHrs.toFixed(1)));
    } catch {
      return 4.0;
    }
  }, [startDate, startTime, endDate, endTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const resource =
      availableResources.find((r) => r.id === selectedResourceId) || availableResources[0];

    const startH = Number(startTime.split(':')[0]) + Number(startTime.split(':')[1] || 0) / 60;
    const endH = Number(endTime.split(':')[0]) + Number(endTime.split(':')[1] || 0) / 60;

    const slotType =
      reason === 'Private Enterprise Event' ? 'PRIVATE_EVENT' : 'MAINTENANCE_DOWNTIME';

    const newEvent: Omit<BlockoutEvent, 'id'> = {
      title: reason,
      subtitle: memo ? memo.slice(0, 40) + '...' : resource.name,
      type: slotType,
      resourceId: resource.id,
      resourceName: resource.name,
      floor: resource.floor,
      dayOfWeek: new Date(startDate).getDay() === 0 ? 6 : new Date(startDate).getDay() - 1,
      dateDisplay: startDate,
      startHour: startH,
      endHour: endH,
      startTimeDisplay: startTime,
      endTimeDisplay: endTime,
      durationHours,
      reason,
      memo,
      attendeesOrTeam: autoNotify ? 'Auto-notified Bookers' : 'Standard Team',
      status: 'UPCOMING'
    };

    onSubmitBlockout(newEvent);
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-xs p-5 sm:p-6 select-none">
      <div className="border-b border-border pb-4 mb-5">
        <h2 className="text-base font-bold text-foreground tracking-tight">
          Block Time Slot for Maintenance or Events
        </h2>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Selected resource will be strictly locked and hidden from marketplace search.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Target Resource */}
        <div>
          <Label htmlFor="target-resource" className="text-xs font-medium text-foreground mb-1.5 block">
            Target Resource
          </Label>
          <div className="relative">
            <Select value={selectedResourceId} onValueChange={setSelectedResourceId}>
              <SelectTrigger id="target-resource" className="h-10 text-xs bg-background pl-9">
                <DoorClosed className="w-4 h-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                <SelectValue placeholder="Select Target Resource" />
              </SelectTrigger>
              <SelectContent>
                {availableResources.map((res) => (
                  <SelectItem key={res.id} value={res.id} className="text-xs">
                    {res.name} ({res.capacityLabel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 2 & 3. Start and End Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Start DateTime */}
          <div>
            <Label htmlFor="start-date" className="text-xs font-medium text-foreground mb-1.5 block">
              Start Date & Time
            </Label>
            <div className="grid grid-cols-5 gap-1.5">
              <div className="col-span-3 relative">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-3 pointer-events-none" />
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 pl-8 pr-1 text-xs bg-background"
                />
              </div>
              <div className="col-span-2 relative">
                <Clock className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-3 pointer-events-none" />
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-10 pl-7 pr-1 text-xs bg-background"
                  aria-label="Start time"
                />
              </div>
            </div>
          </div>

          {/* End DateTime */}
          <div>
            <Label htmlFor="end-date" className="text-xs font-medium text-foreground mb-1.5 block">
              End Date & Time
            </Label>
            <div className="grid grid-cols-5 gap-1.5">
              <div className="col-span-3 relative">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-3 pointer-events-none" />
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 pl-8 pr-1 text-xs bg-background"
                />
              </div>
              <div className="col-span-2 relative">
                <Clock className="w-3.5 h-3.5 text-muted-foreground absolute left-2 top-3 pointer-events-none" />
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="h-10 pl-7 pr-1 text-xs bg-background"
                  aria-label="End time"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. Duration Calculation Helper Chip */}
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg">
          <Timer className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs text-primary font-semibold">
            Total Blockout: {durationHours} Hours{' '}
            <span className="font-normal text-muted-foreground">(Standard operating window)</span>
          </span>
        </div>

        {/* 5. Reason Dropdown */}
        <div>
          <Label htmlFor="blockout-reason" className="text-xs font-medium text-foreground mb-1.5 block">
            Blockout Reason
          </Label>
          <div className="relative">
            <Select value={reason} onValueChange={(v) => setReason(v as BlockoutReason)}>
              <SelectTrigger id="blockout-reason" className="h-10 text-xs bg-background pl-9">
                <Tag className="w-4 h-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                <SelectValue placeholder="Select Reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 6. Internal Memo */}
        <div>
          <Label htmlFor="blockout-memo" className="text-xs font-medium text-foreground mb-1.5 block">
            Internal Memo{' '}
            <span className="text-muted-foreground font-normal">(Visible to operations staff)</span>
          </Label>
          <div className="relative">
            <Textarea
              id="blockout-memo"
              rows={2}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Add notes regarding contractor, order number, or access cards..."
              className="text-xs bg-background resize-none"
            />
            <FileText className="w-3.5 h-3.5 text-muted-foreground/60 absolute right-3 bottom-3 pointer-events-none" />
          </div>
        </div>

        {/* 7. Toggle: Auto-notify affected or pending requests */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-col">
            <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5 text-primary" />
              Auto-notify affected requests
            </span>
            <span className="text-[11px] text-muted-foreground">
              Instantly alert pending bookers via email & SMS
            </span>
          </div>

          <Switch
            checked={autoNotify}
            onCheckedChange={setAutoNotify}
            aria-label="Toggle auto-notify affected requests"
          />
        </div>

        {/* Primary Submit CTA */}
        <div className="pt-2">
          <Button
            type="submit"
            className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Lock className="w-4 h-4" />
            <span>Block Time Slot</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

