package base.api.feature.review.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;
import java.util.Map;

@Value
@Builder
public class ReviewSummaryResponseDto {
    double averageRating;
    long totalReviews;
    Map<String, Double> dimensionAverages;
    List<ReviewItemDto> reviews;
}
