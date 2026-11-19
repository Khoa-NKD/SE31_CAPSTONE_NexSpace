package base.api.shared.entity.chat;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "booking_chat_message", indexes = {
        @Index(name = "ix_chat_msg_conv_created", columnList = "conversation_id, created_at"),
        @Index(name = "ix_chat_msg_conv_id_desc", columnList = "conversation_id, id DESC")
})
public class BookingChatMessageModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private BookingConversationModel conversation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private UserModel sender;

    @Column(name = "message_type", nullable = false, length = 20)
    private String messageType = "TEXT";

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    @Column(name = "attachment_name", length = 255)
    private String attachmentName;

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;
}
