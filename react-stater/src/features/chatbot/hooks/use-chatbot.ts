import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useRouter } from '@tanstack/react-router';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/features/auth/store/auth-store';
import type { ResourceAvailabilityItem } from '@/features/workspaces/api/booking-types';
import { chatbotService } from '../api/service';
import type { ChatUiMessage, ChatMessageItem, ChatbotRequestDto } from '../api/types';

const STORAGE_KEY = 'nexspace_chatbot_history_v1';
const GUIDED_STORAGE_KEY = 'nexspace_guided_booking_active';

function resolveUserRole(isAuthenticated: boolean, role?: string | null, roles?: string[]): string {
  if (!isAuthenticated) return 'GUEST';
  const candidates = [role, ...(roles ?? [])]
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.toUpperCase().replace(/^ROLE_/, ''));
  if (candidates.includes('ADMIN')) return 'ADMIN';
  if (candidates.includes('ORGANIZER')) return 'ORGANIZER';
  return 'CUSTOMER';
}

function resolveWorkspaceId(pathname: string, search: Record<string, unknown>): number | undefined {
  const pathMatch = pathname.match(/^\/workspaces\/(\d+)(?:\/|$)/);
  if (pathMatch) {
    const id = Number(pathMatch[1]);
    if (Number.isInteger(id) && id > 0) return id;
  }
  const searchWsId = Number(search.workspaceId);
  if (Number.isInteger(searchWsId) && searchWsId > 0) return searchWsId;
  return undefined;
}

