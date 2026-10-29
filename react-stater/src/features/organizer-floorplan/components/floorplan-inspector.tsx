import React, { useState } from 'react';
import {
  SlidersHorizontal,
  X,
  Plus,
  Copy,
  Trash2,
  DollarSign,
  Maximize2,
  Tag,
  ShieldAlert,
  CalendarCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { FloorplanNode } from '../types';

interface FloorplanInspectorProps {
  selectedNode: FloorplanNode | null;
  onUpdateNode: (updated: FloorplanNode) => void;
  onDeselect: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function FloorplanInspector({
  selectedNode,
  onUpdateNode,
  onDeselect,
  onDuplicate,
  onDelete
}: FloorplanInspectorProps) {
  const [newAmenityText, setNewAmenityText] = useState('');

  if (!selectedNode) {
    return (
      <aside className="w-[350px] shrink-0 border-l border-border bg-card/50 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground mb-3">
          <SlidersHorizontal className="w-5 h-5" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">No Element Selected</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-[240px] leading-relaxed">
          Click on any workstation, meeting room, or spatial element on the canvas to configure
          spatial bounds, pricing, and operational settings.
        </p>
      </aside>
    );
  }

  const handleFieldChange = <K extends keyof FloorplanNode>(key: K, value: FloorplanNode[K]) => {
    onUpdateNode({
      ...selectedNode,
      [key]: value
    });
  };

  const handleAddAmenity = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newAmenityText.trim();
    if (!trimmed || selectedNode.amenities.includes(trimmed)) return;
    handleFieldChange('amenities', [...selectedNode.amenities, trimmed]);
    setNewAmenityText('');
  };

  const handleRemoveAmenity = (amenity: string) => {
    handleFieldChange(
      'amenities',
      selectedNode.amenities.filter((a) => a !== amenity)
    );
  };

  return (
    <aside className="w-[350px] shrink-0 border-l border-border bg-card/60 backdrop-blur-xs flex flex-col h-full select-none">
      {/* Header */}
      <div className="h-14 px-4 border-b border-border/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="font-mono text-xs font-semibold bg-primary/10 text-primary border-primary/20"
          >
            {selectedNode.code}
          </Badge>
          <span className="text-xs font-medium text-foreground truncate max-w-[170px]">
            {selectedNode.displayName}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onDeselect}
          aria-label="Deselect element"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Inspector Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Section 1: Identity & Assignment */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Tag className="w-3.5 h-3.5 text-primary" />
            <span>Identity & Assignment</span>
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="node-code" className="text-[11px] text-muted-foreground">
                  Node Code
                </Label>
                <Input
                  id="node-code"
                  value={selectedNode.code}
                  onChange={(e) => handleFieldChange('code', e.target.value)}
                  className="h-8 font-mono text-xs mt-1"
                />
              </div>
              <div>
                <Label htmlFor="node-rfid" className="text-[11px] text-muted-foreground">
                  RFID / BLE Tag
                </Label>
                <Input
                  id="node-rfid"
                  value={selectedNode.rfidCode || ''}
                  placeholder="e.g. RFID-88219"
                  onChange={(e) => handleFieldChange('rfidCode', e.target.value)}
                  className="h-8 font-mono text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="node-name" className="text-[11px] text-muted-foreground">
                Display Name
              </Label>
              <Input
                id="node-name"
                value={selectedNode.displayName}
                onChange={(e) => handleFieldChange('displayName', e.target.value)}
                className="h-8 text-xs mt-1"
              />
            </div>

            <div>
              <Label htmlFor="node-zone" className="text-[11px] text-muted-foreground">
                Assigned Zone
              </Label>
              <Select
                value={selectedNode.zone}
                onValueChange={(val) => {
                  const zoneKey = val as FloorplanNode['zone'];
                  const labelMap: Record<FloorplanNode['zone'], string> = {
                    ZONE_A: 'Zone A — Quiet Focus Area',
                    ZONE_B: 'Zone B — Team Collab',
                    ZONE_C: 'Zone C — Hot Desk Hub',
                    BOARDROOM: 'Executive Boardroom Alpha',
                    PANTRY: 'Kitchen & Coffee Bar Lounge'
                  };
                  onUpdateNode({
                    ...selectedNode,
                    zone: zoneKey,
                    zoneLabel: labelMap[zoneKey]
                  });
                }}
              >
                <SelectTrigger id="node-zone" className="h-8 text-xs mt-1">
                  <SelectValue placeholder="Select Zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ZONE_A">Zone A — Quiet Focus</SelectItem>
                  <SelectItem value="ZONE_B">Zone B — Team Collab</SelectItem>
                  <SelectItem value="BOARDROOM">Executive Boardroom Alpha</SelectItem>
                  <SelectItem value="PANTRY">Kitchen & Coffee Bar Lounge</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Section 2: Spatial Bounds & Rotation */}
        <div className="space-y-3 pt-3 border-t border-border/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Maximize2 className="w-3.5 h-3.5 text-primary" />
            <span>Spatial Bounds & Transform</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <div>
              <Label className="text-[10px] text-muted-foreground font-mono">X (px)</Label>
              <Input
                type="number"
                value={Math.round(selectedNode.x)}
                onChange={(e) => handleFieldChange('x', Number(e.target.value))}
                className="h-8 text-xs font-mono p-1 text-center"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground font-mono">Y (px)</Label>
              <Input
                type="number"
                value={Math.round(selectedNode.y)}
                onChange={(e) => handleFieldChange('y', Number(e.target.value))}
                className="h-8 text-xs font-mono p-1 text-center"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground font-mono">W (px)</Label>
              <Input
                type="number"
                value={selectedNode.width}
                onChange={(e) => handleFieldChange('width', Number(e.target.value))}
                className="h-8 text-xs font-mono p-1 text-center"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground font-mono">H (px)</Label>
              <Input
                type="number"
                value={selectedNode.height}
                onChange={(e) => handleFieldChange('height', Number(e.target.value))}
                className="h-8 text-xs font-mono p-1 text-center"
              />
            </div>
          </div>

          {/* Rotation Quick Buttons */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Orientation ({selectedNode.rotation}°)</Label>
            <div className="grid grid-cols-4 gap-1">
              {[0, 90, 180, 270].map((deg) => (
                <Button
                  key={deg}
                  variant={selectedNode.rotation === deg ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handleFieldChange('rotation', deg)}
                  className={`h-7 text-xs font-mono ${
                    selectedNode.rotation === deg ? 'border-primary/50 text-primary font-bold' : ''
                  }`}
                >
                  {deg}°
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 3: Monetization & Capacity */}
        <div className="space-y-3 pt-3 border-t border-border/80">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
            <span>Monetization & Capacity</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Capacity (Pax)</Label>
              <Input
                type="number"
                value={selectedNode.capacity}
                onChange={(e) => handleFieldChange('capacity', Number(e.target.value))}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Hourly ($)</Label>
              <Input
                type="number"
                step="0.5"
                value={selectedNode.hourlyRate}
                onChange={(e) => handleFieldChange('hourlyRate', Number(e.target.value))}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Daily ($)</Label>
              <Input
                type="number"
                step="1"
                value={selectedNode.dailyRate}
                onChange={(e) => handleFieldChange('dailyRate', Number(e.target.value))}
                className="h-8 text-xs font-mono mt-1"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/60">
            <div>
              <p className="text-xs font-medium text-foreground">Custom Overwrite</p>
              <p className="text-[10px] text-muted-foreground">Bypass global zone pricing rule</p>
            </div>
            <Switch
              checked={selectedNode.customRateOverwrite}
              onCheckedChange={(checked) => handleFieldChange('customRateOverwrite', checked)}
              aria-label="Custom pricing overwrite toggle"
            />
          </div>
        </div>

        {/* Section 4: Hardware & Amenities */}
        <div className="space-y-3 pt-3 border-t border-border/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Amenities & Hardware
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {selectedNode.amenities.length} items
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {selectedNode.amenities.map((amenity) => (
              <Badge
                key={amenity}
                variant="secondary"
                className="text-[11px] font-normal pl-2 pr-1 py-0.5 gap-1 bg-muted border border-border"
              >
                <span>{amenity}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAmenity(amenity)}
                  aria-label={`Remove amenity ${amenity}`}
                  className="hover:text-rose-500 rounded p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>

          <form onSubmit={handleAddAmenity} className="flex gap-1.5">
            <Input
              value={newAmenityText}
              onChange={(e) => setNewAmenityText(e.target.value)}
              placeholder="e.g. Ergonomic Footrest"
              className="h-8 text-xs"
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={!newAmenityText.trim()}
              className="h-8 px-2.5 text-xs shrink-0"
              aria-label="Add amenity"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>

        {/* Section 5: Operational Controls */}
        <div className="space-y-2.5 pt-3 border-t border-border/80">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Operational Controls
          </span>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-emerald-500" />
                <div>
                  <p className="text-xs font-medium text-foreground">Marketplace Bookable</p>
                  <p className="text-[10px] text-muted-foreground">Available for tenant reservation</p>
                </div>
              </div>
              <Switch
                checked={selectedNode.isBookable}
                onCheckedChange={(checked) => handleFieldChange('isBookable', checked)}
                aria-label="Toggle marketplace bookable status"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="text-xs font-medium text-foreground">Maintenance Lock</p>
                  <p className="text-[10px] text-muted-foreground">Temporarily block for repairs</p>
                </div>
              </div>
              <Switch
                checked={selectedNode.isMaintenanceLocked}
                onCheckedChange={(checked) => handleFieldChange('isMaintenanceLocked', checked)}
                aria-label="Toggle maintenance lock"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 border-t border-border/80 bg-muted/40 grid grid-cols-2 gap-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDuplicate(selectedNode.id)}
          className="h-8 text-xs gap-1.5"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Duplicate</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(selectedNode.id)}
          className="h-8 text-xs gap-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 border-rose-500/30"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Node</span>
        </Button>
      </div>
    </aside>
  );
}

