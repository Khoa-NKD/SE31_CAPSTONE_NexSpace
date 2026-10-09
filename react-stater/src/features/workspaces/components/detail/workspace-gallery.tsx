import { Link } from '@tanstack/react-router';
import { Grid, Heart, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WorkspaceGallery() {
  return (
    <div className="space-y-5 mb-8">
      {/* Breadcrumb & Action bar */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/workspaces" className="hover:text-primary transition-colors font-medium">Workspaces</Link>
          <span className="text-muted-foreground/60">/</span>
          <Link to="/workspaces" className="hover:text-primary transition-colors font-medium">District 1, HCMC</Link>
          <span className="text-muted-foreground/60">/</span>
          <span className="text-foreground font-semibold truncate max-w-[280px] sm:max-w-none">
            NexSpace Central Tower
          </span>
        </nav>
        {/* Action items: Share & Wishlist */}
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" className="gap-1.5 shadow-sm active:scale-[0.98] transition-all duration-300 hover:-translate-y-0.5">
            <Share className="w-4 h-4" />
            <span>Share</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 shadow-sm active:scale-[0.98] transition-all duration-300 hover:-translate-y-0.5">
            <Heart className="w-4 h-4 text-destructive fill-destructive" />
            <span>Save</span>
          </Button>
        </div>
      </section>

      {/* Top Photo Mosaic */}
      <section className="relative rounded-2xl overflow-hidden shadow-sm border bg-muted">
        <div className="grid grid-cols-1 md:grid-cols-10 gap-2 h-auto md:h-[440px]">
          {/* 1 Large Main Hero photo (60% width = 6 cols) */}
          <div className="md:col-span-6 relative h-[260px] md:h-full overflow-hidden group cursor-pointer">
            <img 
              alt="Main Executive Coworking Hub Lounge" 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBZOt3vlUYUAW4M7KbfNDYDafeGXE-C4vU033RuETi1cUEE-xdgJxGi0oAc-c6EWsJSO8cIrLSkWpZJw_NJDQcpOdk-m-2wk-07P1ZPD2yrbWB-AX5BXH1vyIXPpkBVT4ukQbIv06-b5eVEN8uNAd8XcNMUolZ9nfMu89odUQ4nuwUlQUk6ecrmsFMGl0SlJ1yAnJ8AaBiv01HKDTEfmopa3l0iMLVS3MUqZVHDDqfD5RcdarhvBddCrw" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-60"></div>
            <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider text-foreground border shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              PRIMARY CAMPUS • LEVEL 14
            </div>
          </div>
          
          {/* 4 Smaller Grid photos (40% width = 4 cols, 2x2 grid) */}
          <div className="md:col-span-4 grid grid-cols-2 gap-2 h-[220px] md:h-full">
            <div className="relative overflow-hidden group cursor-pointer">
              <img alt="Acoustic Phone Booth Pod" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAmDV7vMmLSZeY9KR6ZESQdE12V-9S0PHj4_IOXhxHupvHCJOB0rz-Mcm8vjrPyz2igIfhHe5bmhzn1ym3y5MVCf66J6FpLZbWElKFTVGLh4SmxvH5FuXFSKeBAcaF4aWLHxWciO-6e14TbNHO9T36UrmlwdnMVSxrR_4yUsMp5nEmpqZBdSZjIn0ZaywFG4aY2SmCi5O7QcbGUXPpGl--KrscnzTRlylk0b084rd6rgKnrwmhxEeHuPw" />
            </div>
            <div className="relative overflow-hidden group cursor-pointer">
              <img alt="Executive Conference Suite" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB4HAAjRE5k7g4SJrIlVV9QQPbzo10uLDTBVRkN695EB4v--SxxdgML_pRIU1zLNZTwCymHVwnQ9P6dEEjf0jNLzDRa6aeqapmou-pDT063emmyRYqmUeGUztGDIY0qrSfr8630AwwgmEyVlZAn2OXRChHHzo-Vb5Hq1ZvlqyBliYvxy1gkVeJ2dBAy0WuVphHffO2hLNPVw_Z-NO9Sot0Qp8RxcRDMsl-pgoQQfLuVB9HJdxP_zyHdjg" />
            </div>
            <div className="relative overflow-hidden group cursor-pointer">
              <img alt="Artisanal Coffee Bar and Lounge" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAE6N1beyz2DWjMY1YIsX2EgnEoxYKtraX7YQWh_5aKEHRPOc_FI8dMYBP1J2kfaSwqFHthLOOzNiFjHp-xWd7SNZY1lysPUMjqM0fPKIOJT7v2TElhLZR_qsJ7E5oOM4DWJr6fSNp16YSMrauuF_MQQHE-rKtiXMa8smx_fNDOgNwTByLxRQwsXZgFPLcIMa-ECO5-1OU4EnxEGOcoTO_4iFJ70fDm4OnPyyOeSaqIz0WbuJsYW2VcMw" />
            </div>
            <div className="relative overflow-hidden group cursor-pointer">
              <img alt="Dedicated Focus Workstations" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBMXht3LT9R5GMJoVm5-ZCuhGIYRJi4snH6Zp7YC40jRsMG37W_FjG67LF_q3QSs6sMxs62t1G3sfcWS9Gon5IZ9rTcR14ybAn-41AXlKOZHQ2wj2NTwNEryTPvHMt-r_01Cpgk8yjLow9alQYBZ_4Rhh54wUTkXESQrkjDXFvUw1TFOe1hbtvt1va8ouHEH6KAaFHe7fBqyeeQc-7NZcuVd1f-_haGLjcRloN0b0zUySTU2NAV-XPkBA" />
            </div>
          </div>
        </div>
        
        {/* Floating gallery trigger button */}
        <Button 
          variant="secondary" 
          className="absolute bottom-4 right-4 bg-background/90 hover:bg-background text-foreground shadow-sm gap-2 active:scale-[0.98] transition-all duration-300 hover:-translate-y-0.5"
        >
          <Grid className="w-4 h-4" />
          <span className="font-semibold">View all 18 photos</span>
        </Button>
      </section>
    </div>
  );
}

