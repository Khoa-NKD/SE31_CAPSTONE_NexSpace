/**
 * Cấu trúc tin nhắn gửi trong mảng lịch sử tới API Gemini.
 */
export interface ChatMessageItem {
  role: 'user' | 'model';
  content: string;
}

/**
 * Payload yêu cầu gửi câu hỏi tới Chatbot AI.
 */
export interface ChatbotRequestDto {
  message: string;
  history?: ChatMessageItem[];
  userRole?: string;
  workspaceId?: number;
}

/**
 * Dữ liệu phản hồi từ Chatbot AI.
 */
export interface ChatbotResponseDto {
  reply: string;
  suggestedQuestions?: string[];
  serverTime: string;
  isFallback?: boolean;
}

/**
 * Mô hình tin nhắn hiển thị trên giao diện người dùng.
 */
export interface ChatUiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedQuestions?: string[];
  isFallback?: boolean;
}
