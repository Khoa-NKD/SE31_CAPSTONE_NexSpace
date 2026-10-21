import { Link } from '@tanstack/react-router';
import { Building, Grid, Heart, Image as ImageIcon, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PublicWorkspaceDetail } from '../../api/types';

interface WorkspaceGalleryProps {
  workspace?: PublicWorkspaceDetail;
}

export function WorkspaceGallery({ workspace }: WorkspaceGalleryProps) {
  const name = workspace?.name || 'Workspace';
  const locationBreadcrumb = workspace
    ? [workspace.district, workspace.city].filter(Boolean).join(', ') || 'All Locations'
    : 'Workspaces';
  const campusBadge = workspace?.facilitySubtitle || (workspace?.category ? workspace.category.replace('_', ' ').toUpperCase() : 'WORKSPACE');

  const hasCover = Boolean(workspace?.coverImageUrl);
  const coverImage = workspace?.coverImageUrl;
  const uploadedImages = (workspace?.images || []).filter((img) => Boolean(img?.url));
  const totalPhotoCount = (hasCover ? 1 : 0) + uploadedImages.length;

  return (
    <div className="space-y-5 mb-8">
      {/* Breadcrumb & Action bar */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/workspaces" className="hover:text-primary transition-colors font-medium">Workspaces</Link>
          <span className="text-muted-foreground/60">/</span>
          <Link to="/workspaces" className="hover:text-primary transition-colors font-medium">{locationBreadcrumb}</Link>
          <span className="text-muted-foreground/60">/</span>
          <span className="text-foreground font-semibold truncate max-w-[280px] sm:max-w-none">
            {name}
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
          <div className="md:col-span-6 relative h-[260px] md:h-full overflow-hidden group cursor-pointer bg-muted">
            {hasCover ? (
              <img
                alt={name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                src={coverImage}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-6 bg-muted/70">
                <Building className="w-12 h-12 mb-2 text-muted-foreground/40" />
                <span className="text-sm font-semibold text-foreground">Workspace photo pending</span>
                <span className="text-xs text-muted-foreground mt-1">Illustrative preview placeholder</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-60 pointer-events-none" />
            <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider text-foreground border shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {campusBadge.toUpperCase()}
            </div>
          </div>
          
          {/* 4 Smaller Grid photos (40% width = 4 cols, 2x2 grid) */}
          <div className="md:col-span-4 grid grid-cols-2 gap-2 h-[220px] md:h-full">
            {[0, 1, 2, 3].map((slotIndex) => {
              const imgItem = uploadedImages[slotIndex];
              return (
                <div key={slotIndex} className="relative overflow-hidden group cursor-pointer bg-muted/60 border border-border/40 flex items-center justify-center">
                  {imgItem ? (
                    <img
                      alt={`${name} gallery view ${slotIndex + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      src={imgItem.url}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/60 p-3 text-center bg-muted/40">
                      <ImageIcon className="w-6 h-6 mb-1 text-muted-foreground/40" />
                      <span className="text-[11px] font-medium text-muted-foreground">Preview placeholder</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Floating gallery trigger button */}
        <Button 
          variant="secondary" 
          className="absolute bottom-4 right-4 bg-background/90 hover:bg-background text-foreground shadow-sm gap-2 active:scale-[0.98] transition-all duration-300 hover:-translate-y-0.5"
        >
          <Grid className="w-4 h-4" />
          <span className="font-semibold">
            {totalPhotoCount > 0 ? `View all ${totalPhotoCount} photos` : 'Illustrative gallery preview'}
          </span>
        </Button>
      </section>
    </div>
  );
}
