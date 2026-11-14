/**
 * Điều hướng SPA không tải lại trang (Zero-Reload SPA Navigation Helper).
 * Giúp các module phi giao diện (api-client, store) kích hoạt chuyển trang qua TanStack Router mà không cần window.location.reload().
 */

type NavigateFn = (path: string) => void;
let customNavigateFn: NavigateFn | null = null;

export function registerSpaNavigator(fn: NavigateFn | null): void {
  customNavigateFn = fn;
}

export function spaNavigate(path: string): void {
  if (customNavigateFn) {
    try {
      customNavigateFn(path);
      return;
    } catch {
      // Fallback nếu router chưa sẵn sàng
    }
  }

  if (typeof window !== 'undefined') {
    window.location.href = path;
  }
}

