/**
 * app/(dashboard)/ai-assistant/page.tsx
 * Trang AI Assistant sử dụng Google Gemini
 * Chat interface + phân tích doanh thu + gợi ý quản lý
 */
'use client';
import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Send, Bot, User, Sparkles, TrendingUp, Lightbulb, Loader2, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_QUESTIONS = [
  'Tình trạng phòng của tôi như thế nào?',
  'Tôi có bao nhiêu hóa đơn chưa thu?',
  'Gợi ý cách tăng tỷ lệ lấp đầy phòng?',
  'Phân tích doanh thu tháng này',
  'Những hợp đồng nào sắp hết hạn?',
  'Cách quản lý bảo trì hiệu quả?',
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Xin chào! 👋 Tôi là AI Assistant của RMS. Tôi có thể giúp bạn:\n\n• Trả lời câu hỏi về quản lý phòng trọ\n• Phân tích doanh thu và chi phí\n• Đưa ra gợi ý cải thiện hiệu quả quản lý\n\nBạn muốn hỏi gì hôm nay?',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'revenue' | 'suggestions'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore(s => s.user);
  const isOwner = user?.role === 'OWNER';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: (question: string) =>
      api.post<{ data: { answer: string } }>('/ai/chat', { question }).then(r => r.data.data.answer),
    onSuccess: (answer) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
      }]);
    },
    onError: () => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: '⚠️ Xin lỗi, AI tạm thời không khả dụng. Vui lòng thử lại sau.',
        timestamp: new Date(),
      }]);
    }
  });

  // Revenue analysis
  const { data: revenueAnalysis, isLoading: revenueLoading, refetch: refetchRevenue } = useQuery({
    queryKey: ['ai-revenue'],
    queryFn: () => api.get<{ data: { analysis: string } }>('/ai/analyze-revenue?months=6').then(r => r.data.data.analysis),
    enabled: false,
  });

  // Suggestions
  const { data: suggestions, isLoading: suggestionsLoading, refetch: refetchSuggestions } = useQuery({
    queryKey: ['ai-suggestions'],
    queryFn: () => api.get<{ data: { suggestions: string } }>('/ai/suggestions').then(r => r.data.data.suggestions),
    enabled: false,
  });

  const handleSend = () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    chatMutation.mutate(input.trim());
    setInput('');
  };

  const handleQuickQuestion = (q: string) => {
    setInput(q);
  };

  // Format markdown-like content
  const formatContent = (text: string) => {
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Bot size={28} className="text-purple-600" />
          AI Assistant
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Trợ lý AI thông minh hỗ trợ quản lý phòng trọ</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'chat' as const, label: 'Chat', icon: Bot },
          ...(isOwner ? [
            { id: 'revenue' as const, label: 'Phân tích doanh thu', icon: TrendingUp },
            { id: 'suggestions' as const, label: 'Gợi ý quản lý', icon: Lightbulb },
          ] : [])
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}>
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.role === 'assistant' ? 'bg-purple-100 dark:bg-purple-900/40' : 'bg-blue-100 dark:bg-blue-900/40'
                }`}>
                  {msg.role === 'assistant'
                    ? <Bot size={16} className="text-purple-600 dark:text-purple-400" />
                    : <User size={16} className="text-blue-600 dark:text-blue-400" />
                  }
                </div>
                <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'assistant'
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'
                    : 'bg-blue-600 text-white rounded-tr-none'
                }`}>
                  {formatContent(msg.content)}
                  <p className={`text-xs mt-1.5 ${msg.role === 'assistant' ? 'text-gray-400' : 'text-blue-200'}`}>
                    {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-tl-none">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <span key={i} className={`w-2 h-2 bg-gray-400 rounded-full animate-bounce`}
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {QUICK_QUESTIONS.map(q => (
                <button key={q} onClick={() => handleQuickQuestion(q)}
                  className="shrink-0 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs rounded-full border border-purple-200 dark:border-purple-700/50 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Nhập câu hỏi của bạn..."
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || chatMutation.isPending}
                className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center hover:bg-purple-700 transition-colors disabled:opacity-60"
              >
                {chatMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Analysis Tab */}
      {activeTab === 'revenue' && (
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={20} className="text-green-600" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Phân tích doanh thu 6 tháng</h2>
              </div>
              <button onClick={() => refetchRevenue()}
                disabled={revenueLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60">
                {revenueLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {revenueAnalysis ? 'Phân tích lại' : 'Bắt đầu phân tích'}
              </button>
            </div>

            {revenueLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-purple-600">
                <Loader2 size={40} className="animate-spin mb-4" />
                <p className="text-sm text-gray-500">AI đang phân tích dữ liệu doanh thu...</p>
              </div>
            )}

            {revenueAnalysis && !revenueLoading && (
              <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-700/50 rounded-xl p-5">
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {revenueAnalysis}
                </div>
              </div>
            )}

            {!revenueAnalysis && !revenueLoading && (
              <div className="text-center py-16 text-gray-400">
                <TrendingUp size={64} className="mx-auto mb-4 opacity-20" />
                <p>Nhấn &quot;Bắt đầu phân tích&quot; để AI phân tích doanh thu</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggestions Tab */}
      {activeTab === 'suggestions' && (
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb size={20} className="text-yellow-500" />
                <h2 className="font-semibold text-gray-900 dark:text-white">Gợi ý quản lý từ AI</h2>
              </div>
              <button onClick={() => refetchSuggestions()}
                disabled={suggestionsLoading}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors disabled:opacity-60">
                {suggestionsLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                {suggestions ? 'Làm mới' : 'Lấy gợi ý'}
              </button>
            </div>

            {suggestionsLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-yellow-600">
                <Loader2 size={40} className="animate-spin mb-4" />
                <p className="text-sm text-gray-500">AI đang phân tích và đưa ra gợi ý...</p>
              </div>
            )}

            {suggestions && !suggestionsLoading && (
              <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700/50 rounded-xl p-5">
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {suggestions}
                </div>
              </div>
            )}

            {!suggestions && !suggestionsLoading && (
              <div className="text-center py-16 text-gray-400">
                <Lightbulb size={64} className="mx-auto mb-4 opacity-20" />
                <p>Nhấn &quot;Lấy gợi ý&quot; để nhận đề xuất cải thiện từ AI</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
