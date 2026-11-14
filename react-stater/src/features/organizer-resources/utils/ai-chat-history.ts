export interface FloorChatMessage {
  role: 'user' | 'assistant';
  text: string;
  image?: string;
  kind?: 'warning';
}
const MAX_MESSAGES = 200;
const MAX_SAVED_IMAGES = 8;
const MAX_THUMBNAIL_LENGTH = 160_000;

function safeThumbnail(image: unknown): image is string {
  return typeof image === 'string' && image.length <= MAX_THUMBNAIL_LENGTH &&
    image.startsWith('data:image/jpeg;base64,');
}

export function parseFloorChat(raw: string | null): FloorChatMessage[] {
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is FloorChatMessage =>
          !!item &&
          (item.role === 'user' || item.role === 'assistant') &&
          typeof item.text === 'string'
      )
      .slice(-MAX_MESSAGES)
      .map(({ role, text, kind, image }) => ({
        role,
        text: text.slice(0, 4000),
        ...(role === 'user' && safeThumbnail(image) ? { image } : {}),
        ...(role === 'assistant' && kind === 'warning' ? { kind } : {})
      }));
  } catch {
    return [];
  }
}
export function readFloorChat(key: string): FloorChatMessage[] {
  try {
    return typeof window === 'undefined' ? [] : parseFloorChat(window.localStorage.getItem(key));
  } catch {
    return [];
  }
}
export function writeFloorChat(key: string, messages: FloorChatMessage[]) {
  const recent = messages.slice(-MAX_MESSAGES);
  const textMessages = recent.map(({ role, text, kind }) => ({ role, text: text.slice(0, 4000), kind }));
  const thumbs = recent.map((item, index) => item.role === 'user' && safeThumbnail(item.image) ? index : -1)
    .filter((index) => index >= 0).slice(-MAX_SAVED_IMAGES);
  try {
    window.localStorage.setItem(key, JSON.stringify(textMessages.map((item, index) =>
      thumbs.includes(index) ? { ...item, image: recent[index].image } : item)));
    return true;
  } catch {
    try { window.localStorage.setItem(key, JSON.stringify(textMessages)); } catch { /* Keep the previous history. */ }
    return false;
  }
}
/** Only a bounded text excerpt accompanies a new request; current instructions always remain last. */
export function promptWithFloorHistory(prompt: string, messages: FloorChatMessage[]): string {
  const remaining = 4000 - prompt.length - 120;
  if (remaining < 200 || !messages.length) return prompt;
  const context = messages
    .filter((item) => item.kind !== 'warning')
    .slice(-4)
    .map((item) => item.role + ': ' + item.text.slice(0, 400))
    .join('\n')
    .slice(-Math.min(1500, remaining));
  if (!context) return prompt;
  return (
    'Previous conversation (context only, current saved layout is authoritative):\n' +
    context +
    '\nCurrent request:\n' +
    prompt
  );
}
