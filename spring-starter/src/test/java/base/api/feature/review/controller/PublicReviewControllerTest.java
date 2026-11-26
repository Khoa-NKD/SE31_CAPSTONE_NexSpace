package base.api.feature.review.controller;

import base.api.feature.review.dto.response.ReviewItemDto;
import base.api.feature.review.dto.response.ReviewSummaryResponseDto;
import base.api.feature.review.service.IPublicReviewService;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PublicReviewControllerTest {

    private MockMvc mockMvc;

    @Mock
    private IPublicReviewService reviewService;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private PublicReviewController controller;

    @BeforeEach
    void setUp() {
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/public/workspaces/{workspaceId}/reviews - Lấy danh sách reviews thành công")
    void testGetReviews_Success() throws Exception {
        when(currentUserProvider.getCurrentUser()).thenReturn(Optional.empty());

        ReviewItemDto item = ReviewItemDto.builder()
                .id(1L)
                .authorName("Minh Hien")
                .avatarUrl("https://example.com/avatar.png")
                .rating(5)
                .content("Khong gian tuyet voi")
                .dimensionRatings(Map.of("cleanliness", 5))
                .helpfulCount(4)
                .createdAt(LocalDateTime.now())
                .build();

        ReviewSummaryResponseDto summary = ReviewSummaryResponseDto.builder()
                .averageRating(4.9)
                .totalReviews(10)
                .dimensionAverages(Map.of("cleanliness", 4.9))
                .reviews(List.of(item))
                .build();

        when(reviewService.getWorkspaceReviews(eq(1L), isNull(), isNull())).thenReturn(summary);

        mockMvc.perform(get("/api/v1/public/workspaces/1/reviews")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.averageRating").value(4.9))
                .andExpect(jsonPath("$.data.totalReviews").value(10))
                .andExpect(jsonPath("$.data.reviews[0].authorName").value("Minh Hien"));

        verify(reviewService).getWorkspaceReviews(1L, null, null);
    }
}
