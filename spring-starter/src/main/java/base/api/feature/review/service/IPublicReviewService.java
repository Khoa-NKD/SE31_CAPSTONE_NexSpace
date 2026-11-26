package base.api.feature.review.service;

import base.api.feature.review.dto.response.ReviewSummaryResponseDto;

public interface IPublicReviewService {
    ReviewSummaryResponseDto getWorkspaceReviews(Long workspaceId, Long resourceId, Long currentUserId);
    boolean toggleHelpfulReaction(Long reviewId, Long customerId);
}
