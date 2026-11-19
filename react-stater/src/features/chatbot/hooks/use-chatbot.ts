import { useState, useEffect, useCallback } from 'react';
import type { ChatUiMessage, ChatMessageItem, ChatbotRequestDto } from '../api/types';
import { chatbotService } from '../api/service';

const STORAGE_KEY = 'nexspace_chatbot_history_v1';

const INITIAL_MESSAGE: ChatUiMessage = {
  id: 'welcome-msg',
  role: 'assistant',
  content: `Xin chào! 👋 Tôi là **NexBot** – Trợ lý AI thông minh của **NexSpace**.

Tôi có thể hỗ trợ bạn tìm hiểu và giải đáp mọi thông tin về nền tảng:
* 🏢 **Không gian làm việc & Đặt chỗ**: Bàn Focus Desk, Phòng họp Meeting Room.
* ⏱️ **Giữ chỗ tạm thời 10 phút**: Cơ chế giữ chỗ an toàn chống đặt trùng lặp.
* 💳 **Thanh toán trực tuyến**: Quét mã VietQR tiện lợi qua PayOS.
* 🤝 **Dành cho Đối tác (Organizer)**: Quy trình nộp hồ sơ, ký hợp đồng điện tử và tạo mặt bằng với Floor AI Studio.

Bạn muốn tìm hiểu nội dung nào trước?`,
  timestamp: new Date().toISOString(),
  suggestedQuestions: [
    'Quy trình đặt chỗ tại NexSpace như thế nào?',
    'Cơ chế giữ chỗ tạm thời 10 phút là gì?',
    'Làm thế nào để trở thành đối tác Organizer?',
    'Các hình thức thanh toán được hỗ trợ?'
  ]
};

export function useChatbot() {
  const [messages, setMessages] = useState<ChatUiMessage[]>([INITIAL_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Khởi tạo từ LocalStorage khi mount trên client
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // Bỏ qua lỗi parsing storage
    }
  }, []);

  // Lưu tin nhắn vào LocalStorage mỗi khi thay đổi
  const saveToStorage = useCallback((newMessages: ChatUiMessage[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMessages));
    } catch {
      // Bỏ qua lỗi storage quota
    }
  }, []);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setIsMinimized(false);
    setHasUnread(false);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsMinimized(false);
        setHasUnread(false);
      }
      return next;
    });
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const clearHistory = useCallback(() => {
    const resetList = [
      {
        ...INITIAL_MESSAGE,
        timestamp: new Date().toISOString()
      }
    ];
    setMessages(resetList);
    saveToStorage(resetList);
  }, [saveToStorage]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      const userMessage: ChatUiMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toISOString()
      };

      const updatedWithUser = [...messages, userMessage];
      setMessages(updatedWithUser);
      saveToStorage(updatedWithUser);
      setIsLoading(true);

      // Chuẩn bị tối đa 6 tin nhắn lịch sử gần nhất để gửi kèm ngữ cảnh
      const historyPayload: ChatMessageItem[] = updatedWithUser
        .slice(-6)
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          content: m.content
        }));

      const requestPayload: ChatbotRequestDto = {
        message: trimmed,
        history: historyPayload
      };

      try {
        const res = await chatbotService.sendMessage(requestPayload);

        const botMessage: ChatUiMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: res.reply,
          timestamp: res.serverTime || new Date().toISOString(),
          suggestedQuestions: res.suggestedQuestions,
          isFallback: res.isFallback
        };

        const finalMessages = [...updatedWithUser, botMessage];
        setMessages(finalMessages);
        saveToStorage(finalMessages);

        if (!isOpen) {
          setHasUnread(true);
        }
      } catch {
        // Fallback nhẹ nếu mất kết nối mạng phía Client
        const fallbackMessage: ChatUiMessage = {
          id: `bot-fallback-${Date.now()}`,
          role: 'assistant',
          content: `Hiện tại hệ thống kết nối AI đang bận hoặc gián đoạn mạng. 
          
Bạn vẫn có thể tham khảo các thông tin cơ bản về NexSpace:
* **Đặt chỗ**: Xem danh sách không gian tại mục [Không gian](/workspaces).
* **Giữ chỗ 10 phút**: Hệ thống tự động khóa vị trí trong 10 phút sau khi chọn.
* **Thanh toán**: Hỗ trợ quét VietQR nhanh chóng qua PayOS.`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            'Quy trình đặt chỗ tại NexSpace như thế nào?',
            'Cơ chế giữ chỗ tạm thời 10 phút là gì?'
          ],
          isFallback: true
        };

        const finalMessages = [...updatedWithUser, fallbackMessage];
        setMessages(finalMessages);
        saveToStorage(finalMessages);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, isOpen, saveToStorage]
  );

  return {
    messages,
    isLoading,
    isOpen,
    isMinimized,
    hasUnread,
    openChat,
    closeChat,
    toggleChat,
    toggleMinimize,
    clearHistory,
    sendMessage
  };
}
