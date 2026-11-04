package base.api.feature.workspace.dto.response;

import base.api.shared.enums.BookingConfirmationMode;
import base.api.shared.enums.WorkspaceCategory;
import base.api.shared.enums.WorkspaceStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class WorkspaceDetailDto {
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
    String entryInstructions;
    BookingConfirmationMode bookingConfirmationMode;
    WorkspaceStatus status;
    String reviewStatus;
    String operatingStatus;
    boolean isListingVisible;
    Integer version;
    LocalDateTime submittedAt;
    Long organizerId;
    String organizerName;
    List<WorkspaceOperatingHourDto> operatingHours;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
