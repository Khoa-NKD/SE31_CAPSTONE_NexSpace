import { useState } from 'react';
import { Star, PenLine, ThumbsUp, BadgeCheck, MessageSquare } from '@/components/ui/hugeicons';
import { usePublicWorkspaceReviewsQuery } from '../../api/queries';
import { workspaceService } from '../../api/service';

interface SeatReviewsBentoProps {
  workspaceId?: number | string;
  resourceId?: number | string;
  resourceName?: string;
  resourceCode?: string;
}

const getDimensionLabel = (key: string): string => {
  switch (key.toLowerCase()) {
    case 'cleanliness':
      return 'Vệ sinh & Độ sạch sẽ';
    case 'facilities':
      return 'Cơ sở vật chất & Ổ cắm';
    case 'location':
      return 'Vị trí & Dễ dàng tiếp cận';
    case 'service':
      return 'Dịch vụ & Hỗ trợ nhiệt tình';
    case 'quietness':
      return 'Độ yên tĩnh & Không gian tập trung';
    case 'comfort':
      return 'Tiện nghi & Ghế công thái học';
    default:
      return key.charAt(0).toUpperCase() + key.slice(1);
  }
};

const getInitials = (name?: string) => {
  if (!name) return 'KH';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'Gần đây';
  try {
    const d = new Date(dateStr);
    return `Trải nghiệm ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  } catch {
    return 'Gần đây';
  }
};

export function SeatReviewsBento({
  workspaceId = 1,
  resourceId,
  resourceName,
  resourceCode
}: SeatReviewsBentoProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | '5star' | '4star' | 'replied'>('all');
  const [localReactions, setLocalReactions] = useState<Record<number, { count: number; reacted: boolean }>>({});

  const { data: reviewsData, isLoading } = usePublicWorkspaceReviewsQuery(workspaceId, resourceId);

  const toggleHelpful = async (reviewId: number, currentCount: number, currentlyReacted: boolean) => {
    const currentState = localReactions[reviewId] ?? { count: currentCount, reacted: currentlyReacted };
    const newReacted = !currentState.reacted;
    const newCount = newReacted ? currentState.count + 1 : Math.max(0, currentState.count - 1);

    setLocalReactions((prev) => ({
      ...prev,
      [reviewId]: { count: newCount, reacted: newReacted }
    }));

    try {
      await workspaceService.toggleHelpfulReaction(workspaceId, reviewId);
    } catch {
      // Revert if API fails
      setLocalReactions((prev) => ({
        ...prev,
        [reviewId]: currentState
      }));
    }
  };

  const reviews = reviewsData?.reviews || [];
  const averageRating = reviewsData?.averageRating ?? 0;
  const totalReviews = reviewsData?.totalReviews ?? reviews.length;
  const dimensionAverages = reviewsData?.dimensionAverages || {};
  const hasDimensions = Object.keys(dimensionAverages).length > 0;

  const filteredReviews = reviews.filter((r) => {
    if (activeFilter === '5star') return r.rating === 5;
    if (activeFilter === '4star') return r.rating === 4;
    if (activeFilter === 'replied') return Boolean(r.organizerReply);
    return true;
  });

  return (
    <div className='bg-card border-border shadow-xs space-y-6 rounded-xl border p-6'>
      {/* Header */}
      <div className='border-border/60 flex flex-col justify-between gap-4 border-b pb-5 md:flex-row md:items-center'>
        <div>
          <h2 className='text-foreground font-sans text-base font-bold tracking-tight sm:text-lg'>
            Đánh giá thực tế từ khách hàng
          </h2>
          <p className='text-muted-foreground mt-0.5 text-xs'>
            {resourceCode || resourceName
              ? `Nhận xét thực tế từ khách hàng đã trải nghiệm tại ${resourceName || resourceCode}.`
              : 'Trải nghiệm xác thực từ khách hàng tại không gian làm việc.'}
          </p>
        </div>
        <button
          type='button'
          className='border-border hover:bg-muted text-foreground flex cursor-pointer items-center gap-2 self-start rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all active:scale-95 md:self-auto'
        >
          <PenLine className='h-3.5 w-3.5' />
          <span>Viết đánh giá</span>
        </button>
      </div>

      {/* Overall Rating Summary Bento Box */}
      {totalReviews > 0 ? (
        <div className='bg-muted/30 border-border/80 grid grid-cols-1 gap-6 rounded-xl border p-5 md:grid-cols-12'>
          {/* Left Score block */}
          <div className='border-border/60 flex flex-col items-center justify-center border-b pb-4 md:col-span-4 md:border-r md:border-b-0 md:pb-0'>
            <span className='font-sans text-4xl font-bold tracking-tight text-foreground sm:text-5xl'>
              {averageRating.toFixed(1)}
            </span>
            <div className='my-2 flex items-center gap-1'>
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.round(averageRating)
                      ? 'fill-amber-500 text-amber-500'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <span className='text-muted-foreground text-xs font-medium'>
              Dựa trên {totalReviews} lượt đánh giá thực tế
            </span>
          </div>

          {/* Right Sub-metrics Breakdown Bars */}
          <div className='flex flex-col justify-center gap-2.5 md:col-span-8'>
            {hasDimensions ? (
              Object.entries(dimensionAverages).map(([key, score]) => {
                const percent = Math.min(100, Math.round((score / 5.0) * 100));
                return (
                  <div key={key}>
                    <div className='mb-1 flex justify-between text-xs font-medium text-foreground'>
                      <span>{getDimensionLabel(key)}</span>
                      <span className='font-bold'>{score.toFixed(1)} / 5.0</span>
                    </div>
                    <div className='bg-muted h-2 w-full overflow-hidden rounded-full'>
                      <div
                        className='bg-primary h-full rounded-full transition-all duration-500'
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className='text-xs text-muted-foreground'>
                Đánh giá tổng quan từ khách hàng đã trải nghiệm tại không gian.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className='rounded-xl border border-dashed border-border/80 p-8 text-center'>
          <p className='text-sm font-medium text-foreground'>Chưa có đánh giá nào</p>
          <p className='text-muted-foreground mt-1 text-xs'>
            Hãy là người đầu tiên trải nghiệm không gian này và để lại nhận xét hữu ích cho cộng đồng!
          </p>
        </div>
      )}

      {/* Review Filters Chips (only show if there are reviews) */}
      {totalReviews > 0 && (
        <div className='flex flex-wrap gap-2'>
          <button
            type='button'
            onClick={() => setActiveFilter('all')}
            className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            Tất cả ({reviews.length})
          </button>
          <button
            type='button'
            onClick={() => setActiveFilter('5star')}
            className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
              activeFilter === '5star'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            5 Sao ({reviews.filter((r) => r.rating === 5).length})
          </button>
          <button
            type='button'
            onClick={() => setActiveFilter('4star')}
            className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
              activeFilter === '4star'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            4 Sao ({reviews.filter((r) => r.rating === 4).length})
          </button>
          <button
            type='button'
            onClick={() => setActiveFilter('replied')}
            className={`cursor-pointer rounded-full px-3.5 py-1 text-xs font-semibold transition-all ${
              activeFilter === 'replied'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            Có phản hồi ({reviews.filter((r) => Boolean(r.organizerReply)).length})
          </button>
        </div>
      )}

      {/* Individual Customer Review Cards */}
      {totalReviews > 0 && (
        <div className='border-border/60 divide-border/60 flex flex-col divide-y border-t'>
          {isLoading ? (
            <div className='py-8 text-center text-xs text-muted-foreground'>Đang tải đánh giá từ hệ thống...</div>
          ) : filteredReviews.length > 0 ? (
            filteredReviews.map((review) => {
              const reactionState = localReactions[review.id] ?? {
                count: review.helpfulCount || 0,
                reacted: review.userHasReacted || false
              };

              return (
                <article key={review.id} className='py-5'>
                  <div className='mb-2 flex items-start justify-between gap-4'>
                    <div className='flex items-center gap-3'>
                      {review.avatarUrl ? (
                        <img
                          src={review.avatarUrl}
                          alt={review.authorName}
                          className='h-10 w-10 shrink-0 rounded-full object-cover border border-border/50'
                        />
                      ) : (
                        <div className='bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold'>
                          {getInitials(review.authorName)}
                        </div>
                      )}
                      <div>
                        <div className='flex items-center gap-2'>
                          <h4 className='text-foreground text-xs font-bold sm:text-sm'>{review.authorName}</h4>
                          <span className='inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400'>
                            <BadgeCheck className='h-3 w-3' />
                            Đã xác thực đặt chỗ
                          </span>
                        </div>
                        <p className='text-muted-foreground text-xs'>
                          {review.resourceName ? `${review.resourceName} • ` : review.resourceCode ? `${review.resourceCode} • ` : ''}
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className='flex items-center text-amber-500'>
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className='h-3.5 w-3.5 fill-amber-500' />
                      ))}
                    </div>
                  </div>

                  <p className='text-foreground mt-2 text-xs leading-relaxed sm:text-sm'>
                    {review.content}
                  </p>

                  {/* Organizer Reply Box if present */}
                  {review.organizerReply && (
                    <div className='bg-muted/40 border-border/70 mt-3 rounded-lg border p-3.5 text-xs'>
                      <div className='flex items-center gap-1.5 font-bold text-foreground'>
                        <MessageSquare className='h-3.5 w-3.5 text-primary' />
                        <span>Phản hồi từ Ban Quản Lý Không Gian</span>
                      </div>
                      <p className='text-muted-foreground mt-1 leading-relaxed'>{review.organizerReply}</p>
                    </div>
                  )}

                  <div className='text-muted-foreground mt-3 flex items-center gap-4 text-xs'>
                    <button
                      type='button'
                      onClick={() => toggleHelpful(review.id, review.helpfulCount || 0, review.userHasReacted || false)}
                      className={`flex cursor-pointer items-center gap-1.5 transition-colors ${
                        reactionState.reacted ? 'text-primary font-bold' : 'hover:text-primary'
                      }`}
                    >
                      <ThumbsUp className={`h-3.5 w-3.5 ${reactionState.reacted ? 'fill-primary' : ''}`} />
                      <span>Hữu ích ({reactionState.count})</span>
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className='py-8 text-center text-xs text-muted-foreground'>
              Chưa có đánh giá nào phù hợp với bộ lọc đã chọn.
            </div>
          )}
        </div>
      )}

      {/* Pagination / Summary Footer */}
      {reviews.length > 0 && (
        <div className='border-border/60 border-t pt-4 text-center'>
          <span className='text-muted-foreground text-xs'>
            Hiển thị {filteredReviews.length} trên tổng số {totalReviews} đánh giá thực tế
          </span>
        </div>
      )}
    </div>
  );
}
