import React, { useState, useRef, useEffect } from 'react';
import { Group, StoredOrder } from '@/types';
import { askSalesAssistant, ChatMessage } from '@/assistant/gemini';
import { Bot, Send, User, Sparkles } from 'lucide-react';

export interface AssistantChatProps {
  orders: StoredOrder[];
  groups: Group[];
}

export const AssistantChat: React.FC<AssistantChatProps> = ({ orders, groups }) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your breakfast sales assistant. Ask me anything about order counts, total revenue, top selling options, payment method breakdowns, or coupon performance. All numbers are computed directly from our verified sales data.',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await askSalesAssistant(apiKey, text, orders, groups);
      setMessages((prev) => [...prev, response]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: err.message || 'An unexpected error occurred.',
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    'How many orders?',
    'What is our total revenue?',
    'What is the best-selling option?',
    'Revenue by payment method',
    'What is our average order value?',
    'How many orders actually got the coupon?',
    'Orders on 2026-11-20',
    'Who is our best customer?',
  ];

  const isLiveKey = apiKey && apiKey !== 'your_gemini_api_key_here';

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-xs overflow-hidden flex flex-col h-[calc(100svh-120px)] sm:h-[650px] max-w-4xl mx-auto">

      {/* ── Header ── */}
      <div className="bg-slate-900 text-white px-3 sm:px-5 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-xs sm:text-sm text-white leading-tight truncate">
              Sales Assistant AI
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
              Live Sales Analytics · {orders.length} orders loaded
            </p>
          </div>
        </div>

        <div
          className={`flex items-center gap-1.5 text-[10px] sm:text-xs px-2.5 py-1 rounded-full font-medium shrink-0 whitespace-nowrap ${isLiveKey
            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/70'
            : 'bg-amber-950/80 text-amber-300 border border-amber-800/70'
            }`}
        >
          {isLiveKey ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>Online</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span>Offline Mode</span>
            </>
          )}
        </div>
      </div>

      {/* ── Chat Messages ── */}
      <div
        className="flex-1 overflow-y-auto px-3 py-3 sm:p-4 space-y-3 sm:space-y-4"
        data-testid="chat-messages-container"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            data-testid={`chat-message-${msg.sender}`}
            className={`flex items-start gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-sm bg-slate-900 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[80%] rounded-md px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm shadow-xs ${msg.sender === 'user'
                ? 'bg-amber-500 text-slate-950 font-medium'
                : msg.isError
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-slate-100 text-slate-900'
                }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
            </div>

            {msg.sender === 'user' && (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-sm bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-slate-500 text-xs italic pl-8 sm:pl-9">
            <Bot className="w-4 h-4 animate-spin text-amber-500" />
            <span>Analyzing sales data…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Bottom: Quick Prompts + Input ── */}
      <div className="border-t border-slate-200 bg-white shrink-0">

        {/* Quick Prompts */}
        <div className="px-3 pt-2.5 pb-2">
          <div className="flex items-center gap-1 mb-1.5">
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold tracking-widest uppercase">
              Quick Prompts
            </span>
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {sampleQuestions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSendMessage(q)}
                className="text-[11px] sm:text-xs bg-slate-50 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-slate-600 border border-slate-200 rounded-sm px-2 py-0.5 sm:px-2.5 sm:py-1 transition font-medium cursor-pointer leading-snug"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="px-3 pb-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              data-testid="assistant-input-field"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask about sales, revenue, items…"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <button
              type="submit"
              data-testid="assistant-send-button"
              disabled={!inputText.trim() || isLoading}
              className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-bold px-3 sm:px-4 py-2 rounded-sm text-sm flex items-center gap-1 sm:gap-1.5 transition shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
