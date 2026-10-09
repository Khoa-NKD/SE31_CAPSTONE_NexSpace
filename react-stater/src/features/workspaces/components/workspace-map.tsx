import React from 'react';
import { RefreshCw, LocateFixed, Plus, Minus, Zap } from 'lucide-react';

export function WorkspaceMap() {
  return (
    <section 
      className="hidden h-full w-1/2 relative overflow-hidden border-l border-border bg-[#E2E8F0] lg:block"
      data-location="Ho Chi Minh City"
    >
      {/* Architectural Vector Canvas Mockup representing District 1, HCMC */}
      <div 
        className="absolute inset-0 h-full w-full"
        style={{
          backgroundColor: '#F8FAFC',
          backgroundImage: 'radial-gradient(#E2E8F0 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px'
        }}
      >
        <svg className="h-full w-full object-cover" fill="none" viewBox="0 0 1000 800" xmlns="http://www.w3.org/2000/svg">
          {/* Saigon River Curve */}
          <path d="M720,0 C680,180 820,380 910,520 C960,600 980,720 1000,800 L1000,0 Z" fill="#D3E4FE" opacity="0.75" />
          <path d="M720,0 C680,180 820,380 910,520 C960,600 980,720 1000,800" fill="none" opacity="0.6" stroke="#93C5FD" strokeWidth="6" />
          
          {/* 23-9 Park & Botanical Gardens green spaces */}
          <rect fill="#D1FAE5" height="70" opacity="0.6" rx="8" width="240" x="80" y="560" />
          <text fill="#047857" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="600" x="140" y="600">23 Tháng 9 Park</text>
          
          <circle cx="560" cy="140" fill="#D1FAE5" opacity="0.5" r="85" />
          <text fill="#047857" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" x="500" y="145">Saigon Zoo & Botanical</text>
          
          <rect fill="#D1FAE5" height="90" opacity="0.4" rx="6" width="160" x="260" y="240" />
          <text fill="#047857" fontFamily="Inter, sans-serif" fontSize="12" fontWeight="600" x="290" y="290">Tao Dan Park</text>
          
          {/* Major Arterial Roads */}
          <line stroke="#CBD5E1" strokeLinecap="round" strokeWidth="12" x1="200" x2="680" y1="200" y2="280" />
          <line stroke="#FFFFFF" strokeLinecap="round" strokeWidth="8" x1="200" x2="680" y1="200" y2="280" />
          <text fill="#64748B" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="600" letterSpacing="1" x="370" y="235">ĐƯỜNG LÊ DUẨN</text>
          
          <line stroke="#CBD5E1" strokeLinecap="round" strokeWidth="14" x1="380" x2="780" y1="520" y2="400" />
          <line stroke="#FFFFFF" strokeLinecap="round" strokeWidth="10" x1="380" x2="780" y1="520" y2="400" />
          <text fill="#64748B" fontFamily="Inter, sans-serif" fontSize="10" fontWeight="600" letterSpacing="1" x="520" y="470">PHỐ ĐI BỘ NGUYỄN HUỆ</text>
          
          <line stroke="#E2E8F0" strokeWidth="7" x1="410" x2="720" y1="460" y2="350" />
          <line stroke="#FFFFFF" strokeWidth="4" x1="410" x2="720" y1="460" y2="350" />
          
          <line stroke="#CBD5E1" strokeWidth="9" x1="280" x2="650" y1="410" y2="330" />
          <line stroke="#FFFFFF" strokeWidth="6" x1="280" x2="650" y1="410" y2="330" />
          <text fill="#64748B" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="600" letterSpacing="0.5" x="410" y="365">LÊ THÁNH TÔN</text>
          
          {/* Ben Thanh Market Landmark Footprint */}
          <rect fill="#F8FAFC" height="45" rx="4" stroke="#94A3B8" strokeWidth="1.5" width="55" x="290" y="490" />
          <text fill="#475569" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="600" x="294" y="516">Bến Thành</text>
          
          {/* Notre Dame Cathedral Landmark */}
          <polygon fill="#FEE2E2" points="410,240 435,215 450,245 425,270" stroke="#F87171" strokeWidth="1" />
          <text fill="#991B1B" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="600" x="410" y="285">Notre Dame</text>
          
          {/* Bitexco Financial Tower Footprint */}
          <circle cx="730" cy="460" fill="#E2E8F0" r="18" stroke="#64748B" strokeWidth="2" />
          <text fill="#334155" fontFamily="Inter, sans-serif" fontSize="9" fontWeight="700" x="712" y="495">Bitexco</text>
        </svg>
      </div>

      {/* MAP CONTROLS */}
      {/* Top Center: Floating "Search This Area" Pill */}
      <div className="absolute left-1/2 top-5 z-20 -translate-x-1/2">
        <button className="flex items-center gap-2 rounded-full border border-border bg-card/95 px-4 py-2 text-sm font-semibold text-foreground shadow-[0_10px_15px_-3px_rgba(15,23,42,0.09)] backdrop-blur-md transition-all hover:border-[#4b41e1] hover:bg-card">
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
      <div className="absolute bottom-6 left-6 z-20 flex items-center gap-3 rounded-lg border border-border bg-card/95 px-3.5 py-2 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Available Now</span>
        </div>
        <span className="text-[11px] text-muted-foreground/70">•</span>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-foreground">
          <span className="h-2 w-2 rounded-full bg-[#4b41e1]" />
          <span>Instant Book</span>
        </div>
      </div>

      {/* INTERACTIVE MAP PINS / NODES */}
      
      {/* PIN 1: ACTIVE / HIGHLIGHTED NODE */}
      <div className="absolute left-[48%] top-[44%] z-30 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer flex-col items-center">
        {/* Floating Mini Preview Tooltip */}
        <div 
          className="mb-2 flex w-60 animate-bounce items-center gap-2.5 rounded-lg border border-border bg-card p-2 shadow-[0_20px_25px_-5px_rgba(15,23,42,0.18)]"
          style={{ animationDuration: '2.5s', animationIterationCount: 'infinite' }}
        >
          <img
            alt="Thumbnail NexSpace Central"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3G4bLH1lBqCv4pVxV3wYmajef3jn_QFTnFAq0p1pOZgih4qi8Nhbew9JySzBL015kb-xCq3Wyk4QdmA09XGNutc_-jsPZxDTMLvpaWJbZo8GuvqeY3CKVC2d_OHvxiI0j9KdFzGmZFeNN86NsNZP76jJJMQVjacWZCr2apx2w0dhZrXRaYNDNWd929cjU7fM_l6LRWo8OutEJqHvu3iigZPQi8McDuUmHVFT7oPJnihtNWMsnYyUIKQ"
            className="h-12 w-12 shrink-0 rounded object-cover"
          />
          <div className="overflow-hidden">
            <p className="truncate text-sm font-bold text-foreground">NexSpace Central Tower</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4b41e1]">$2.50/hr • 8 desks left</p>
          </div>
        </div>

        {/* Solid Primary Pill with Pulsing Glow Ring */}
        <div className="relative">
          <div className="absolute -inset-1.5 animate-ping rounded-full bg-[#4b41e1] opacity-30" />
          <div className="relative flex items-center gap-1 rounded-full bg-[#4b41e1] px-3 py-1.5 text-sm font-bold text-white shadow-lg ring-2 ring-card">
            <Zap className="h-[14px] w-[14px]" />
            <span>$2.50/hr</span>
          </div>
        </div>
      </div>

      {/* PIN 2 */}
      <div className="group absolute left-[72%] top-[58%] z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-sm font-bold text-foreground shadow-md transition-all group-hover:scale-110 group-hover:border-[#4b41e1] group-hover:bg-[#4b41e1] group-hover:text-white">
          <span>$3.20/hr</span>
        </div>
      </div>

      {/* PIN 3 */}
      <div className="group absolute left-[42%] top-[32%] z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-sm font-bold text-foreground shadow-md transition-all group-hover:scale-110 group-hover:border-[#4b41e1] group-hover:bg-[#4b41e1] group-hover:text-white">
          <span>$2.80/hr</span>
        </div>
      </div>

      {/* PIN 4 */}
      <div className="group absolute left-[60%] top-[28%] z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-sm font-bold text-foreground shadow-md transition-all group-hover:scale-110 group-hover:border-[#4b41e1] group-hover:bg-[#4b41e1] group-hover:text-white">
          <span>$4.00/hr</span>
        </div>
      </div>

      {/* PIN 5 */}
      <div className="group absolute left-[34%] top-[68%] z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-sm font-semibold text-foreground shadow-md transition-all group-hover:scale-110 group-hover:border-[#4b41e1] group-hover:bg-[#4b41e1] group-hover:text-white">
          <span>$2.20/hr</span>
        </div>
      </div>

      {/* PIN 6 */}
      <div className="group absolute left-[82%] top-[75%] z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-sm font-semibold text-foreground shadow-md transition-all group-hover:scale-110 group-hover:border-[#4b41e1] group-hover:bg-[#4b41e1] group-hover:text-white">
          <span>$3.50/hr</span>
        </div>
      </div>
    </section>
  );
}
