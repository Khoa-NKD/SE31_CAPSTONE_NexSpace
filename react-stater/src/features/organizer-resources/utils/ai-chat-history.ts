export interface FloorChatMessage {
  role: 'user' | 'assistant';
  text: string;
  image?: string;
  kind?: 'warning';
}
const MAX_MESSAGES = 200;
/** Persist text only. Reference images remain request-scoped and never enter browser storage. */
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
      .map(({ role, text, kind }) => ({
        role,
        text: text.slice(0, 4000),
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
  try {
    const textMessages = messages.slice(-MAX_MESSAGES).map(({ role, text, kind }) => ({
      role,
      text: text.slice(0, 4000),
      kind
    }));
    window.localStorage.setItem(key, JSON.stringify(textMessages));
    return true;
  } catch {
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