function buildInitialMessage(role: string): ChatUiMessage {
  if (role === 'ORGANIZER') {
    return {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Xin chào Đối tác! 👋 Tôi là **NexBot** – Trợ lý AI của **NexSpace**.

Tôi có thể hỗ trợ tra cứu và hướng dẫn chi tiết kèm link thao tác nhanh:
* 📝 **Hồ sơ & Hợp đồng điện tử**: Nộp hồ sơ, ký OTP SHA-256 và theo dõi duyệt.
* 🎨 **Floor Plan AI Studio**: Thiết kế mặt bằng, phân khu và chỗ ngồi/phòng.
* 💰 **Bảng giá & Tiện ích add-on**: Thiết lập phụ thu, tiện ích trả phí, lịch nghỉ/bảo trì.
* 💳 **Doanh thu & Payout**: Theo dõi số dư \`HELD\` / khả dụng và rút tiền về ngân hàng.

Bạn muốn kiểm tra nội dung nào?`,
      timestamp: new Date().toISOString(),
      suggestedQuestions: [
        'Quy trình đăng ký và ký hợp đồng Organizer như thế nào?',
        'Số dư HELD và cách rút tiền Payout hoạt động ra sao?',
        'Cách thiết lập giá, tiện ích add-on và Floor AI Studio?',
        'Hồ sơ Organizer hiện tại của tôi đang ở trạng thái nào?'
      ]
    };
  }

  if (role === 'ADMIN') {
    return {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Xin chào Quản trị viên! 👋 Tôi là **NexBot** – Trợ lý AI của **NexSpace**.

Tôi sẵn sàng tra cứu nghiệp vụ và điều hướng nhanh đến các màn hình quản trị:
* 📝 **Kiểm duyệt**: Duyệt hồ sơ Organizer và Workspace chờ kích hoạt.
* 💳 **Tài chính**: Đối soát PayOS, duyệt hoàn tiền Payout và chi trả đối tác.
* ⚖️ **Giám sát**: Xử lý tranh chấp, báo cáo và cấu hình quy tắc hệ thống.

Bạn cần tra cứu mục nào?`,
      timestamp: new Date().toISOString(),
      suggestedQuestions: [
        'Quy trình duyệt hồ sơ Organizer và Workspace ở đâu?',
        'Cách xử lý hoàn tiền PayOS Payout và đối soát?',
        'Các mức giữ chỗ và phạt spam hold hiện hành?'
      ]
    };
  }

  return {
    id: 'welcome-msg',
    role: 'assistant',
    content: `Xin chào! 👋 Tôi là **NexBot** – Trợ lý AI thông minh của **NexSpace**.

Tôi được kết nối dữ liệu thực của hệ thống để hỗ trợ bạn tìm kiếm và hướng dẫn từng bước:
* 📍 **Tìm không gian & tra giá thật**: Gợi ý \`Focus Desk\`, \`Meeting Room\` đang mở kèm địa chỉ và bảng giá.
* ⏱️ **Giữ chỗ tạm thời (Temporary Hold)**: Bảo vệ chống đặt trùng và quy định hạn mức giữ chỗ.
* 💳 **Thanh toán PayOS & Hoàn tiền**: Quét mã VietQR tức thì, xem chính sách hủy và xuất hóa đơn điện tử.
* 🤝 **Dành cho Đối tác (Organizer)**: Nộp hồ sơ, ký hợp đồng OTP và thiết kế mặt bằng với Floor AI Studio.

Bạn muốn tìm hiểu nội dung nào trước?`,
    timestamp: new Date().toISOString(),
    suggestedQuestions: [
      '🎯 Hướng dẫn đặt chỗ theo trang hiện tại',
      'Tìm các không gian đang hoạt động và bảng giá?',
      'Quy trình đặt chỗ 6 bước tại NexSpace như thế nào?',
      'Cơ chế giữ chỗ tạm thời và chính sách hoàn tiền?'
    ]
  };
}

function formatVnd(val?: number) {
  if (!val) return '0';
  return new Intl.NumberFormat('vi-VN').format(val);
}

export function useChatbot() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userRole = useMemo(
    () => resolveUserRole(isAuthenticated, user?.role, user?.roles),
    [isAuthenticated, user?.role, user?.roles]
  );

  const [messages, setMessages] = useState<ChatUiMessage[]>(() => {
    if (typeof window === 'undefined') return [buildInitialMessage('GUEST')];
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage parse error
    }
    return [buildInitialMessage(userRole)];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const location = useLocation();
  const router = useRouter();
  const pathname = location.pathname;
  const search = useMemo(() => (location.search || {}) as Record<string, unknown>, [location.search]);
  const workspaceId = useMemo(() => resolveWorkspaceId(pathname, search), [pathname, search]);

  const [isGuidedBookingActive, setIsGuidedBookingActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(GUIDED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const lastNotifiedKeyRef = useRef<string>('');

  const saveToStorage = useCallback((newMessages: ChatUiMessage[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newMessages));
    } catch {
      // Ignore storage quota error
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
    const resetList = [buildInitialMessage(userRole)];
    setMessages(resetList);
    saveToStorage(resetList);
  }, [saveToStorage, userRole]);

  /**
   * Kích hoạt nội dung hướng dẫn từng bước theo ngữ cảnh trang hiện tại
   */
  const triggerContextualGuidance = useCallback(
    async (path: string, searchParams: Record<string, unknown>, force = false) => {
      // 1. Landing Page hoặc trang chung ngoài luồng workspaces
      if (path === '/' || path === '' || (!path.startsWith('/workspaces') && !path.startsWith('/dashboard'))) {
        const key = 'step1_landing';
        if (!force && lastNotifiedKeyRef.current === key) return;
        lastNotifiedKeyRef.current = key;

        const msg: ChatUiMessage = {
          id: `bot-guide-${Date.now()}`,
          role: 'assistant',
          content: `🎯 **Bước 1: Khám phá & Chọn không gian làm việc**

Chế độ **Hướng dẫn đặt chỗ từng bước** đang bật! Hiện tại bạn đang ở trang chủ:
1. Mở trang [Khám phá Không gian](/workspaces) để lọc theo thành phố/quận, loại chỗ, giá và định vị GPS.
2. Nhấn vào không gian bạn thích để xem giờ mở cửa, tiện ích và chọn lịch sử dụng.

Tôi sẽ tự động cập nhật hướng dẫn bước tiếp theo ngay khi bạn chuyển trang!`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            '👉 Đi đến Khám phá Không gian',
            'Tìm các không gian đang hoạt động và bảng giá?',
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

      // 2. Trang danh sách không gian /workspaces
      if (path === '/workspaces' || path === '/workspaces/') {
        const key = 'step1_workspaces';
        if (!force && lastNotifiedKeyRef.current === key) return;
        lastNotifiedKeyRef.current = key;

        const msg: ChatUiMessage = {
          id: `bot-guide-${Date.now()}`,
          role: 'assistant',
          content: `🏢 **Bước 1.5: Chọn Không gian làm việc phù hợp**

Bạn đang ở trang [Khám phá Không gian](/workspaces)!
1. Sử dụng thanh tìm kiếm, bộ lọc nâng cao hoặc biểu tượng **Định vị GPS** để lọc theo khu vực và nhu cầu.
2. Nhấn **Xem chi tiết** vào một không gian để chọn ngày giờ và xem sơ đồ mặt bằng.`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            'Tìm các không gian đang hoạt động và bảng giá?',
            'Cơ chế giữ chỗ tạm thời hoạt động ra sao?',
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

      // 3. Trang chi tiết không gian /workspaces/:workspaceId
      const detailMatch = path.match(/^\/workspaces\/(\d+)$/);
      if (detailMatch) {
        const currentWsId = detailMatch[1];
        const key = `step2_detail_${currentWsId}`;
        if (!force && lastNotifiedKeyRef.current === key) return;
        lastNotifiedKeyRef.current = key;

        const msg: ChatUiMessage = {
          id: `bot-guide-${Date.now()}`,
          role: 'assistant',
          content: `📅 **Bước 2: Chọn lịch làm việc tại không gian #${currentWsId}**

1. Kiểm tra giờ mở cửa, ngày nghỉ lễ và tiện ích của không gian ngay trên trang này.
2. Tại khung **Lịch sử dụng** bên phải, chọn **Ngày làm việc**, **Giờ bắt đầu** và **Giờ kết thúc** (tối thiểu 30 phút).
3. Nhấn **Chọn chỗ ngồi & Đặt ngay** để chuyển sang [Sơ đồ chọn chỗ](/workspaces/seats?workspaceId=${currentWsId}).`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            'Không gian này có những tiện ích và giờ mở cửa thế nào?',
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

      // 4. Trang chọn chỗ /workspaces/seats
      if (path.startsWith('/workspaces/seats')) {
        const currentWsId = searchParams.workspaceId ? Number(searchParams.workspaceId) : undefined;
        const startTime = searchParams.startTime as string | undefined;
        const endTime = searchParams.endTime as string | undefined;
        const date = searchParams.date as string | undefined;

        const key = `step3_seats_${currentWsId}_${startTime}_${endTime}`;
        if (!force && lastNotifiedKeyRef.current === key) return;
        lastNotifiedKeyRef.current = key;

        let availableSeatsMarkdown = '';

        if (currentWsId) {
          try {
            const availability = await apiClient.get<ResourceAvailabilityItem[]>(
              `/public/workspaces/${currentWsId}/availability`,
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
              availableSeatsMarkdown = topItems
                .map((item) => {
                  const name = item.name || item.code || `Vị trí #${item.resourceId}`;
                  const price = item.pricePerHour ? `${formatVnd(item.pricePerHour)} đ/giờ` : 'Xem giá trên thẻ';
                  const zone = item.zoneName ? ` (${item.zoneName})` : '';
                  const queryParts = [`workspaceId=${currentWsId}`, `resourceId=${item.resourceId}`];
                  if (date) queryParts.push(`date=${encodeURIComponent(date)}`);
                  if (startTime) queryParts.push(`startTime=${encodeURIComponent(startTime)}`);
                  if (endTime) queryParts.push(`endTime=${encodeURIComponent(endTime)}`);
                  const seatUrl = `/workspaces/seats?${queryParts.join('&')}`;

                  return `* 🪑 **${name}** — **${price}**${zone} 👉 [Chọn vị trí này](${seatUrl})`;
                })
                .join('\n');
            } else {
              availableSeatsMarkdown =
                '_Hiện tại trong khung giờ này các chỗ ngồi đều đã kín hoặc đang bảo trì. Bạn hãy thử đổi sang khung giờ/ngày khác ở thanh công cụ phía trên nhé!_';
            }
          } catch {
            availableSeatsMarkdown = `* Chưa tải được danh sách chỗ trống theo khung giờ. Hãy chọn trực tiếp ghế/phòng trạng thái **Trống** trên sơ đồ hoặc mở lại [Sơ đồ chọn chỗ](/workspaces/seats?workspaceId=${currentWsId}).`;
          }
        } else {
          availableSeatsMarkdown =
            '* Vui lòng chọn một không gian từ trang [Khám phá Không gian](/workspaces) để xem chỗ trống.';
        }

        const msg: ChatUiMessage = {
          id: `bot-guide-${Date.now()}`,
          role: 'assistant',
          content: `🪑 **Bước 3: Chọn chỗ ngồi còn trống & Giữ chỗ tạm thời**

Các vị trí **đang còn trống** theo lịch bạn chọn:

${availableSeatsMarkdown}

👉 Nhấn vào vị trí ở trên (hoặc bấm trực tiếp trên sơ đồ 2D/3D) rồi xác nhận để hệ thống kích hoạt **Giữ chỗ tạm thời (Temporary Hold)** chống đặt trùng và chuyển sang bước thanh toán!`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            'Làm thế nào để thanh toán qua PayOS?',
            'Cơ chế giữ chỗ tạm thời và chống spam hold là gì?',
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

      // 5. Trang chi tiết ghế /workspaces/seat-detail
      if (path.startsWith('/workspaces/seat-detail')) {
        const currentWsId = searchParams.workspaceId ? Number(searchParams.workspaceId) : undefined;
        const key = `step3_seat_detail_${currentWsId}_${searchParams.resourceId ?? ''}`;
        if (!force && lastNotifiedKeyRef.current === key) return;
        lastNotifiedKeyRef.current = key;

        const msg: ChatUiMessage = {
          id: `bot-guide-${Date.now()}`,
          role: 'assistant',
          content: `🪑 **Bước 3.5: Kiểm tra thông số vị trí & Chuyển sang xác nhận**

1. Kiểm tra giá tạm tính theo khung giờ ở bảng đặt chỗ bên phải.
2. Nhấn **Tiếp tục đặt chỗ** để tạo giữ chỗ tạm thời và đi tới [Trang xác nhận đơn](/workspaces/review) — nơi bạn có thể chọn thêm tiện ích tính phí của không gian (nếu có) và thanh toán PayOS VietQR.`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            'Tiện ích trả phí add-on được tính như thế nào?',
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

      // 6. Trang xác nhận & thanh toán /workspaces/review
      if (path.startsWith('/workspaces/review')) {
        const key = 'step4_review';
        if (!force && lastNotifiedKeyRef.current === key) return;
        lastNotifiedKeyRef.current = key;

        const msg: ChatUiMessage = {
          id: `bot-guide-${Date.now()}`,
          role: 'assistant',
          content: `💳 **Bước 4: Chọn tiện ích add-on & Thanh toán PayOS VietQR**

Vị trí của bạn đang được hệ thống bảo vệ trong phiên **Giữ chỗ tạm thời (Temporary Hold)**.
1. Nếu không gian có tiện ích tính phí thêm (\`add-on\`), bạn có thể tích chọn trực tiếp trên thẻ thanh toán để hệ thống tính lại giá chuẩn server.
2. Kiểm tra chi tiết tiền thuê + VAT (**0đ** phí dịch vụ khách), rồi nhấn thanh toán để quét mã **VietQR qua PayOS**.`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            'Chính sách hủy đơn và hoàn tiền như thế nào?',
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

      // 7. Trang hoàn tất /workspaces/confirmation
      if (path.startsWith('/workspaces/confirmation')) {
        const key = 'step5_confirmation';
        if (!force && lastNotifiedKeyRef.current === key) return;
        lastNotifiedKeyRef.current = key;

        const msg: ChatUiMessage = {
          id: `bot-guide-${Date.now()}`,
          role: 'assistant',
          content: `🎉 **Chúc mừng bạn đã hoàn tất đặt chỗ thành công!**

* Mã đặt chỗ \`BK-...\` và vé QR check-in đã sẵn sàng trong [Đơn đặt chỗ của tôi](/workspaces/my-bookings) và gửi về email của bạn.
* Sau khi đơn ở trạng thái \`CONFIRMED\`, bạn cũng có thể nhắn tin trực tiếp với chủ không gian tại [Đơn đặt chỗ của tôi](/workspaces/my-bookings) hoặc [Tin nhắn hỗ trợ](/dashboard/chat).`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            'Đơn đặt chỗ hiện tại của tôi thế nào?',
            'Cách hủy đơn và nhận hoàn tiền?'
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
          } catch {
            // ignore
          }
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
      } catch {
        // ignore
      }
    }
    setIsOpen(true);
    setIsMinimized(false);
    void triggerContextualGuidance(pathname, search, true);
  }, [pathname, search, triggerContextualGuidance]);

  const stopGuidedBooking = useCallback(() => {
    setIsGuidedBookingActive(false);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(GUIDED_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    const cancelMsg: ChatUiMessage = {
      id: `bot-guide-cancel-${Date.now()}`,
      role: 'assistant',
      content:
        'Đã tạm dừng chế độ **Hướng dẫn đặt chỗ theo trang**. Bạn có thể bật lại bất kỳ lúc nào bằng nút La bàn trên thanh tiêu đề hoặc chọn `"🎯 Hướng dẫn đặt chỗ theo trang hiện tại"` nhé!',
      timestamp: new Date().toISOString(),
      suggestedQuestions: [
        '🎯 Hướng dẫn đặt chỗ theo trang hiện tại',
        'Quy trình đặt chỗ 6 bước tại NexSpace như thế nào?'
      ]
    };
    setMessages((prev) => {
      const next = [...prev, cancelMsg];
      saveToStorage(next);
      return next;
    });
  }, [saveToStorage]);

  useEffect(() => {
    if (isGuidedBookingActive) {
      void triggerContextualGuidance(pathname, search, false);
    }
  }, [pathname, search, isGuidedBookingActive, triggerContextualGuidance]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      if (/^👉 Đi đến Khám phá Không gian$/i.test(trimmed)) {
        void router.navigate({ to: '/workspaces' as never });
        return;
      }

      if (/^(Dừng hướng dẫn|Tạm dừng hướng dẫn|Hủy hướng dẫn)$/i.test(trimmed)) {
        stopGuidedBooking();
        return;
      }

      const isTriggeringPageTour =
        trimmed.includes('🎯 Hướng dẫn đặt chỗ theo trang hiện tại') ||
        /^(?:bật\s+)?hướng dẫn đặt chỗ theo trang(?:\s+hiện tại)?$|^guided booking$/i.test(trimmed);

      if (isTriggeringPageTour) {
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

      const historyPayload: ChatMessageItem[] = updatedWithUser.slice(-8).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        content: m.content
      }));

      const requestPayload: ChatbotRequestDto = {
        message: trimmed,
        history: historyPayload,
        userRole,
        workspaceId,
        currentPath: pathname
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
        const fallbackMessage: ChatUiMessage = {
          id: `bot-fallback-${Date.now()}`,
          role: 'assistant',
          content: `Hiện tại kết nối tới máy chủ AI đang bị gián đoạn tạm thời.

Bạn vẫn có thể truy cập nhanh các chức năng chính của **NexSpace**:
* 📍 **Tìm không gian & đặt chỗ**: 👉 [Khám phá Không gian](/workspaces)
* 🎫 **Quản lý đơn, QR & hoàn tiền**: 👉 [Đơn đặt chỗ của tôi](/workspaces/my-bookings)
* 🤝 **Đăng ký đối tác Organizer**: 👉 [Đăng ký Organizer](/organizer/apply)
* 📞 **Hỗ trợ trực tiếp**: Hotline **1900 6868** | Email **support@nexspace.vn**`,
          timestamp: new Date().toISOString(),
          suggestedQuestions: [
            '🎯 Hướng dẫn đặt chỗ theo trang hiện tại',
            'Quy trình đặt chỗ 6 bước tại NexSpace như thế nào?'
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
    [
      messages,
      isLoading,
      isOpen,
      userRole,
      workspaceId,
      pathname,
      saveToStorage,
      startGuidedBooking,
      stopGuidedBooking,
      router
    ]
  );

  return {
    messages,
    isLoading,
    isOpen,
    isMinimized,
    hasUnread,
    userRole,
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
