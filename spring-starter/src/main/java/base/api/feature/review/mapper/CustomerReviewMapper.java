package base.api.feature.review.mapper;

import base.api.feature.review.dto.response.ReviewItemDto;
import base.api.shared.entity.review.CustomerReviewModel;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Collections;
import java.util.List;
import java.util.Map;

public final class CustomerReviewMapper {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private CustomerReviewMapper() {}

    public static ReviewItemDto toDto(CustomerReviewModel model, long helpfulCount, boolean userHasReacted) {
        if (model == null) return null;

        String authorName = "Khách hàng ẩn danh";
        String avatarUrl = null;
        if (model.getBooking() != null && model.getBooking().getCustomer() != null) {
            var customer = model.getBooking().getCustomer();
            String first = customer.getFirstName() != null ? customer.getFirstName() : "";
            String last = customer.getLastName() != null ? customer.getLastName() : "";
            String full = (first + " " + last).trim();
            if (!full.isEmpty()) {
                authorName = full;
            } else if (customer.getUserName() != null) {
                authorName = customer.getUserName();
            }
            avatarUrl = customer.getAvatar();
        }

        Long resourceId = null;
        String resourceName = null;
        String resourceCode = null;
        if (model.getBooking() != null && model.getBooking().getResource() != null) {
            var resource = model.getBooking().getResource();
            resourceId = resource.getId();
            resourceName = resource.getName();
            resourceCode = resource.getLabel();
        }

        Map<String, Integer> dimensionRatings = parseDimensions(model.getDimensionRatings());
        List<String> photoUrls = parsePhotoUrls(model.getPhotoUrls());

        return ReviewItemDto.builder()
                .id(model.getId())
                .authorName(authorName)
                .avatarUrl(avatarUrl)
                .rating(model.getRating())
                .content(model.getContent())
                .dimensionRatings(dimensionRatings)
                .photoUrls(photoUrls)
                .organizerReply(model.getOrganizerReply())
                .repliedAt(model.getRepliedAt())
                .createdAt(model.getCreatedAt())
                .resourceId(resourceId)
                .resourceName(resourceName)
                .resourceCode(resourceCode)
                .helpfulCount(helpfulCount)
                .userHasReacted(userHasReacted)
                .build();
    }

    private static Map<String, Integer> parseDimensions(String json) {
        if (json == null || json.isBlank()) return Collections.emptyMap();
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<Map<String, Integer>>() {});
        } catch (Exception e) {
            return Collections.emptyMap();
        }
    }

    private static List<String> parsePhotoUrls(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
