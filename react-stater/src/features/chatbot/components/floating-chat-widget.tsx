import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import {
  Bot,
  Send,
  X,
  Minus,
  RotateCcw,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { useChatbot } from '../hooks/use-chatbot';
import { ChatMessageItem } from './chat-message-item';

export function FloatingChatWidget() {
  const {
    messages,
    isLoading,
    isOpen,
    isMinimized,
    hasUnread,
    toggleChat,
    toggleMinimize,
    closeChat,
    clearHistory,
    sendMessage
  } = useChatbot();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tự động cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen, isMinimized]);

  // Focus input khi mở chat
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className='fixed bottom-20 right-4 sm:bottom-5 sm:right-5 z-40 flex flex-col items-end pointer-events-none'>
      {/* ── CỬA SỔ HỘI THOẠI CHATBOT ── */}
      {isOpen && (
        <div
          className={`pointer-events-auto mb-3 flex flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl transition-all duration-300 ease-out ${
            isMinimized
              ? 'h-14 w-80'
              : 'h-[530px] w-[370px] sm:w-[410px]'
          }`}
        >
          {/* Header */}
          <div className='flex items-center justify-between border-b border-border bg-muted/50 px-3.5 py-2.5 select-none'>
            <div className='flex items-center gap-2'>
              <div className='relative flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20'>
                <Bot className='h-4.5 w-4.5' />
                <span className='absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background' />
              </div>
              <div className='flex flex-col'>
                <div className='flex items-center gap-1.5'>
                  <span className='text-xs font-semibold text-foreground leading-none'>NexBot AI</span>
                  <span className='inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-medium text-primary'>
                    <Sparkles className='h-2.5 w-2.5' />
                    Trợ lý ảo
                  </span>
                </div>
                <span className='text-[10px] text-muted-foreground mt-0.5'>Luôn sẵn sàng hỗ trợ bạn</span>
              </div>
            </div>

            <div className='flex items-center gap-1 text-muted-foreground'>
              {!isMinimized && (
                <button
                  type='button'
                  onClick={clearHistory}
                  title='Làm mới cuộc trò chuyện'
                  className='rounded-md p-1.5 hover:bg-muted hover:text-foreground transition-colors'
                >
                  <RotateCcw className='h-3.5 w-3.5' />
                </button>
              )}
              <button
                type='button'
                onClick={toggleMinimize}
                title={isMinimized ? 'Mở rộng' : 'Thu nhỏ'}
                className='rounded-md p-1.5 hover:bg-muted hover:text-foreground transition-colors'
              >
                {isMinimized ? <Maximize2 className='h-3.5 w-3.5' /> : <Minus className='h-3.5 w-3.5' />}
              </button>
              <button
                type='button'
                onClick={closeChat}
                title='Đóng'
                className='rounded-md p-1.5 hover:bg-destructive/15 hover:text-destructive transition-colors'
              >
                <X className='h-3.5 w-3.5' />
              </button>
            </div>
          </div>

          {/* Body tin nhắn */}
          {!isMinimized && (
            <>
              <div className='flex-1 overflow-y-auto p-3.5 space-y-3.5 scrollbar-thin'>
                {messages.map((msg) => (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    onSelectSuggestion={sendMessage}
                    disabledSuggestions={isLoading}
                  />
                ))}

                {/* Loading typing indicator */}
                {isLoading && (
                  <div className='flex items-center gap-2 text-muted-foreground text-xs pl-2'>
                    <div className='flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20'>
                      <Bot className='h-3.5 w-3.5' />
                    </div>
                    <div className='flex items-center gap-1 rounded-2xl bg-muted/60 px-3 py-2 border border-border/40'>
                      <span className='h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]' />
                      <span className='h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]' />
                      <span className='h-1.5 w-1.5 rounded-full bg-primary animate-bounce' />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Footer Input Bar */}
              <div className='border-t border-border bg-background p-2.5'>
                <div className='flex items-center gap-1.5 rounded-xl border border-input bg-muted/30 px-3 py-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary'>
                  <input
                    ref={inputRef}
                    type='text'
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    placeholder='Hỏi NexBot về đặt chỗ, thanh toán, đối tác...'
                    className='flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50'
                  />
                  <button
                    type='button'
                    disabled={!input.trim() || isLoading}
                    onClick={handleSend}
                    className='flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs transition-opacity hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none'
                  >
                    <Send className='h-3.5 w-3.5' />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── NÚT NỔI TRIGGER (FLOATING ACTION BUTTON) ── */}
      <button
        type='button'
        onClick={toggleChat}
        className='pointer-events-auto relative flex h-13 w-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40'
        aria-label='Mở trợ lý ảo NexBot'
      >
        <Bot className='h-6 w-6' />
        <span className='sr-only'>Trợ lý ảo AI NexBot</span>

        {/* Unread notification ping */}
        {hasUnread && !isOpen && (
          <span className='absolute -top-1 -right-1 flex h-4 w-4'>
            <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75' />
            <span className='relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] font-bold text-white items-center justify-center'>
              1
            </span>
          </span>
        )}

        {/* Pulse ring animation */}
        {!isOpen && (
          <span className='absolute inset-0 rounded-full border border-primary/30 animate-pulse pointer-events-none' />
        )}
      </button>
    </div>
  );
}
