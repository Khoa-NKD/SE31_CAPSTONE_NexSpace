import { apiClient } from '@/lib/api-client';
import type { ChatbotRequestDto, ChatbotResponseDto } from './types';

export const chatbotService = {
  /**
   * Gửi câu hỏi tới AI Chatbot và nhận phản hồi cùng gợi ý câu hỏi tiếp theo
   */
  async sendMessage(dto: ChatbotRequestDto): Promise<ChatbotResponseDto> {
    return apiClient.post<ChatbotResponseDto>('/public/chat', dto);
  }
};
