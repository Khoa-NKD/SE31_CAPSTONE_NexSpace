package base.api.feature.review.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Value
@Builder
public class ReviewItemDto {
    Long id;
    String authorName;
    String avatarUrl;
    Integer rating;
    String content;
    Map<String, Integer> dimensionRatings;
    List<String> photoUrls;
    String organizerReply;
    LocalDateTime repliedAt;
    LocalDateTime createdAt;
    Long resourceId;
    String resourceName;
    String resourceCode;
    long helpfulCount;
    boolean userHasReacted;
}
