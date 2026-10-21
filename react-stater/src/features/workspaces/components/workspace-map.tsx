import React from 'react';
import { RefreshCw, LocateFixed, Plus, Minus, Building, MapPin } from 'lucide-react';
import type { PublicWorkspaceSummary } from '../api/types';

interface WorkspaceMapProps {
  workspaces?: PublicWorkspaceSummary[];
}

// Deterministic schematic layout anchors (percentages) for up to 6 nodes
const SCHEMATIC_COORDINATES = [
  { left: '50%', top: '44%' },
  { left: '72%', top: '38%' },
  { left: '34%', top: '58%' },
  { left: '62%', top: '68%' },
  { left: '38%', top: '28%' },
  { left: '78%', top: '64%' }
];

export function WorkspaceMap({ workspaces = [] }: WorkspaceMapProps) {
  const hasWorkspaces = workspaces && workspaces.length > 0;
  const primary = hasWorkspaces ? workspaces[0] : null;

  return (
    <section 
      className="hidden h-full w-1/2 relative overflow-hidden border-l border-border bg-[#E2E8F0] lg:block"
      data-location="Schematic Metro Network"
    >
      {/* Abstract Modern Architectural & Metro Schematic Canvas */}
      <div 
        className="absolute inset-0 h-full w-full"
        style={{
          backgroundColor: '#F8FAFC',
          backgroundImage: 'radial-gradient(#E2E8F0 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px'
        }}
      >
        <svg className="h-full w-full object-cover" fill="none" viewBox="0 0 1000 800" xmlns="http://www.w3.org/2000/svg">
          {/* Curving River / Waterway Corridor */}
          <path d="M720,0 C680,180 820,380 910,520 C960,600 980,720 1000,800 L1000,0 Z" fill="#D3E4FE" opacity="0.45" />
          <path d="M720,0 C680,180 820,380 910,520 C960,600 980,720 1000,800" fill="none" opacity="0.4" stroke="#93C5FD" strokeWidth="4" />
          
          {/* Neutral Green Zones */}
          <rect fill="#D1FAE5" height="70" opacity="0.4" rx="8" width="220" x="80" y="560" />
          <text fill="#047857" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" x="140" y="600">Metro Green Park</text>
          
          <circle cx="560" cy="140" fill="#D1FAE5" opacity="0.35" r="70" />
          <text fill="#047857" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="600" x="515" y="145">Civic Garden Zone</text>
          
          <rect fill="#D1FAE5" height="80" opacity="0.3" rx="6" width="140" x="260" y="240" />
          <text fill="#047857" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" x="290" y="285">Central Commons</text>
          
          {/* Abstract Metro Transit Lines */}
          <line stroke="#CBD5E1" strokeLinecap="round" strokeWidth="10" x1="180" x2="680" y1="200" y2="280" />
          <line stroke="#FFFFFF" strokeLinecap="round" strokeWidth="6" x1="180" x2="680" y1="200" y2="280" />
          <text fill="#64748B" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="600" letterSpacing="1" x="370" y="235">METRO CORRIDOR A</text>
          
          <line stroke="#CBD5E1" strokeLinecap="round" strokeWidth="12" x1="360" x2="780" y1="520" y2="400" />
          <line stroke="#FFFFFF" strokeLinecap="round" strokeWidth="8" x1="360" x2="780" y1="520" y2="400" />
          <text fill="#64748B" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="600" letterSpacing="1" x="520" y="470">AVENUE TRANSIT B</text>
          
          <line stroke="#E2E8F0" strokeWidth="6" x1="410" x2="720" y1="460" y2="350" />
          <line stroke="#FFFFFF" strokeWidth="3" x1="410" x2="720" y1="460" y2="350" />
          
          <line stroke="#CBD5E1" strokeWidth="8" x1="260" x2="650" y1="410" y2="330" />
          <line stroke="#FFFFFF" strokeWidth="5" x1="260" x2="650" y1="410" y2="330" />
          <text fill="#64748B" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="600" letterSpacing="0.5" x="410" y="365">CENTRAL LINK</text>
        </svg>
      </div>

      {/* Empty State Overlay when no workspaces match filter */}
      {!hasWorkspaces && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20 pointer-events-none">
          <div className="bg-card/95 border rounded-2xl p-6 shadow-lg backdrop-blur-md max-w-sm pointer-events-auto">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground mx-auto mb-3">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Workspaces in Current View</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
              Adjust filters or clear search query to display active workspace nodes on the map.
            </p>
          </div>
        </div>
      )}

      {/* MAP CONTROLS */}
      {/* Top Center: Floating Search This Area Pill */}
      <div className="absolute left-1/2 top-5 z-20 -translate-x-1/2">
        <button className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 text-sm font-semibold text-foreground shadow-sm backdrop-blur-md transition-all hover:border-[#4b41e1] hover:bg-card cursor-pointer">
          <RefreshCw className="h-4 w-4 animate-spin text-[#4b41e1]" style={{ animationDuration: '3s' }} />
          <span>Search this area</span>
        </button>
      </div>

      {/* Top Right: Layer Switcher */}
      <div className="absolute right-5 top-5 z-20 flex overflow-hidden rounded-lg border border-border bg-card p-0.5 shadow-sm">
        <button className="rounded bg-[#4b41e1] px-3 py-1.5 text-sm font-semibold text-white shadow-sm">
          Map
        </button>
        <button className="px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          Satellite
        </button>
      </div>

      {/* Bottom Right: Navigation & Zoom Stack */}
      <div className="absolute bottom-6 right-5 z-20 flex flex-col gap-2">
        <button
          aria-label="My current location"
          title="My current location"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-md transition-colors hover:bg-background hover:text-[#4b41e1]"
        >
          <LocateFixed className="h-5 w-5" />
        </button>

        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-md">
          <button
            aria-label="Zoom in"
            title="Zoom in"
            className="flex h-9 w-10 items-center justify-center border-b border-border text-foreground hover:bg-muted"
          >
            <Plus className="h-[18px] w-[18px]" />
          </button>
          <button
            aria-label="Zoom out"
            title="Zoom out"
            className="flex h-9 w-10 items-center justify-center text-foreground hover:bg-muted"
          >
            <Minus className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {/* Bottom Left: Map Legend & Telemetry Status */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 rounded-lg border border-border bg-card/95 px-3.5 py-2 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground">
          <span className="h-2 w-2 rounded-full bg-[#4b41e1]" />
          <span>Listed Workspace</span>
        </div>
        <span className="hidden sm:inline text-[11px] text-muted-foreground/70">•</span>
        <span className="text-[10px] text-muted-foreground font-mono">
          Schematic Map · Illustrative node placement
        </span>
      </div>

      {/* DYNAMIC INTERACTIVE MAP PINS: Driven strictly by workspaces array */}
      {hasWorkspaces && primary && (
        <div
          className="absolute z-30 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center"
          style={{ left: SCHEMATIC_COORDINATES[0].left, top: SCHEMATIC_COORDINATES[0].top }}
        >
          {/* Floating Mini Preview Tooltip */}
          <div
            className="mb-2 flex w-60 animate-bounce items-center gap-2.5 rounded-lg border border-border bg-card p-2 shadow-xl"
            style={{ animationDuration: '2.5s', animationIterationCount: 'infinite' }}
          >
            {primary.coverImageUrl ? (
              <img
                alt={primary.name}
                src={primary.coverImageUrl}
                className="h-12 w-12 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded bg-muted flex items-center justify-center text-muted-foreground">
                <Building className="w-5 h-5" />
              </div>
            )}
            <div className="overflow-hidden">
              <p className="truncate text-sm font-bold text-foreground">{primary.name}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4b41e1]">
                {typeof primary.pricePerHour === 'number' ? `$${primary.pricePerHour.toFixed(2)}/hr` : 'Price on request'}
                {primary.capacityDesks ? ` • ${primary.capacityDesks} desks` : ''}
              </p>
            </div>
          </div>

          {/* Solid Primary Pill with Pulsing Glow Ring */}
          <div className="relative">
            <div className="absolute -inset-1.5 animate-ping rounded-full bg-[#4b41e1] opacity-30" />
            <div className="relative flex items-center gap-1 rounded-full bg-[#4b41e1] px-3 py-1.5 text-sm font-bold text-white shadow-lg ring-2 ring-card">
              <Building className="h-[14px] w-[14px]" />
              <span>{typeof primary.pricePerHour === 'number' ? `$${primary.pricePerHour.toFixed(2)}/hr` : 'View'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Subsequent workspace pins (indices 1..5) */}
      {workspaces.slice(1, 6).map((ws, idx) => {
        const coord = SCHEMATIC_COORDINATES[idx + 1] || SCHEMATIC_COORDINATES[1];
        const priceDisplay = typeof ws.pricePerHour === 'number' ? `$${ws.pricePerHour.toFixed(2)}/hr` : 'View';

        return (
          <div
            key={ws.id || idx}
            className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{ left: coord.left, top: coord.top }}
          >
            <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-sm font-bold text-foreground shadow-md transition-all group-hover:scale-110 group-hover:border-[#4b41e1] group-hover:bg-[#4b41e1] group-hover:text-white">
              <span>{priceDisplay}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
