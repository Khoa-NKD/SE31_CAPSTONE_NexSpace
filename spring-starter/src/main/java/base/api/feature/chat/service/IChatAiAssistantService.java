package base.api.feature.chat.service;

import base.api.feature.chat.dto.request.AiToneAdjustmentRequestDTO;
import base.api.feature.chat.dto.response.AiSmartRepliesResponseDTO;
import base.api.feature.chat.dto.response.AiToneAdjustmentResponseDTO;

public interface IChatAiAssistantService {

    AiSmartRepliesResponseDTO generateSmartReplies(Long conversationId, Long callerId);

    AiToneAdjustmentResponseDTO adjustTone(Long conversationId, Long callerId, AiToneAdjustmentRequestDTO request);

    void respondToMention(Long conversationId, Long senderId, String userMessage);
}
