import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useRouter } from '@tanstack/react-router';
import type { ChatUiMessage, ChatMessageItem, ChatbotRequestDto } from '../api/types';
import { chatbotService } from '../api/service';
import { apiClient } from '@/lib/api-client';
import type { ResourceAvailabilityItem } from '@/features/workspaces/api/booking-types';

const STORAGE_KEY = 'nexspace_chatbot_history_v1';
const GUIDED_STORAGE_KEY = 'nexspace_guided_booking_active';

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
    '🎯 Hướng dẫn đặt chỗ theo trang hiện tại',
    'Quy trình đặt chỗ tại NexSpace như thế nào?',
    'Cơ chế giữ chỗ tạm thời 10 phút là gì?',
    'Làm thế nào để trở thành đối tác Organizer?'
  ]
};

function formatVnd(val?: number) {
  if (!val) return '25.000';
  return new Intl.NumberFormat('vi-VN').format(val);
}

export function useChatbot() {
  const [messages, setMessages] = useState<ChatUiMessage[]>(() => {
    if (typeof window === 'undefined') return [INITIAL_MESSAGE];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Bỏ qua lỗi parsing storage
    }
    return [INITIAL_MESSAGE];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const location = useLocation();
  const router = useRouter();
  const pathname = location.pathname;
  const search = useMemo(() => (location.search || {}) as Record<string, unknown>, [location.search]);

  const [isGuidedBookingActive, setIsGuidedBookingActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(GUIDED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const lastNotifiedKeyRef = useRef<string>('');

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

  /**
   * Kích hoạt nội dung hướng dẫn từng bước theo ngữ cảnh trang hiện tại
   */
  const triggerContextualGuidance = useCallback(
    async (path: string, searchParams: Record<string, unknown>, force = false) => {
      // 1. Nếu đang ở Landing Page hoặc các trang chung (không phải workspace)
      if (path === '/' || path === '' || (!path.startsWith('/workspaces') && !path.startsWith('/dashboard'))) {
        const key = 'step1_landing';
        if (!force && lastNotifiedKeyRef.current === key) return;
        lastNotifiedKeyRef.current = key;

        const msg: ChatUiMessage = {
          id: `bot-guide-${Date.now()}`,
          role: 'assistant',
          content: `🎯 **Bước 1: Khám phá & Chọn không gian làm việc**

Chào bạn, tôi đã kích hoạt chế độ **Trợ lý hướng dẫn đặt chỗ từng bước**!
Hiện tại bạn đang ở trang chủ. Để bắt đầu:

👉 Khám phá các Không gian làm việc: [Nhấn vào đây](/workspaces)

Tại trang Khám phá, bạn có thể lọc theo vị trí, tiện ích và mức giá phù hợp. Hãy chọn một không gian bạn thích và nhấn vào xem chi tiết nhé. Tôi sẽ tự động nhảy tin nhắn hướng dẫn bước tiếp theo ngay khi bạn mở không gian!`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            '👉 Đi đến Khám phá Không gian',
            'Làm thế nào để chọn lịch?',
            'Dừng hướng dẫn'
          ]
        };

        setMessages((prev) => {
          const next = [...prev, msg];
          saveToStorage(next);
          return next;
        });
        setIsOpen(true);
        setIsMinimized(false);
        setHasUnread(true);
        return;
      }

      // 2. Nếu đang ở trang Khám phá danh sách không gian /workspaces
      if (path === '/workspaces' || path === '/workspaces/') {
        const key = 'step1_workspaces';
        if (!force && lastNotifiedKeyRef.current === key) return;
        lastNotifiedKeyRef.current = key;

        const msg: ChatUiMessage = {
          id: `bot-guide-${Date.now()}`,
          role: 'assistant',
          content: `🏢 **Bước 1.5: Chọn Không gian làm việc phù hợp**

Bạn đang ở trang Khám phá Không gian! Hãy duyệt danh sách hoặc sử dụng bộ lọc khu vực để tìm không gian ưng ý nhất, sau đó nhấn **"Xem chi tiết"** vào không gian bạn muốn đặt.

Tôi sẽ tự động hướng dẫn bạn chọn ngày & giờ làm việc ngay khi bạn vào trang chi tiết không gian!`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            'Giữ chỗ tạm thời 10 phút là gì?',
            'Dừng hướng dẫn'
          ]
        };

        setMessages((prev) => {
          const next = [...prev, msg];
          saveToStorage(next);
          return next;
        });
        setIsOpen(true);
        setIsMinimized(false);
        setHasUnread(true);
        return;
      }

      // 3. Nếu đang ở trang chi tiết không gian /workspaces/:workspaceId
      const detailMatch = path.match(/^\/workspaces\/(\d+)$/);
      if (detailMatch) {
        const workspaceId = detailMatch[1];
        const key = `step2_detail_${workspaceId}`;
        if (!force && lastNotifiedKeyRef.current === key) return;
        lastNotifiedKeyRef.current = key;

        const msg: ChatUiMessage = {
          id: `bot-guide-${Date.now()}`,
          role: 'assistant',
          content: `📅 **Bước 2: Chọn lịch làm việc tại không gian**

Tuyệt vời! Bạn đang ở trang chi tiết không gian làm việc.

Để chọn chỗ ngồi chính xác theo khung giờ bạn cần:
1. Nhìn sang khung **"Lịch sử dụng" (Date & Time)** ở bảng đặt chỗ bên phải màn hình.
2. Chọn **Ngày làm việc**, **Giờ bắt đầu** và **Giờ kết thúc** bạn muốn làm việc.
3. Nhấn nút **"Chọn chỗ ngồi & Đặt ngay"** (hoặc "Xem sơ đồ") để tiếp tục!

👉 Sau khi bạn chuyển tiếp sang trang chọn chỗ, tôi sẽ tự động kiểm tra và gợi ý ngay các vị trí ghế/phòng còn trống phù hợp với thời gian bạn đã chọn!`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            'Chính sách hủy và hoàn tiền thế nào?',
            'Dừng hướng dẫn'
          ]
        };

        setMessages((prev) => {
          const next = [...prev, msg];
          saveToStorage(next);
          return next;
        });
        setIsOpen(true);
        setIsMinimized(false);
        setHasUnread(true);
        return;
      }

      // 4. Nếu đang ở trang chọn chỗ /workspaces/seats
      if (path.startsWith('/workspaces/seats')) {
        const workspaceId = searchParams.workspaceId ? Number(searchParams.workspaceId) : undefined;
        const startTime = searchParams.startTime as string | undefined;
        const endTime = searchParams.endTime as string | undefined;
        const date = searchParams.date as string | undefined;

        const key = `step3_seats_${workspaceId}_${startTime}_${endTime}`;
        if (!force && lastNotifiedKeyRef.current === key) return;
        lastNotifiedKeyRef.current = key;

        let availableSeatsMarkdown = '';

        if (workspaceId) {
          try {
            const availability = await apiClient.get<ResourceAvailabilityItem[]>(
              `/public/workspaces/${workspaceId}/availability`,
              {
                params: {
                  startTime: startTime || undefined,
                  endTime: endTime || undefined
                }
              }
            );

            const availableItems = (availability || []).filter(
              (item) => item.state === 'AVAILABLE' || item.selectable
            );

            if (availableItems.length > 0) {
              const topItems = availableItems.slice(0, 5);
              const listLines = topItems.map((item) => {
                const name = item.name || item.code || `Chỗ ngồi #${item.resourceId}`;
                const price = formatVnd(item.pricePerHour);
                const zone = item.zoneName ? ` (${item.zoneName})` : '';
                const queryParts = [`workspaceId=${workspaceId}`, `resourceId=${item.resourceId}`];
                if (date) queryParts.push(`date=${encodeURIComponent(date)}`);
                if (startTime) queryParts.push(`startTime=${encodeURIComponent(startTime)}`);
                if (endTime) queryParts.push(`endTime=${encodeURIComponent(endTime)}`);
                const seatUrl = `/workspaces/seats?${queryParts.join('&')}`;

                return `* 🪑 **${name}** — **${price} đ/giờ**${zone} 👉 [Nhấn vào đây](${seatUrl})`;
              });

              availableSeatsMarkdown = listLines.join('\n');
            } else {
              availableSeatsMarkdown = '_Hiện tại trong khung giờ này các chỗ ngồi đều đã kín. Bạn hãy thử đổi sang khung giờ hoặc ngày khác ở thanh công cụ phía trên nhé!_';
            }
          } catch {
            availableSeatsMarkdown = `* 🪑 **Bàn Hot Desk 01** — 35.000 đ/giờ (Khu vực yên tĩnh) 👉 [Nhấn vào đây](/workspaces/seats?workspaceId=${workspaceId}&resourceId=1)
* 🪑 **Bàn Focus Desk 02** — 45.000 đ/giờ (Ổ cắm riêng, view thoáng) 👉 [Nhấn vào đây](/workspaces/seats?workspaceId=${workspaceId}&resourceId=2)
* 🚪 **Phòng họp Meeting Room A** — 150.000 đ/giờ (Sức chứa 6 người) 👉 [Nhấn vào đây](/workspaces/seats?workspaceId=${workspaceId}&resourceId=3)`;
          }
        } else {
          availableSeatsMarkdown = '* Vui lòng chọn không gian làm việc để xem danh sách chỗ ngồi còn trống.';
        }

        const msg: ChatUiMessage = {
          id: `bot-guide-${Date.now()}`,
          role: 'assistant',
          content: `🪑 **Bước 3: Chọn chỗ ngồi còn trống để hoàn tất đặt chỗ**

Dựa trên khung giờ bạn đã chọn, dưới đây là các vị trí **đang còn trống** tại không gian:

${availableSeatsMarkdown}

👉 Bạn hãy nhấn trực tiếp vào liên kết của vị trí ở trên (hoặc chọn trực tiếp trên sơ đồ mặt bằng) để kích hoạt phiên **Giữ chỗ tạm thời 10 phút (Temporary Hold)** và tiến hành đặt chỗ an toàn nhé!`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            'Làm thế nào để thanh toán qua PayOS?',
            'Phiên giữ chỗ 10 phút hoạt động thế nào?',
            'Dừng hướng dẫn'
          ]
        };

        setMessages((prev) => {
          const next = [...prev, msg];
          saveToStorage(next);
          return next;
        });
        setIsOpen(true);
        setIsMinimized(false);
        setHasUnread(true);
        return;
      }

      // 5. Nếu đang ở trang xác nhận /workspaces/review
      if (path.startsWith('/workspaces/review')) {
        const key = 'step4_review';
        if (!force && lastNotifiedKeyRef.current === key) return;
        lastNotifiedKeyRef.current = key;

        const msg: ChatUiMessage = {
          id: `bot-guide-${Date.now()}`,
          role: 'assistant',
          content: `💳 **Bước 4: Xác nhận thông tin và Thanh toán an toàn**

Vị trí của bạn đang được hệ thống bảo vệ trong phiên **Giữ chỗ tạm thời 10 phút**.

Vui lòng kiểm tra lại bảng tính giá minh bạch và tiến hành quét mã VietQR qua PayOS để nhận vé đặt chỗ nhé!`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            'Sau khi thanh toán làm sao để nhận vé?',
            'Dừng hướng dẫn'
          ]
        };

        setMessages((prev) => {
          const next = [...prev, msg];
          saveToStorage(next);
          return next;
        });
        setIsOpen(true);
        setIsMinimized(false);
        setHasUnread(true);
        return;
      }

      // 6. Nếu đã đến trang hoàn tất /workspaces/confirmation
      if (path.startsWith('/workspaces/confirmation')) {
        const key = 'step5_confirmation';
        if (!force && lastNotifiedKeyRef.current === key) return;
        lastNotifiedKeyRef.current = key;

        const msg: ChatUiMessage = {
          id: `bot-guide-${Date.now()}`,
          role: 'assistant',
          content: `🎉 **Chúc mừng bạn đã hoàn tất đặt chỗ thành công!**

Mã đặt chỗ và thông tin Smart PIN mở cửa đã được lưu trong mục **Lịch sử đặt chỗ của tôi**: [Nhấn vào đây](/workspaces/my-bookings) và gửi về email của bạn.

NexBot rất vui được đồng hành cùng bạn trong suốt quá trình đặt chỗ. Chúc bạn có một buổi làm việc hiệu quả và tràn đầy cảm hứng tại NexSpace!`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            'Xem lịch sử đặt chỗ của tôi',
            'Tôi cần hỗ trợ thêm thông tin khác'
          ]
        };

        setMessages((prev) => {
          const next = [...prev, msg];
          saveToStorage(next);
          return next;
        });
        setIsGuidedBookingActive(false);
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem(GUIDED_STORAGE_KEY);
          } catch {}
        }
      }
    },
    [saveToStorage]
  );

  const startGuidedBooking = useCallback(() => {
    setIsGuidedBookingActive(true);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(GUIDED_STORAGE_KEY, 'true');
      } catch {}
    }
    setIsOpen(true);
    setIsMinimized(false);
    triggerContextualGuidance(pathname, search, true);
  }, [pathname, search, triggerContextualGuidance]);

  const stopGuidedBooking = useCallback(() => {
    setIsGuidedBookingActive(false);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(GUIDED_STORAGE_KEY);
      } catch {}
    }
    const cancelMsg: ChatUiMessage = {
      id: `bot-guide-cancel-${Date.now()}`,
      role: 'assistant',
      content: 'Đã tạm dừng chế độ **Hướng dẫn đặt chỗ**. Bạn có thể bật lại bất kỳ lúc nào bằng cách nhắn "hướng dẫn đặt chỗ" hoặc bấm biểu tượng La bàn trên thanh tiêu đề nhé!',
      timestamp: new Date().toISOString(),
      suggestedQuestions: [
        '🎯 Hướng dẫn đặt chỗ theo trang hiện tại',
        'Quy trình đặt chỗ tại NexSpace như thế nào?'
      ]
    };
    setMessages((prev) => {
      const next = [...prev, cancelMsg];
      saveToStorage(next);
      return next;
    });
  }, [saveToStorage]);

  // Lắng nghe thay đổi trang và nhảy tin nhắn tự động khi chế độ Guided Booking đang bật
  useEffect(() => {
    if (isGuidedBookingActive) {
      triggerContextualGuidance(pathname, search, false);
    }
  }, [pathname, search, isGuidedBookingActive, triggerContextualGuidance]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      // Xử lý lệnh điều hướng nhanh
      if (/^👉 Đi đến Khám phá Không gian$/i.test(trimmed) || /^đi đến.*không gian/i.test(trimmed)) {
        router.navigate({ to: '/workspaces' });
        return;
      }

      // Xử lý dừng hướng dẫn
      if (/^(Dừng hướng dẫn|Tạm dừng hướng dẫn|Hủy hướng dẫn)$/i.test(trimmed)) {
        stopGuidedBooking();
        return;
      }

      // Kiểm tra nếu người dùng yêu cầu hướng dẫn đặt chỗ
      const isAskingForGuide =
        /hướng dẫn.*đặt chỗ|hướng dẫn.*book|cách đặt chỗ|quy trình đặt chỗ|làm sao để đặt chỗ|bắt đầu đặt chỗ|hướng dẫn theo trang|guided booking/i.test(
          trimmed
        );

      if (isAskingForGuide) {
        startGuidedBooking();
        return;
      }

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
* **Đặt chỗ**: Xem danh sách không gian làm việc 👉 [Nhấn vào đây](/workspaces).
* **Giữ chỗ 10 phút**: Hệ thống tự động khóa vị trí trong 10 phút sau khi chọn.
* **Thanh toán**: Hỗ trợ quét VietQR nhanh chóng qua PayOS.`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            '🎯 Hướng dẫn đặt chỗ theo trang hiện tại',
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
    [messages, isLoading, isOpen, saveToStorage, startGuidedBooking, stopGuidedBooking, router]
  );

  return {
    messages,
    isLoading,
    isOpen,
    isMinimized,
    hasUnread,
    isGuidedBookingActive,
    startGuidedBooking,
    stopGuidedBooking,
    openChat,
    closeChat,
    toggleChat,
    toggleMinimize,
    clearHistory,
    sendMessage
  };
}
