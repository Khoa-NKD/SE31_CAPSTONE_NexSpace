import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { DisputeEvidenceItem } from '../data/mock-disputes';

interface EvidenceZoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evidence: DisputeEvidenceItem | null;
}

export function EvidenceZoomDialog({
  open,
  onOpenChange,
  evidence
}: EvidenceZoomDialogProps) {
  if (!evidence) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl p-4'>
        <DialogHeader>
          <DialogTitle className='text-sm font-bold flex items-center justify-between'>
            <span>{evidence.title}</span>
            <span className='text-[10px] px-2 py-0.5 rounded font-mono bg-muted border border-border'>
              {evidence.timestamp}
            </span>
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground'>
            {evidence.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className='mt-2'>
          {evidence.type === 'photo' && evidence.imageUrl ? (
            <div className='rounded-lg overflow-hidden border border-border bg-black/40 flex items-center justify-center max-h-[65vh]'>
              <img
                src={evidence.imageUrl}
                alt={evidence.title}
                className='w-full h-auto max-h-[65vh] object-contain'
              />
            </div>
          ) : evidence.type === 'telemetry' && evidence.telemetryData ? (
            <div className='rounded-lg border border-border bg-slate-950 text-white p-5 space-y-4 font-mono text-xs'>
              <div className='flex items-center justify-between border-b border-white/10 pb-3'>
                <span className='text-red-400 font-bold'>TELEMETRY GATEWAY DIAGNOSTIC</span>
                <span className='px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px]'>
                  STATUS: {evidence.badge}
                </span>
              </div>

              <div className='grid grid-cols-2 gap-4 py-2 border-b border-white/10'>
                <div>
                  <span className='text-white/60 text-[11px] block'>Download Throughput:</span>
                  <span className='text-xl font-bold text-red-400'>
                    {evidence.telemetryData.speedDown}
                  </span>
                </div>
                <div>
                  <span className='text-white/60 text-[11px] block'>Upload Throughput:</span>
                  <span className='text-xl font-bold text-red-400'>
                    {evidence.telemetryData.speedUp}
                  </span>
                </div>
              </div>

              <div className='flex items-center justify-between text-[11px] text-white/70'>
                <span>Latency / Ping: {evidence.telemetryData.ping}</span>
                <span>SHA-256 Hash: {evidence.verifiedHash || '#verified'}</span>
              </div>

              <div className='p-2.5 rounded bg-white/5 border border-white/10 text-[11px] text-white/90'>
                Diagnostic Log: {evidence.telemetryData.statusNote}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
