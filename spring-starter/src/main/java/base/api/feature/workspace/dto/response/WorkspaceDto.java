package base.api.feature.workspace.dto.response;

import base.api.shared.enums.BookingConfirmationMode;
import base.api.shared.enums.WorkspaceCategory;
import base.api.shared.enums.WorkspaceStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class WorkspaceDto {
    Long id;
    String name;
    WorkspaceCategory category;
    String description;
    String address;
    String streetAddress;
    String district;
    String city;
    BigDecimal latitude;
    BigDecimal longitude;
    BigDecimal areaSqm;
    BigDecimal usableAreaSqm;
    String supportPhone;
    BookingConfirmationMode bookingConfirmationMode;
    WorkspaceStatus status;
    String reviewStatus;
    String operatingStatus;
    String moderationStatus;
    String reviewFeedback;
    String reviewedBy;
    LocalDateTime reviewedAt;
    LocalDateTime submittedAt;
    boolean isListingVisible;
    Integer featuredOrder;
    LocalDateTime featuredUntil;
    Long organizerId;
    String organizerName;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
