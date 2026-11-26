package base.api.feature.review.controller;

import base.api.feature.review.dto.response.ReviewSummaryResponseDto;
import base.api.feature.review.service.IPublicReviewService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/v1/public/workspaces/{workspaceId}/reviews", "/api/public/workspaces/{workspaceId}/reviews"})
@RequiredArgsConstructor
@Validated
@Tag(name = "Public Customer Reviews", description = "API công khai tra cứu đánh giá và phản hồi của khách hàng")
public class PublicReviewController extends BaseAPIController {

    private final IPublicReviewService reviewService;

    @GetMapping
    @Operation(summary = "Lấy danh sách đánh giá & thống kê điểm của không gian hoặc chỗ ngồi")
    public ResponseEntity<ApiResponse<ReviewSummaryResponseDto>> getReviews(
            @PathVariable @Positive Long workspaceId,
            @RequestParam(required = false) Long resourceId) {
        Long currentUserId = currentUserProvider != null
                ? currentUserProvider.getCurrentUser().map(u -> u.getId()).orElse(null)
                : null;
        ReviewSummaryResponseDto summary = reviewService.getWorkspaceReviews(workspaceId, resourceId, currentUserId);
        return success(summary, "Lấy danh sách đánh giá thành công");
    }

    @PostMapping("/{reviewId}/helpful")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Thả tim / Đánh dấu đánh giá là hữu ích")
    public ResponseEntity<ApiResponse<Boolean>> toggleHelpful(
            @PathVariable @Positive Long workspaceId,
            @PathVariable @Positive Long reviewId) {
        Long customerId = getCurrentUserId();
        boolean reacted = reviewService.toggleHelpfulReaction(reviewId, customerId);
        return success(reacted, reacted ? "Đã đánh dấu hữu ích" : "Đã bỏ đánh dấu hữu ích");
    }
}
