package base.api.feature.review.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.review.dto.response.ReviewItemDto;
import base.api.feature.review.dto.response.ReviewSummaryResponseDto;
import base.api.feature.review.mapper.CustomerReviewMapper;
import base.api.feature.review.repository.ICustomerReviewRepository;
import base.api.feature.review.repository.IReviewReactionRepository;
import base.api.feature.review.service.IPublicReviewService;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.review.CustomerReviewModel;
import base.api.shared.entity.review.ReviewReactionModel;
import base.api.shared.enums.ReviewStatus;
import base.api.shared.exception.NotFoundException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PublicReviewServiceImpl implements IPublicReviewService {

    private final ICustomerReviewRepository customerReviewRepository;
    private final IReviewReactionRepository reviewReactionRepository;
    private final IWorkspaceRepository workspaceRepository;
    private final IUserRepository userRepository;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Override
    @Transactional(readOnly = true)
    public ReviewSummaryResponseDto getWorkspaceReviews(Long workspaceId, Long resourceId, Long currentUserId) {
        if (!workspaceRepository.existsById(workspaceId)) {
            throw new NotFoundException("Workspace not found: " + workspaceId);
        }

        // Fetch page of reviews
        PageRequest pageRequest = PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<CustomerReviewModel> reviewPage = customerReviewRepository.findByWorkspaceIdAndOptionalResourceIdAndStatus(
                workspaceId, resourceId, ReviewStatus.PUBLISHED, pageRequest);

        // Fallback to all workspace reviews if no review exists for this specific resource
        if (reviewPage.isEmpty() && resourceId != null) {
            reviewPage = customerReviewRepository.findByWorkspaceIdAndOptionalResourceIdAndStatus(
                    workspaceId, null, ReviewStatus.PUBLISHED, pageRequest);
        }

        List<CustomerReviewModel> content = reviewPage.getContent();
        List<Long> reviewIds = content.stream().map(CustomerReviewModel::getId).toList();

        // Batch helpful reaction counts
        Map<Long, Long> reactionCounts = new HashMap<>();
        Set<Long> userReactedIds = new HashSet<>();

        if (!reviewIds.isEmpty()) {
            for (Object[] row : reviewReactionRepository.countReactionsByReviewIds(reviewIds)) {
                Long rId = (Long) row[0];
                Long count = (Long) row[1];
                reactionCounts.put(rId, count);
            }
            if (currentUserId != null) {
                userReactedIds.addAll(reviewReactionRepository.findReactedReviewIdsByCustomer(reviewIds, currentUserId));
            }
        }

        // Map DTOs
        List<ReviewItemDto> reviewDtos = content.stream().map(model -> {
            long helpfulCount = reactionCounts.getOrDefault(model.getId(), 0L);
            boolean userHasReacted = userReactedIds.contains(model.getId());
            return CustomerReviewMapper.toDto(model, helpfulCount, userHasReacted);
        }).toList();

        // Calculate summary across all published reviews of workspace
        List<CustomerReviewModel> allWorkspaceReviews = customerReviewRepository.findAllPublishedByWorkspaceId(
                workspaceId, ReviewStatus.PUBLISHED);

        double avgRating = 0.0;
        Map<String, Double> dimensionAverages = new LinkedHashMap<>();

        if (!allWorkspaceReviews.isEmpty()) {
            double totalRating = allWorkspaceReviews.stream()
                    .mapToInt(CustomerReviewModel::getRating)
                    .sum();
            avgRating = BigDecimal.valueOf(totalRating / allWorkspaceReviews.size())
                    .setScale(2, RoundingMode.HALF_UP)
                    .doubleValue();

            Map<String, List<Integer>> dimAccumulator = new LinkedHashMap<>();
            for (CustomerReviewModel rev : allWorkspaceReviews) {
                String dimJson = rev.getDimensionRatings();
                if (dimJson != null && !dimJson.isBlank()) {
                    try {
                        Map<String, Integer> dims = OBJECT_MAPPER.readValue(dimJson, new TypeReference<Map<String, Integer>>() {});
                        dims.forEach((key, val) -> {
                            if (val != null) {
                                dimAccumulator.computeIfAbsent(key, k -> new ArrayList<>()).add(val);
                            }
                        });
                    } catch (Exception ignored) {
                    }
                }
            }

            dimAccumulator.forEach((key, list) -> {
                if (!list.isEmpty()) {
                    double dimAvg = list.stream().mapToInt(Integer::intValue).average().orElse(0.0);
                    dimensionAverages.put(key, BigDecimal.valueOf(dimAvg).setScale(1, RoundingMode.HALF_UP).doubleValue());
                }
            });
        }

        return ReviewSummaryResponseDto.builder()
                .averageRating(avgRating)
                .totalReviews(allWorkspaceReviews.size())
                .dimensionAverages(dimensionAverages)
                .reviews(reviewDtos)
                .build();
    }

    @Override
    @Transactional
    public boolean toggleHelpfulReaction(Long reviewId, Long customerId) {
        CustomerReviewModel review = customerReviewRepository.findById(reviewId)
                .orElseThrow(() -> new NotFoundException("Review not found: " + reviewId));

        var customer = userRepository.findById(customerId)
                .orElseThrow(() -> new NotFoundException("User not found: " + customerId));

        if (reviewReactionRepository.existsByIdReviewIdAndIdCustomerId(reviewId, customerId)) {
            reviewReactionRepository.deleteByIdReviewIdAndIdCustomerId(reviewId, customerId);
            return false;
        } else {
            ReviewReactionModel reaction = new ReviewReactionModel();
            reaction.setId(new ReviewReactionModel.Key(reviewId, customerId));
            reaction.setReview(review);
            reaction.setCustomer(customer);
            reviewReactionRepository.save(reaction);
            return true;
        }
    }
}
