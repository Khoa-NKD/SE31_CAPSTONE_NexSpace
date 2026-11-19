package base.api.feature.chat.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class BookingConversationResponseDTO {
    Long id;
    Long bookingId;
    String bookingCode;
    String bookingStatus;
    Long workspaceId;
    String workspaceName;
    String workspaceAddress;
    Long customerId;
    String customerName;
    String customerAvatarUrl;
    Long organizerId;
    String organizerName;
    String organizerAvatarUrl;
    LocalDateTime lastMessageAt;
    String lastMessagePreview;
    int unreadCount;
    LocalDateTime createdAt;
}
