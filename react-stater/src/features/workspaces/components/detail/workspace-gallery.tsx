import React, { useState, useMemo, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import {
  BadgeCheck,
  Building2,
  ChevronLeft,
  ChevronRight,
  Grid,
  Heart,
  Image as ImageIcon,
  Layers3,
  MapPin,
  Share2,
  Sparkles,
  Star,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { useLanguage } from '@/features/landing/context/language-context';
import type { PublicWorkspaceDetail, WorkspaceMediaDto } from '../../api/types';

export interface WorkspaceGalleryProps {
  workspace?: PublicWorkspaceDetail & {
    organizerName?: string;
    address?: string;
  };
  mediaItems?: WorkspaceMediaDto[];
  onScrollToSection?: (sectionId: string) => void;
}

const SAVED_WORKSPACES_STORAGE_KEY = 'nexspace_saved_workspaces';

function formatCategoryLabel(category?: string, lang: 'en' | 'vi' = 'en'): string {
  const normalized = (category || '').toUpperCase().replace(/-/g, '_');
  const map: Record<string, { en: string; vi: string }> = {
    COWORKING_HUB: { en: 'Coworking Hub', vi: 'Không gian Coworking' },
    BUSINESS_LOUNGE: { en: 'Business Lounge', vi: 'Phòng chờ Doanh nhân' },
    CREATIVE_STUDIO: { en: 'Creative Studio', vi: 'Studio Sáng tạo' },
    SERVICED_OFFICE: { en: 'Serviced Office', vi: 'Văn phòng Dịch vụ' },
    OTHER: { en: 'Flexible Workspace', vi: 'Không gian Linh hoạt' }
  };
  if (map[normalized]) {
    return map[normalized][lang];
  }
  if (!category) {
    return lang === 'vi' ? 'Không gian làm việc' : 'Commercial Workspace';
  }
  return category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function WorkspaceGallery({
  workspace,
  mediaItems = [],
  onScrollToSection
}: WorkspaceGalleryProps) {
  const { language } = useLanguage();
  const c = useCallback((en: string, vi: string) => (language === 'vi' ? vi : en), [language]);

  const workspaceIdStr = String(workspace?.id || '');
  const name = workspace?.name || c('Workspace', 'Không gian làm việc');

  const categoryLabel = formatCategoryLabel(workspace?.category, language);

  const rating = typeof workspace?.rating === 'number' && workspace.rating > 0 ? workspace.rating : 0;
  const reviewsCount = typeof workspace?.reviewsCount === 'number' ? workspace.reviewsCount : 0;

  // Short location for breadcrumb and header
  const shortLocation = useMemo(() => {
    const parts = [workspace?.district, workspace?.city].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    if (workspace?.streetAddress) return workspace.streetAddress;
    if (workspace?.address) return workspace.address;
    return c('Vietnam', 'Việt Nam');
  }, [workspace?.district, workspace?.city, workspace?.streetAddress, workspace?.address, c]);

  // Full deduplicated address for tooltip / display
  const fullAddress = useMemo(() => {
    const rawStreet = (workspace?.streetAddress || workspace?.address || '').trim();
    const district = (workspace?.district || '').trim();
    const city = (workspace?.city || '').trim();

    if (!rawStreet) {
      return [district, city].filter(Boolean).join(', ') || c('Address available upon booking', 'Địa chỉ cung cấp khi đặt chỗ');
    }

    const lowerStreet = rawStreet.toLowerCase();
    const segments = [rawStreet];
    if (district && !lowerStreet.includes(district.toLowerCase())) {
      segments.push(district);
    }
    if (city && !lowerStreet.includes(city.toLowerCase())) {
      segments.push(city);
    }
    return segments.join(', ');
  }, [workspace?.streetAddress, workspace?.address, workspace?.district, workspace?.city, c]);

  const organizerName =
    workspace?.organizerLegalName ||
    workspace?.organizerName ||
    c('Verified Host', 'Đối tác vận hành');
  const organizerVerified =
    workspace?.organizerVerified !== undefined ? Boolean(workspace.organizerVerified) : true;

  // Consolidate photos from both WorkspaceMediaDto[] (/api/workspaces/:id/media) and workspace object
  const photos = useMemo(() => {
    const result: Array<{ id: string; url: string; caption?: string; isCover?: boolean }> = [];
    const seenUrls = new Set<string>();

    const addPhoto = (id: string, url?: string | null, caption?: string, isCover?: boolean) => {
      const trimmed = (url || '').trim();
      if (!trimmed || seenUrls.has(trimmed)) return;
      seenUrls.add(trimmed);
      result.push({ id, url: trimmed, caption, isCover });
    };

    // 1. Sort mediaItems so cover comes first, then by displayOrder
    if (Array.isArray(mediaItems) && mediaItems.length > 0) {
      const sortedMedia = [...mediaItems]
        .filter((m) => Boolean(m?.url) && m.mediaType !== 'VIDEO')
        .sort((a, b) => {
          const aCover = Boolean(a.cover || a.isCover);
          const bCover = Boolean(b.cover || b.isCover);
          if (aCover !== bCover) return aCover ? -1 : 1;
          return (a.displayOrder ?? 0) - (b.displayOrder ?? 0);
        });

      for (const item of sortedMedia) {
        addPhoto(String(item.id), item.url, undefined, Boolean(item.cover || item.isCover));
      }
    }

    // 2. Fallback/merge coverImageUrl & workspace.images if present
    if (workspace?.coverImageUrl) {
      addPhoto('cover', workspace.coverImageUrl, name, true);
    }
    if (Array.isArray(workspace?.images)) {
      for (const img of workspace.images) {
        if (img?.url) {
          addPhoto(String(img.id || img.url), img.url, img.caption, img.isCover);
        }
      }
    }

    return result;
  }, [mediaItems, workspace, name]);

  // Saved / Favorite state persisted in localStorage
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(SAVED_WORKSPACES_STORAGE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  });

  const isSaved = Boolean(workspaceIdStr && savedIds.includes(workspaceIdStr));

  const handleToggleSave = () => {
    if (!workspaceIdStr) return;
    try {
      let nextSaved = false;
      let nextList: string[];

      if (savedIds.includes(workspaceIdStr)) {
        nextList = savedIds.filter((id) => id !== workspaceIdStr);
        nextSaved = false;
      } else {
        nextList = [...savedIds, workspaceIdStr];
        nextSaved = true;
      }

      localStorage.setItem(SAVED_WORKSPACES_STORAGE_KEY, JSON.stringify(nextList));
      setSavedIds(nextList);

      toast.success(
        nextSaved
          ? c('Saved to your favorite workspaces', 'Đã lưu vào danh sách không gian yêu thích')
          : c('Removed from saved workspaces', 'Đã bỏ lưu khỏi danh sách yêu thích')
      );
    } catch {
      // ignore storage errors
    }
  };

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: `${name} | NexSpace`,
          text: `${name} — ${shortLocation}`,
          url: shareUrl
        });
        return;
      } catch {
        // Fallback to clipboard copy if user cancels or share fails
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard && shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(c('Workspace link copied to clipboard', 'Đã sao chép liên kết không gian'));
        return;
      } catch {
        // ignore
      }
    }
    toast.info(shareUrl || name);
  };

  // Mobile carousel & Lightbox state
  const [mobileIndex, setMobileIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightboxAt = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handlePrevPhoto = useCallback(() => {
    if (photos.length <= 1) return;
    setLightboxIndex((prev) => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  const handleNextPhoto = useCallback(() => {
    if (photos.length <= 1) return;
    setLightboxIndex((prev) => (prev + 1) % photos.length);
  }, [photos.length]);

  const handleJumpToSection = (sectionId: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onScrollToSection) {
      onScrollToSection(sectionId);
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className='space-y-4 mb-5'>
      {/* 1. Compact Breadcrumb Bar */}
      <nav
        aria-label={c('Breadcrumb', 'Điều hướng phân cấp')}
        className='flex items-center gap-1.5 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap py-0.5'
      >
        <Link to='/workspaces' className='hover:text-primary transition-colors font-medium'>
          {c('Workspaces', 'Không gian')}
        </Link>
        <span className='text-muted-foreground/50' aria-hidden='true'>
          /
        </span>
        <Link to='/workspaces' className='hover:text-primary transition-colors font-medium'>
          {shortLocation}
        </Link>
        <span className='text-muted-foreground/50' aria-hidden='true'>
          /
        </span>
        <span className='text-foreground font-semibold truncate max-w-[240px] sm:max-w-[420px]'>
          {name}
        </span>
      </nav>

      {/* 2. Workspace Overview Header (Title, Meta, Share & Save) */}
      <header className='flex flex-col md:flex-row md:items-start justify-between gap-4'>
        <div className='space-y-2 min-w-0 flex-1'>
          {/* Primary Workspace Heading */}
          <h1 className='text-2xl sm:text-[28px] lg:text-[30px] font-bold text-foreground tracking-tight leading-tight break-words'>
            {name}
          </h1>

          {/* Concise Meta Strip: Category • Rating/New • Location • Verified Host */}
          <div className='flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs sm:text-[13px] text-muted-foreground'>
            {/* Category Pill */}
            <span className='inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20'>
              <Building2 className='size-3.5 shrink-0' />
              <span>{categoryLabel}</span>
            </span>

            <span className='text-muted-foreground/40' aria-hidden='true'>
              •
            </span>

            {/* Actual Rating or Honest New Workspace State */}
            {rating > 0 ? (
              <button
                type='button'
                onClick={(e) => handleJumpToSection('reviews', e)}
                className='inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors cursor-pointer'
              >
                <Star className='size-3.5 text-amber-500 fill-amber-500 shrink-0' />
                <span>{rating.toFixed(1)}</span>
                {reviewsCount > 0 && (
                  <span className='text-muted-foreground font-normal underline decoration-border underline-offset-2'>
                    ({reviewsCount} {c('reviews', 'đánh giá')})
                  </span>
                )}
              </button>
            ) : (
              <button
                type='button'
                onClick={(e) => handleJumpToSection('reviews', e)}
                className='inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors cursor-pointer'
              >
                <Sparkles className='size-3 shrink-0' />
                <span>{c('New Workspace', 'Mới trên NexSpace')}</span>
              </button>
            )}

            <span className='text-muted-foreground/40' aria-hidden='true'>
              •
            </span>

            {/* Concise Location with Smooth Scroll to #location */}
            <button
              type='button'
              onClick={(e) => handleJumpToSection('location', e)}
              title={fullAddress}
              className='inline-flex items-center gap-1 text-left text-foreground hover:text-primary transition-colors cursor-pointer max-w-full'
            >
              <MapPin className='size-3.5 text-primary shrink-0' />
              <span className='truncate max-w-[260px] sm:max-w-[380px] font-medium underline decoration-border/80 underline-offset-2'>
                {fullAddress}
              </span>
            </button>

            <span className='hidden sm:inline text-muted-foreground/40' aria-hidden='true'>
              •
            </span>

            {/* Verified Host Attribution */}
            <span className='inline-flex items-center gap-1 text-muted-foreground'>
              <span>
                {c('Hosted by', 'Vận hành bởi')}{' '}
                <strong className='font-semibold text-foreground'>{organizerName}</strong>
              </span>
              {organizerVerified && (
                <BadgeCheck
                  className='size-3.5 text-primary shrink-0'
                  aria-label={c('Verified Partner', 'Đối tác đã xác thực')}
                />
              )}
            </span>
          </div>
        </div>

        {/* Share & Save Action Buttons */}
        <div className='flex items-center gap-2 shrink-0 self-start'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleShare}
            aria-label={c('Share this workspace', 'Chia sẻ không gian này')}
            className='h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-2xs cursor-pointer'
          >
            <Share2 className='size-3.5' />
            <span>{c('Share', 'Chia sẻ')}</span>
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleToggleSave}
            aria-pressed={isSaved}
            aria-label={
              isSaved
                ? c('Remove from saved workspaces', 'Bỏ lưu không gian')
                : c('Save workspace to favorites', 'Lưu vào yêu thích')
            }
            className={`h-9 gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-2xs cursor-pointer transition-colors ${
              isSaved
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15'
                : ''
            }`}
          >
            <Heart
              className={`size-3.5 transition-transform ${
                isSaved ? 'text-rose-500 fill-rose-500 scale-110' : 'text-muted-foreground'
              }`}
            />
            <span>{isSaved ? c('Saved', 'Đã lưu') : c('Save', 'Lưu')}</span>
          </Button>
        </div>
      </header>

      {/* 3. Redesigned Compact Gallery (or Compact Empty State) */}
      {photos.length === 0 ? (
        /* Compact Polished Empty State — No massive 440px placeholder grid */
        <section
          aria-label={c('Workspace gallery empty state', 'Trạng thái chưa có ảnh')}
          className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-dashed border-border bg-muted/25 px-5 py-4'
        >
          <div className='flex items-center gap-3.5'>
            <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/15'>
              <ImageIcon className='size-5' />
            </div>
            <div>
              <h2 className='text-sm font-semibold text-foreground'>
                {c(
                  'Gallery photos are being updated by the host',
                  'Hình ảnh không gian đang được đối tác cập nhật'
                )}
              </h2>
              <p className='text-xs text-muted-foreground mt-0.5'>
                {c(
                  'You can inspect the exact room and desk layout on the interactive floor map below.',
                  'Bạn có thể xem trực tiếp sơ đồ bố trí bàn làm việc và phòng họp ở phần Sơ đồ mặt bằng bên dưới.'
                )}
              </p>
            </div>
          </div>
          <Button
            type='button'
            variant='secondary'
            size='sm'
            onClick={(e) => handleJumpToSection('spaces-floor-map', e)}
            className='shrink-0 gap-1.5 rounded-xl text-xs font-semibold cursor-pointer'
          >
            <Layers3 className='size-3.5 text-primary' />
            <span>{c('View Floor Map', 'Xem sơ đồ tầng')}</span>
          </Button>
        </section>
      ) : (
        <section
          aria-label={c('Workspace photo gallery', 'Thư viện hình ảnh không gian')}
          className='relative rounded-2xl overflow-hidden border border-border/70 bg-muted/30 shadow-xs'
        >
          {/* Mobile Carousel (< md) */}
          <div className='relative md:hidden h-[240px] sm:h-[280px] w-full overflow-hidden bg-muted'>
            <button
              type='button'
              onClick={() => openLightboxAt(mobileIndex)}
              aria-label={c('Open full photo gallery', 'Mở thư viện ảnh toàn màn hình')}
              className='block w-full h-full cursor-pointer focus:outline-none'
            >
              <img
                src={photos[mobileIndex]?.url}
                alt={photos[mobileIndex]?.caption || `${name} — ${mobileIndex + 1}`}
                className='h-full w-full object-cover'
              />
            </button>

            {photos.length > 1 && (
              <>
                <button
                  type='button'
                  onClick={() =>
                    setMobileIndex((prev) => (prev - 1 + photos.length) % photos.length)
                  }
                  aria-label={c('Previous photo', 'Ảnh trước')}
                  className='absolute left-3 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-background/85 text-foreground shadow-md backdrop-blur-md hover:bg-background cursor-pointer'
                >
                  <ChevronLeft className='size-4' />
                </button>
                <button
                  type='button'
                  onClick={() => setMobileIndex((prev) => (prev + 1) % photos.length)}
                  aria-label={c('Next photo', 'Ảnh tiếp theo')}
                  className='absolute right-3 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full bg-background/85 text-foreground shadow-md backdrop-blur-md hover:bg-background cursor-pointer'
                >
                  <ChevronRight className='size-4' />
                </button>
                <div className='absolute bottom-3 left-3 rounded-full bg-black/65 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs'>
                  {mobileIndex + 1} / {photos.length}
                </div>
              </>
            )}
          </div>

          {/* Desktop & Tablet Adaptive Mosaic (md+) — 340px–360px height, zero fake empty slots */}
          <div
            className={`hidden md:grid gap-2 h-[330px] lg:h-[360px] ${
              photos.length === 1
                ? 'grid-cols-1'
                : photos.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-12'
            }`}
          >
            {/* Primary Cover Image */}
            <button
              type='button'
              onClick={() => openLightboxAt(0)}
              aria-label={c('View main workspace photo', 'Xem ảnh chính của không gian')}
              className={`relative h-full w-full overflow-hidden group cursor-pointer focus:outline-none ${
                photos.length >= 3 ? 'col-span-7' : ''
              }`}
            >
              <img
                src={photos[0].url}
                alt={photos[0].caption || name}
                className='h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]'
              />
              <div className='absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-60 pointer-events-none' />
            </button>

            {/* Supporting Thumbnails (Adapts to 2, 3, or 4+ photos cleanly) */}
            {photos.length === 2 && (
              <button
                type='button'
                onClick={() => openLightboxAt(1)}
                aria-label={`${name} — 2`}
                className='relative h-full w-full overflow-hidden group cursor-pointer focus:outline-none'
              >
                <img
                  src={photos[1].url}
                  alt={photos[1].caption || `${name} 2`}
                  className='h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]'
                />
              </button>
            )}

            {photos.length === 3 && (
              <div className='col-span-5 grid grid-rows-2 gap-2 h-full'>
                {photos.slice(1, 3).map((photo, idx) => (
                  <button
                    key={photo.id}
                    type='button'
                    onClick={() => openLightboxAt(idx + 1)}
                    aria-label={`${name} — ${idx + 2}`}
                    className='relative h-full w-full overflow-hidden group cursor-pointer focus:outline-none'
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || `${name} ${idx + 2}`}
                      className='h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]'
                    />
                  </button>
                ))}
              </div>
            )}

            {photos.length >= 4 && (
              <div className='col-span-5 grid grid-cols-2 grid-rows-2 gap-2 h-full'>
                {photos.slice(1, 5).map((photo, idx) => {
                  const isLastVisible = idx === 3 && photos.length > 5;
                  return (
                    <button
                      key={photo.id}
                      type='button'
                      onClick={() => openLightboxAt(idx + 1)}
                      aria-label={`${name} — ${idx + 2}`}
                      className={`relative h-full w-full overflow-hidden group cursor-pointer focus:outline-none ${
                        photos.length === 4 && idx === 2 ? 'col-span-2' : ''
                      }`}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || `${name} ${idx + 2}`}
                        className='h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]'
                      />
                      {isLastVisible && (
                        <div className='absolute inset-0 bg-black/55 flex items-center justify-center text-white font-bold text-base backdrop-blur-[1px]'>
                          +{photos.length - 5} {c('more', 'ảnh')}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Floating "View All Photos" Button */}
          <Button
            type='button'
            variant='secondary'
            size='sm'
            onClick={() => openLightboxAt(0)}
            className='absolute bottom-3.5 right-3.5 h-8.5 rounded-xl bg-background/90 hover:bg-background text-foreground border border-border/60 shadow-md backdrop-blur-md gap-1.5 text-xs font-semibold cursor-pointer'
          >
            <Grid className='size-3.5' />
            <span>
              {photos.length > 1
                ? c(`View all ${photos.length} photos`, `Xem tất cả ${photos.length} ảnh`)
                : c('View full photo', 'Xem ảnh phóng to')}
            </span>
          </Button>
        </section>
      )}

      {/* Lightbox Modal Dialog for Full Gallery Inspection */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') handlePrevPhoto();
            if (e.key === 'ArrowRight') handleNextPhoto();
          }}
          className='sm:max-w-4xl w-[95vw] bg-card border-border p-0 overflow-hidden rounded-2xl shadow-2xl [&>button]:hidden outline-none'
        >
          <div className='flex items-center justify-between border-b border-border px-4 py-3'>
            <div>
              <DialogTitle className='text-sm font-bold text-foreground'>{name}</DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                {c('Photo', 'Hình ảnh')} {lightboxIndex + 1} / {photos.length}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button
                type='button'
                aria-label={c('Close photo gallery', 'Đóng thư viện ảnh')}
                className='flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer'
              >
                <X className='size-4' />
              </button>
            </DialogClose>
          </div>

          {photos[lightboxIndex] && (
            <div className='relative flex items-center justify-center bg-black/95 h-[55vh] sm:h-[62vh] select-none'>
              <img
                src={photos[lightboxIndex].url}
                alt={photos[lightboxIndex].caption || `${name} — ${lightboxIndex + 1}`}
                className='max-h-full max-w-full object-contain'
              />

              {photos.length > 1 && (
                <>
                  <button
                    type='button'
                    onClick={handlePrevPhoto}
                    aria-label={c('Previous photo', 'Ảnh trước')}
                    className='absolute left-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-background/85 text-foreground shadow-lg hover:bg-background transition-colors cursor-pointer'
                  >
                    <ChevronLeft className='size-5' />
                  </button>
                  <button
                    type='button'
                    onClick={handleNextPhoto}
                    aria-label={c('Next photo', 'Ảnh tiếp theo')}
                    className='absolute right-3 top-1/2 -translate-y-1/2 flex size-10 items-center justify-center rounded-full bg-background/85 text-foreground shadow-lg hover:bg-background transition-colors cursor-pointer'
                  >
                    <ChevronRight className='size-5' />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Thumbnail Strip */}
          {photos.length > 1 && (
            <div className='flex items-center gap-2 overflow-x-auto border-t border-border bg-muted/30 p-3'>
              {photos.map((photo, idx) => (
                <button
                  key={photo.id}
                  type='button'
                  onClick={() => setLightboxIndex(idx)}
                  aria-label={`${c('Select photo', 'Chọn ảnh')} ${idx + 1}`}
                  className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all cursor-pointer ${
                    idx === lightboxIndex
                      ? 'border-primary ring-2 ring-primary/30 opacity-100'
                      : 'border-transparent opacity-60 hover:opacity-90'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={`${name} thumbnail ${idx + 1}`}
                    className='h-full w-full object-cover'
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
