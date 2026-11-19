package base.api.feature.chat.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class BookingChatMessageResponseDTO {
    Long id;
    Long conversationId;
    Long senderId;
    String senderName;
    String senderRole;
    String senderAvatarUrl;
    String messageType;
    String content;
    String attachmentUrl;
    String attachmentName;
    boolean isRead;
    LocalDateTime createdAt;
}
