import React from 'react';
import { Link } from '@tanstack/react-router';
import {
  ChevronRight,
  Plus,
  SlidersHorizontal,
  Download,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PricingHeaderBarProps {
  onOpenConfigDialog: () => void;
  onExportMatrix: () => void;
}

export function PricingHeaderBar({
  onOpenConfigDialog,
  onExportMatrix
}: PricingHeaderBarProps) {
  return (
    <div className="space-y-4">
      {/* Top Breadcrumbs */}
      <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs text-muted-foreground select-none">
        <Link
          to="/dashboard/organizer/workspaces"
          className="hover:text-foreground transition-colors"
        >
          Workspaces
        </Link>
        <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
        <span className="flex items-center gap-1 text-muted-foreground">
          <Building2 className="w-3 h-3" />
          NexSpace Saigon Prime Hub
        </span>
        <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
        <span className="font-medium text-foreground">Pricing Matrix</span>
      </nav>

      {/* Main Header Flex */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Resource Configuration & Matrix
            </h1>
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs px-2 py-0.5 rounded-full font-medium"
            >
              Marketplace Live
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Managing 48 dedicated spaces, 6 meeting hubs, and 28 flexible hot desks.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={onExportMatrix}
            className="h-9 px-3 text-xs gap-1.5 border-border hover:bg-muted/80 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export Matrix</span>
          </Button>

          <Button
            size="sm"
            onClick={onOpenConfigDialog}
            className="h-9 px-3.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm gap-1.5 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Configure Pricing Matrix</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenConfigDialog}
            className="h-9 px-3 text-xs gap-1.5 shadow-2xs hidden lg:flex"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rate Tier</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

