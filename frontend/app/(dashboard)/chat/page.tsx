'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatService } from '@/services/chat.service';
import { useAuthStore } from '@/store/auth.store';
import { formatDateTime, getInitials } from '@/lib/utils';
import { Send, MessageCircle } from 'lucide-react';
import { Conversation, Message } from '@/types';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export default function ChatPage() {
  const { user, accessToken } = useAuthStore();
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: chatService.getConversations,
    refetchInterval: 5000,
  });

  // Socket.IO connection
  useEffect(() => {
    if (!accessToken) return;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    socket = io(socketUrl, { auth: { token: accessToken } });

    socket.on('new_message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      refetch();
    });

    return () => { socket?.disconnect(); socket = null; };
  }, [accessToken]);

  // Load messages when conversation selected
  useEffect(() => {
    if (!selectedConv) return;
    chatService.getMessages(selectedConv.id).then(data => {
      setMessages(data?.messages || []);
    });
    socket?.emit('join_conversation', { conversationId: selectedConv.id });
  }, [selectedConv]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !selectedConv || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    try {
      socket?.emit('send_message', { conversationId: selectedConv.id, content: text });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800" style={{ height: 'calc(100vh - 8rem)' }}>
      {/* Conversations list */}
      <div className="w-80 border-r border-gray-100 dark:border-gray-700 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Tin nhắn</h2>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
          {conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Chưa có cuộc trò chuyện nào</p>
            </div>
          ) : conversations.map((conv: Conversation) => {
            const partner = conv.participants?.find(p => p.userId !== user?.id)?.user;
            const isActive = selectedConv?.id === conv.id;
            return (
              <button key={conv.id} onClick={() => setSelectedConv(conv)}
                className={`w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isActive ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm shrink-0">
                  {partner ? getInitials(partner.fullName) : '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{partner?.fullName || 'Unknown'}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{conv.lastMessage || 'Bắt đầu cuộc trò chuyện'}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message thread */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            {(() => {
              const partner = selectedConv.participants?.find(p => p.userId !== user?.id)?.user;
              return (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                    {partner ? getInitials(partner.fullName) : '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{partner?.fullName}</p>
                    <p className="text-xs text-green-500">Online</p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map(msg => {
              const isMine = msg.senderId === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm ${isMine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'}`}>
                    <p>{msg.content}</p>
                    <p className={`text-xs mt-1 ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>{formatDateTime(msg.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex gap-3">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="Nhập tin nhắn... (Enter để gửi)" />
              <button onClick={sendMessage} disabled={!input.trim() || sending}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageCircle size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Chọn một cuộc trò chuyện</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">để bắt đầu nhắn tin</p>
          </div>
        </div>
      )}
    </div>
  );
}
