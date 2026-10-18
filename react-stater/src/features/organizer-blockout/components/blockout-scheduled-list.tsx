import React from 'react';
import {
  Wrench,
  Lock,
  Router,
  ChevronRight,
  DoorClosed,
  Clock,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface ScheduledBlockItem {
  id: string;
  title: string;
  resourceName: string;
  dateDisplay: string;
  timeRangeDisplay: string;
  reasonType: 'MAINTENANCE' | 'EVENT' | 'NETWORK';
  iconType: string;
}

interface BlockoutScheduledListProps {
  scheduledBlocks: ScheduledBlockItem[];
  onUnblock: (id: string) => void;
  onViewHistory: () => void;
}

function getIcon(type: string) {
  switch (type) {
    case 'MAINTENANCE':
      return <Wrench className="w-3.5 h-3.5 text-white" />;
    case 'EVENT':
      return <Lock className="w-3.5 h-3.5 text-white" />;
    case 'NETWORK':
    default:
      return <Router className="w-3.5 h-3.5 text-white" />;
  }
}

function getHatchedStyle(type: string) {
  if (type === 'MAINTENANCE') {
    return {
      backgroundColor: '#1e293b',
      backgroundImage:
        'repeating-linear-gradient(-45deg, rgba(51, 65, 85, 0.9), rgba(51, 65, 85, 0.9) 3px, rgba(30, 41, 59, 0.95) 3px, rgba(30, 41, 59, 0.95) 6px)'
    };
  }
  if (type === 'EVENT') {
    return {
      backgroundColor: '#78350f',
      backgroundImage:
        'repeating-linear-gradient(-45deg, rgba(180, 83, 9, 0.9), rgba(180, 83, 9, 0.9) 3px, rgba(120, 53, 15, 0.95) 3px, rgba(120, 53, 15, 0.95) 6px)'
    };
  }
  return {
    backgroundColor: '#1e293b'
  };
}

export function BlockoutScheduledList({
  scheduledBlocks,
  onUnblock,
  onViewHistory
}: BlockoutScheduledListProps) {

  return (
    <div className="bg-card rounded-xl border border-border shadow-xs p-5 sm:p-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-foreground">Upcoming Scheduled Blocks</h2>
          <Badge variant="secondary" className="font-mono text-xs px-2 py-0.5">
            {scheduledBlocks.length}
          </Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 border-border"
        >
          <span>All Floors</span>
          <Filter className="w-3 h-3 text-muted-foreground/70" />
        </Button>
      </div>

      {/* Stacked List */}
      <div className="space-y-3">
        {scheduledBlocks.map((block) => (
          <div
            key={block.id}
            className="p-3.5 rounded-lg border border-border bg-muted/20 hover:bg-card hover:border-border transition-all flex items-start justify-between gap-3 shadow-2xs group"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div
                style={getHatchedStyle(block.reasonType)}
                className="w-8 h-8 rounded flex items-center justify-center shrink-0 mt-0.5 shadow-2xs border border-border/50"
              >
                {getIcon(block.reasonType)}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-foreground">{block.dateDisplay}</span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {block.timeRangeDisplay}
                  </span>
                </div>

                <p className="text-xs font-semibold text-foreground mt-0.5 truncate">
                  {block.title}
                </p>

                <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                  <DoorClosed className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                  <span className="truncate">{block.resourceName}</span>
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onUnblock(block.id)}
              className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 px-2 py-1 h-7 shrink-0"
            >
              Unblock
            </Button>
          </div>
        ))}
      </div>

      {/* Audit Log Footer */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>Last audit sync 4 mins ago</span>
        <button
          type="button"
          onClick={onViewHistory}
          className="text-primary hover:underline font-semibold flex items-center gap-0.5"
        >
          <span>View Full Blockout History</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
