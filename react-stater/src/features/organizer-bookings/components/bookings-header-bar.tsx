import React from 'react';
import { Link } from '@tanstack/react-router';
import {
  ChevronRight,
  Download,
  Plus,
  Building2,
  Radio
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BookingsHeaderBarProps {
  onExportCsv: () => void;
  onOpenManualModal?: () => void;
  onManualReservation?: () => void;
  lastSyncTime?: string;
  onSync?: () => void;
}

export function BookingsHeaderBar({
  onExportCsv,
  onOpenManualModal,
  onManualReservation,
  lastSyncTime,
  onSync
}: BookingsHeaderBarProps) {
  const handleOpenModal = onManualReservation || onOpenManualModal || (() => {});
  return (
    <div className="space-y-4">
      {/* Top Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
        <Link to="/dashboard/organizer/workspaces" className="hover:text-foreground transition-colors">
          Workspaces
        </Link>
        <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
        <span>District 1, HCMC</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
        <span className="flex items-center gap-1 text-muted-foreground">
          <Building2 className="w-3 h-3" />
          NexSpace Saigon Prime Hub
        </span>
        <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
        <span className="font-semibold text-foreground">Bookings Ledger</span>
      </nav>

      {/* Main Title & Action CTAs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Bookings Ledger & Reservations
            </h1>
            <button
              type="button"
              onClick={onSync}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/20 transition-colors cursor-pointer"
              title="Click to refresh live sync status"
            >
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Live Sync: {lastSyncTime || 'Online'}</span>
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl leading-relaxed">
            Real-time audit log of customer reservations, payment statuses via PayOS, and check-in
            verifications across all workspace zones.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            className="h-9 px-3 text-xs gap-1.5 border-border hover:bg-muted/80 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV / Excel</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenModal}
            className="h-9 px-3.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-1.5 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Reservation</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

