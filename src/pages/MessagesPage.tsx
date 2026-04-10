import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MessageSquare, Search, Send } from 'lucide-react';
import {
  messagesApi,
  type Conversation,
  type ConversationMessage,
} from '../api/client';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const UNREAD_STATE_EVENT = 'servify:unread-state-changed';

const normalizeParam = (value: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const formatListTimestamp = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

const formatThreadTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isBootstrappingConversation, setIsBootstrappingConversation] = useState(false);
  const [contextError, setContextError] = useState('');
  const [query, setQuery] = useState('');
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ConversationMessage[]>>({});
  const [loadingMessagesFor, setLoadingMessagesFor] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const notifyUnreadStateChanged = useCallback(() => {
    window.dispatchEvent(new Event(UNREAD_STATE_EVENT));
  }, []);

  const professionalIdParam = normalizeParam(searchParams.get('professionalId'));
  const bookingIdParam = normalizeParam(searchParams.get('bookingId'));
  const userIdParam = normalizeParam(searchParams.get('userId'));
  const hasContextParams = Boolean(professionalIdParam || bookingIdParam || userIdParam);

  const loadConversations = useCallback(async () => {
    setIsLoadingConversations(true);
    try {
      const data = await messagesApi.listConversations();
      setConversations(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessagesFor(conversationId);
    try {
      const data = await messagesApi.listMessages(conversationId);
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: data,
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMessagesFor((prev) => (prev === conversationId ? null : prev));
    }
  }, []);

  const markConversationRead = useCallback(async (conversationId: string) => {
    try {
      await messagesApi.markConversationRead(conversationId);
      const readAt = new Date().toISOString();
      setConversations((prev) => prev.map((conversation) => (
        conversation.id === conversationId ? { ...conversation, unread_count: 0 } : conversation
      )));
      setMessagesByConversation((prev) => {
        const current = prev[conversationId];
        if (!current?.length) return prev;
        return {
          ...prev,
          [conversationId]: current.map((message) => (
            !message.is_mine && !message.read_at
              ? { ...message, read_at: readAt }
              : message
          )),
        };
      });
      notifyUnreadStateChanged();
    } catch (error) {
      console.error(error);
    }
  }, [notifyUnreadStateChanged]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!hasContextParams) return;

    let cancelled = false;
    const bootstrapConversation = async () => {
      setContextError('');
      setIsBootstrappingConversation(true);
      try {
        const conversation = await messagesApi.createConversation({
          professional_id: professionalIdParam,
          booking_id: bookingIdParam,
          user_id: userIdParam,
        });
        if (cancelled) return;

        await loadConversations();
        if (cancelled) return;

        setSelectedConversationId(conversation.id);
        navigate('/messages', { replace: true });
      } catch (error: any) {
        if (!cancelled) {
          setContextError(error?.message || 'Unable to open this conversation right now.');
        }
      } finally {
        if (!cancelled) setIsBootstrappingConversation(false);
      }
    };

    void bootstrapConversation();

    return () => {
      cancelled = true;
    };
  }, [hasContextParams, professionalIdParam, bookingIdParam, userIdParam, loadConversations, navigate]);

  useEffect(() => {
    if (!conversations.length) {
      setSelectedConversationId(null);
      return;
    }

    if (selectedConversationId && conversations.some((item) => item.id === selectedConversationId)) {
      return;
    }

    setSelectedConversationId(conversations[0].id);
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return;

    if (!messagesByConversation[selectedConversationId] && loadingMessagesFor !== selectedConversationId) {
      void loadMessages(selectedConversationId);
    }

    const selectedConversation = conversations.find((item) => item.id === selectedConversationId);
    if (selectedConversation?.unread_count) {
      void markConversationRead(selectedConversationId);
    }
  }, [
    selectedConversationId,
    conversations,
    messagesByConversation,
    loadingMessagesFor,
    loadMessages,
    markConversationRead,
  ]);

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (conversation) =>
        conversation.counterpart_name.toLowerCase().includes(q)
        || (conversation.last_message_preview ?? '').toLowerCase().includes(q)
    );
  }, [conversations, query]);

  const selectedConversation = selectedConversationId
    ? conversations.find((item) => item.id === selectedConversationId) ?? null
    : null;

  const selectedMessages = selectedConversation
    ? (messagesByConversation[selectedConversation.id] ?? [])
    : [];

  const unreadCount = conversations.reduce((sum, conversation) => sum + conversation.unread_count, 0);

  const markAllRead = async () => {
    const unreadConversationIds = conversations
      .filter((conversation) => conversation.unread_count > 0)
      .map((conversation) => conversation.id);

    if (!unreadConversationIds.length) return;

    setIsMarkingAllRead(true);
    try {
      await Promise.all(unreadConversationIds.map((conversationId) => messagesApi.markConversationRead(conversationId)));
      const readAt = new Date().toISOString();

      setConversations((prev) => prev.map((conversation) => ({ ...conversation, unread_count: 0 })));
      setMessagesByConversation((prev) => {
        const next: Record<string, ConversationMessage[]> = {};
        Object.entries(prev).forEach(([conversationId, messages]) => {
          if (!unreadConversationIds.includes(conversationId)) {
            next[conversationId] = messages;
            return;
          }
          next[conversationId] = messages.map((message) => (
            !message.is_mine && !message.read_at
              ? { ...message, read_at: readAt }
              : message
          ));
        });
        return next;
      });
      notifyUnreadStateChanged();
    } catch (error) {
      console.error(error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation) return;

    const text = draft.trim();
    if (!text) return;

    setSendError('');
    setIsSending(true);
    try {
      const sent = await messagesApi.sendMessage(selectedConversation.id, text);
      setDraft('');
      setMessagesByConversation((prev) => ({
        ...prev,
        [selectedConversation.id]: [
          ...(prev[selectedConversation.id] ?? []),
          sent,
        ],
      }));
      setConversations((prev) => prev.map((conversation) => (
        conversation.id === selectedConversation.id
          ? {
              ...conversation,
              last_message_preview: sent.body,
              last_message_at: sent.created_at,
            }
          : conversation
      )));
      await loadConversations();
    } catch (error: any) {
      setSendError(error?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="pt-20 min-h-[calc(100vh-5rem)] flex bg-[#f9f9fc]">
      <section className="w-full md:w-96 flex flex-col border-r border-brand-200/20 bg-brand-50/40">
        <div className="p-6 flex items-center justify-between bg-white/70">
          <h1 className="text-2xl font-bold text-brand-500 tracking-tight">Messages</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/professionals')}>New</Button>
            <Button variant="outline" size="sm" onClick={() => void loadConversations()}>Refresh</Button>
          </div>
        </div>

        <div className="px-6 pb-4 bg-white/70">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500" size={16} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              className="w-full pl-10 pr-4 py-3 bg-brand-50 border-none rounded-xl focus:ring-1 focus:ring-brand-500/30 text-sm"
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider">Unread: {unreadCount}</span>
            <button
              type="button"
              onClick={markAllRead}
              disabled={isMarkingAllRead || unreadCount === 0}
              className="font-semibold text-brand-500 underline disabled:opacity-50"
            >
              {isMarkingAllRead ? 'Marking...' : 'Mark All Read'}
            </button>
          </div>
          {isBootstrappingConversation && (
            <p className="mt-2 text-xs text-brand-600 font-medium">Opening conversation context...</p>
          )}
          {contextError && (
            <p className="mt-2 text-xs text-red-500 font-medium">{contextError}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingConversations ? (
            <div className="text-center py-16 text-slate-400">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-16 text-slate-500 px-6">
              <MessageSquare size={24} className="mx-auto mb-3 text-slate-400" />
              {conversations.length === 0 ? 'No conversations yet.' : 'No matching conversations found.'}
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const active = conversation.id === selectedConversation?.id;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={`w-full text-left p-5 border-l-4 transition-colors ${
                    active
                      ? 'bg-white border-brand-500'
                      : 'border-transparent hover:bg-brand-50/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {conversation.counterpart_avatar_url ? (
                      <img
                        src={conversation.counterpart_avatar_url}
                        alt={conversation.counterpart_name}
                        className="mt-0.5 w-10 h-10 rounded-full object-cover border border-brand-200/30"
                      />
                    ) : (
                      <div className="mt-0.5 w-10 h-10 rounded-full bg-brand-100 text-brand-600 font-bold flex items-center justify-center">
                        {conversation.counterpart_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold truncate">{conversation.counterpart_name}</h3>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400">
                          {formatListTimestamp(conversation.last_message_at)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 truncate mt-1">
                        {conversation.last_message_preview ?? 'No messages yet'}
                      </p>
                      {conversation.unread_count > 0 && (
                        <span className="mt-1 inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-100 text-brand-600">
                          {conversation.unread_count} unread
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="hidden md:flex flex-1 flex-col bg-white">
        {selectedConversation ? (
          <>
            <header className="h-20 px-8 flex justify-between items-center border-b border-brand-200/20">
              <div>
                <h2 className="font-bold text-brand-500 tracking-tight">{selectedConversation.counterpart_name}</h2>
                <p className="text-xs text-slate-500 uppercase tracking-wider">
                  {selectedConversation.booking_id
                    ? `Booking: #${selectedConversation.booking_id.slice(0, 8)}`
                    : 'General conversation'}
                </p>
              </div>
              {selectedConversation.unread_count > 0 ? (
                <Button size="sm" variant="outline" onClick={() => void markConversationRead(selectedConversation.id)}>
                  Mark Read
                </Button>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                  <CheckCircle2 size={14} /> Read
                </span>
              )}
            </header>

            <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-[#f9f9fc]">
              {loadingMessagesFor === selectedConversation.id ? (
                <Card className="p-6 text-center text-slate-400">Loading messages...</Card>
              ) : selectedMessages.length === 0 ? (
                <Card className="p-6 text-center text-slate-500">No messages yet. Start the conversation below.</Card>
              ) : (
                selectedMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.is_mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                        message.is_mine
                          ? 'bg-brand-500 text-white rounded-br-md'
                          : 'bg-white text-slate-700 rounded-bl-md border border-brand-200/30'
                      }`}
                    >
                      {!message.is_mine && (
                        <p className="text-[10px] uppercase tracking-wider font-bold mb-1 text-brand-500">
                          {message.sender_name ?? selectedConversation.counterpart_name}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed">{message.body}</p>
                      <p className={`mt-2 text-[10px] ${message.is_mine ? 'text-white/70' : 'text-slate-400'}`}>
                        {formatThreadTimestamp(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-brand-200/20 bg-white p-5 space-y-3">
              {sendError && <p className="text-sm text-red-500 font-medium">{sendError}</p>}
              <div className="flex items-end gap-3">
                <textarea
                  rows={2}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  className="flex-1 rounded-xl border border-brand-200/40 bg-brand-50 px-4 py-3 text-sm outline-none resize-none focus:ring-2 focus:ring-brand-500/20"
                />
                <Button
                  className="h-11 px-4"
                  onClick={() => void sendMessage()}
                  disabled={!draft.trim() || isSending}
                >
                  {isSending ? 'Sending...' : <><Send size={14} className="mr-1" /> Send</>}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center px-8">
            <Card className="p-8 text-center max-w-md">
              <MessageSquare size={28} className="mx-auto mb-3 text-brand-500" />
              <p className="font-semibold text-lg mb-2">No conversation selected</p>
              <p className="text-slate-500 text-sm mb-5">Open an existing thread or start one from a professional profile.</p>
              <Link to="/professionals">
                <Button>Browse Professionals</Button>
              </Link>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
};
