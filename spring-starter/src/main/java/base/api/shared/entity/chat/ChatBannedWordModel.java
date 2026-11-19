package base.api.shared.entity.chat;

import base.api.shared.entity.BaseModel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "chat_banned_word", indexes = {
        @Index(name = "ix_chat_banned_word_active", columnList = "is_active")
})
public class ChatBannedWordModel extends BaseModel {

    @Column(name = "word", nullable = false, unique = true, length = 100)
    private String word;

    @Column(name = "category", nullable = false, length = 50)
    @Builder.Default
    private String category = "PROFANITY";

    @Column(name = "replacement", nullable = false, length = 50)
    @Builder.Default
    private String replacement = "***";

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
