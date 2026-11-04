/* eslint-disable unicorn/require-post-message-target-origin */
/**
 * Cross-tab & multi-window Realtime Authentication Synchronization Utility
 *
 * Automatically synchronizes auth state across tabs and devices:
 * - Email verified (via link in Gmail)
 * - Password reset token received / validated
 * - Password reset completed
 * - Active tab discovery to prevent duplicate tabs when clicking external links
 */

export type AuthSyncEvent =
  | { type: 'EMAIL_VERIFIED_SUCCESS'; email?: string }
  | { type: 'CHECK_EXISTING_SIGNUP_TAB' }
  | { type: 'SIGNUP_TAB_ALREADY_ACTIVE' }
  | { type: 'CHECK_EXISTING_RESET_TAB' }
  | { type: 'RESET_TAB_ALREADY_ACTIVE' }
  | { type: 'RESET_TOKEN_CLICKED'; token: string; email?: string }
  | { type: 'RESET_PASSWORD_COMPLETED' };

const CHANNEL_NAME = 'nexspace_auth_sync';
const STORAGE_KEY = 'nexspace_auth_sync_event';

let sharedBroadcastChannel: BroadcastChannel | null = null;
function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!sharedBroadcastChannel) {
    try {
      sharedBroadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      sharedBroadcastChannel = null;
    }
  }
  return sharedBroadcastChannel;
}

/**
 * Broadcast an authentication event to all other open tabs / windows.
 */
export function broadcastAuthSync(event: AuthSyncEvent) {
  // 1. BroadcastChannel (modern zero-latency standard)
  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage(event);
    } catch {
      // Fallback silently
    }
  }

  // 2. localStorage event (robust fallback across all browsers and subdomains)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...event, _timestamp: Date.now() })
      );
    } catch {
      // Fallback silently
    }
  }
}

/**
 * Subscribe to authentication events from other tabs.
 * Returns an unsubscribe cleanup function.
 */
export function subscribeAuthSync(handler: (event: AuthSyncEvent) => void): () => void {
  let channel: BroadcastChannel | null = null;

  const messageListener = (e: MessageEvent) => {
    if (e.data && e.data.type) {
      handler(e.data as AuthSyncEvent);
    }
  };

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener('message', messageListener);
    } catch {
      // Fallback to storage event
    }
  }

  const storageListener = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.type) {
          handler(parsed as AuthSyncEvent);
        }
      } catch {
        // Ignore parse errors
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', storageListener);
  }

  return () => {
    if (channel) {
      channel.removeEventListener('message', messageListener);
      channel.close();
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', storageListener);
    }
  };
}
