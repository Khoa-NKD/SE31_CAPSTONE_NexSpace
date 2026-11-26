package base.api.feature.review.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.review.dto.response.ReviewSummaryResponseDto;
import base.api.feature.review.repository.ICustomerReviewRepository;
import base.api.feature.review.repository.IReviewReactionRepository;
import base.api.feature.review.service.impl.PublicReviewServiceImpl;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.review.CustomerReviewModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.ReviewStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PublicReviewServiceImplTest {

    @Mock
    private ICustomerReviewRepository customerReviewRepository;

    @Mock
    private IReviewReactionRepository reviewReactionRepository;

    @Mock
    private IWorkspaceRepository workspaceRepository;

    @Mock
    private IUserRepository userRepository;

    @InjectMocks
    private PublicReviewServiceImpl publicReviewService;

    private WorkspaceModel workspace;
    private CustomerReviewModel review1;

    @BeforeEach
    void setUp() {
        workspace = new WorkspaceModel();
        workspace.setId(1L);

        UserModel customer = new UserModel();
        customer.setId(10L);
        customer.setFirstName("Minh");
        customer.setLastName("Nguyen");
        customer.setAvatar("https://example.com/avatar.jpg");

        BookableResourceModel resource = new BookableResourceModel();
        resource.setId(27L);
        resource.setName("Desk A-06");
        resource.setLabel("A06");

        BookingModel booking = new BookingModel();
        booking.setId(100L);
        booking.setCustomer(customer);
        booking.setResource(resource);

        review1 = new CustomerReviewModel();
        review1.setId(50L);
        review1.setWorkspace(workspace);
        review1.setBooking(booking);
        review1.setRating(5);
        review1.setContent("Bàn làm việc rất êm, mạng nhanh.");
        review1.setDimensionRatings("{\"cleanliness\":5,\"facilities\":5,\"quietness\":4}");
        review1.setPhotoUrls("[\"https://example.com/photo1.jpg\"]");
        review1.setCreatedAt(LocalDateTime.now().minusDays(1));
        review1.setStatus(ReviewStatus.PUBLISHED);
    }

    @Test
    @DisplayName("getWorkspaceReviews: success with dimension ratings and reactions")
    void getWorkspaceReviews_success() {
        when(workspaceRepository.existsById(1L)).thenReturn(true);
        when(customerReviewRepository.findByWorkspaceIdAndOptionalResourceIdAndStatus(
                eq(1L), eq(27L), eq(ReviewStatus.PUBLISHED), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(review1)));

        List<Object[]> reactionRows = new java.util.ArrayList<>();
        reactionRows.add(new Object[]{50L, 12L});
        when(reviewReactionRepository.countReactionsByReviewIds(anyCollection()))
                .thenReturn(reactionRows);
        when(reviewReactionRepository.findReactedReviewIdsByCustomer(anyCollection(), eq(10L)))
                .thenReturn(List.of(50L));
        when(customerReviewRepository.findAllPublishedByWorkspaceId(1L, ReviewStatus.PUBLISHED))
                .thenReturn(List.of(review1));

        ReviewSummaryResponseDto summary = publicReviewService.getWorkspaceReviews(1L, 27L, 10L);

        assertThat(summary).isNotNull();
        assertThat(summary.getAverageRating()).isEqualTo(5.0);
        assertThat(summary.getTotalReviews()).isEqualTo(1);
        assertThat(summary.getDimensionAverages()).containsEntry("cleanliness", 5.0);
        assertThat(summary.getReviews()).hasSize(1);

        var item = summary.getReviews().get(0);
        assertThat(item.getId()).isEqualTo(50L);
        assertThat(item.getAuthorName()).isEqualTo("Minh Nguyen");
        assertThat(item.getHelpfulCount()).isEqualTo(12L);
        assertThat(item.isUserHasReacted()).isTrue();
        assertThat(item.getResourceCode()).isEqualTo("A06");
    }

    @Test
    @DisplayName("toggleHelpfulReaction: add then remove reaction")
    void toggleHelpfulReaction_success() {
        when(customerReviewRepository.findById(50L)).thenReturn(Optional.of(review1));
        when(userRepository.findById(10L)).thenReturn(Optional.of(new UserModel()));

        when(reviewReactionRepository.existsByIdReviewIdAndIdCustomerId(50L, 10L))
                .thenReturn(false)
                .thenReturn(true);

        boolean added = publicReviewService.toggleHelpfulReaction(50L, 10L);
        assertThat(added).isTrue();
        verify(reviewReactionRepository).save(any());

        boolean removed = publicReviewService.toggleHelpfulReaction(50L, 10L);
        assertThat(removed).isFalse();
        verify(reviewReactionRepository).deleteByIdReviewIdAndIdCustomerId(50L, 10L);
    }
}
