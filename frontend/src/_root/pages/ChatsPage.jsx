import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowLeft, Plus, Send } from 'lucide-react';
import api from '@/api/axios';
import { UserContext } from '@/Context/UserContext';
import { toast } from 'react-hot-toast';
import { getUserHandle, multiFormatDateString, getOptimizedImageUrl } from '@/lib/utils';
import Loader from '@/components/Shared/Loader';
import NewChatModal from '@/components/Shared/NewChatModal';

const ChatsPage = () => {
  const { userToken, userData, socket } = useContext(UserContext);
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const selectedConversationRef = useRef(null);
  selectedConversationRef.current = selectedConversation;

  const fetchConversations = useCallback(() => {
    if (!userToken) return Promise.resolve();
    return api
      .get('/api/v1/auth/chat/conversations', {
        headers: { Authorization: `Bearer ${userToken}` },
      })
      .then((response) => {
        setConversations(response.data.conversations || []);
      })
      .catch(() => toast.error('Failed to load conversations.'))
      .finally(() => setIsLoadingConversations(false));
  }, [userToken]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const openConversation = useCallback(
    async (conversation) => {
      setSelectedConversation(conversation);
      setIsLoadingMessages(true);
      try {
        const response = await api.get(
          `/api/v1/auth/chat/conversations/${conversation._id}/messages`,
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
        setMessages(response.data.documents || []);
        await api.put(
          `/api/v1/auth/chat/conversations/${conversation._id}/read`,
          {},
          { headers: { Authorization: `Bearer ${userToken}` } }
        );
        setConversations((prev) =>
          prev.map((c) => (c._id === conversation._id ? { ...c, unreadCount: 0 } : c))
        );
      } catch (err) {
        toast.error('Failed to load messages.');
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [userToken]
  );

  // Deep-link support: /chats?userId=<id>, used by the "Message" button on Profile.
  useEffect(() => {
    const targetUserId = searchParams.get('userId');
    if (!targetUserId || !userToken) return;

    api
      .post(
        '/api/v1/auth/chat/conversations',
        { userId: targetUserId },
        { headers: { Authorization: `Bearer ${userToken}` } }
      )
      .then((response) => {
        openConversation(response.data.conversation);
        fetchConversations();
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Could not start conversation.');
      })
      .finally(() => {
        setSearchParams({}, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, userToken]);

  // Real-time: presence + incoming messages.
  useEffect(() => {
    if (!socket) return;

    const handleSnapshot = (userIds) => setOnlineUserIds(new Set(userIds));
    const handlePresenceUpdate = ({ userId, online }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    };
    const handleNewMessage = ({ conversationId, message }) => {
      if (selectedConversationRef.current?._id === conversationId) {
        setMessages((prev) => [...prev, message]);
        api
          .put(
            `/api/v1/auth/chat/conversations/${conversationId}/read`,
            {},
            { headers: { Authorization: `Bearer ${userToken}` } }
          )
          .catch(() => {});
      }
      fetchConversations();
    };

    socket.on('presence:snapshot', handleSnapshot);
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('message:new', handleNewMessage);
    // Ask for a fresh snapshot rather than relying solely on the one-shot
    // broadcast the server sends at connect time, which this effect can miss
    // if it attaches after that broadcast already fired (e.g. right after a
    // full page reload followed by a fast client-side navigation into /chats).
    socket.emit('presence:get');

    return () => {
      socket.off('presence:snapshot', handleSnapshot);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('message:new', handleNewMessage);
    };
  }, [socket, userToken, fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = messageText.trim();
    if (!text || !selectedConversation) return;

    setIsSending(true);
    try {
      const response = await api.post(
        `/api/v1/auth/chat/conversations/${selectedConversation._id}/messages`,
        { text },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      setMessages((prev) => [...prev, response.data.document]);
      setMessageText('');
      fetchConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  const handleContactSelected = async (contact) => {
    setIsNewChatOpen(false);
    try {
      const response = await api.post(
        '/api/v1/auth/chat/conversations',
        { userId: contact._id },
        { headers: { Authorization: `Bearer ${userToken}` } }
      );
      openConversation(response.data.conversation);
      fetchConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start conversation.');
    }
  };

  const isOnline = (userId) => onlineUserIds.has(userId);

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Mobile (<md): list-or-thread, WhatsApp-style — only one panel visible
          at a time, based on whether a conversation is selected. Desktop
          (md+): both panels always shown side by side, as before. */}
      <div
        className={`${
          selectedConversation ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:max-w-[420px] border-r border-dark-4 h-full`}
      >
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <img
              src="/assets/images/chat.svg"
              width={28}
              height={28}
              alt="Chats"
              className="invert-white"
            />
            <h2 className="h2-bold text-light-1">All Chats</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsNewChatOpen(true)}
            className="bg-dark-3 rounded-full p-2"
            aria-label="New message"
          >
            <Plus size={20} className="text-light-1" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-6">
          {isLoadingConversations ? (
            <Loader />
          ) : conversations.length === 0 ? (
            <p className="text-light-3 small-regular mt-4">
              No conversations yet. Start one with someone you follow (and who follows you back).
            </p>
          ) : (
            <ul className="flex flex-col">
              {conversations.map((conversation) => {
                const other = conversation.otherParticipant;
                if (!other) return null;
                return (
                  <li key={conversation._id}>
                    <button
                      type="button"
                      onClick={() => openConversation(conversation)}
                      className="flex items-center justify-between w-full py-4 border-b border-dark-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-[70px] h-[70px] rounded-full overflow-hidden shrink-0">
                          <img
                            src={getOptimizedImageUrl(other.profileImage?.secure_url, 'avatar') || '/assets/images/profile-placeholder.svg'}
                            alt={`${other.firstName}'s avatar`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="body-medium text-light-1">
                            {other.firstName} {other.lastName}
                          </p>
                          <p className="small-regular text-light-3">@{getUserHandle(other)}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className={`size-3 rounded-full ${
                            isOnline(other._id) ? 'bg-[#3ecf6a]' : 'bg-light-4'
                          }`}
                        />
                        {conversation.unreadCount > 0 && (
                          <span className="bg-secondary-500 text-dark-1 tiny-medium rounded-full min-w-[18px] h-[18px] flex-center px-1">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div
        className={`${
          selectedConversation ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col h-full`}
      >
        {!selectedConversation ? (
          <div className="flex-center flex-1">
            <p className="text-light-3 base-regular">Select a conversation to start chatting.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 md:px-8 py-5 border-b border-dark-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden"
                  aria-label="Back to all chats"
                >
                  <ArrowLeft size={22} className="text-light-1" />
                </button>
                <img
                  src={
                    getOptimizedImageUrl(selectedConversation.otherParticipant?.profileImage?.secure_url, 'avatar') ||
                    '/assets/images/profile-placeholder.svg'
                  }
                  alt="avatar"
                  className="w-[50px] h-[50px] rounded-full object-cover"
                />
                <div>
                  <p className="body-bold text-light-1">
                    {selectedConversation.otherParticipant?.firstName}{' '}
                    {selectedConversation.otherParticipant?.lastName}
                  </p>
                  <p className="small-regular text-light-3">
                    {isOnline(selectedConversation.otherParticipant?._id) ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-8 py-6 flex flex-col gap-4">
              {isLoadingMessages ? (
                <Loader />
              ) : messages.length === 0 ? (
                <p className="text-light-3 small-regular text-center mt-10">
                  No messages yet — say hello!
                </p>
              ) : (
                messages.map((message) => {
                  const isMine = String(message.senderId) === String(userData?._id);
                  return (
                    <div
                      key={message._id}
                      className={`flex flex-col max-w-[60%] ${
                        isMine ? 'self-end items-end' : 'self-start items-start'
                      }`}
                    >
                      <div
                        className={`px-4 py-3 rounded-2xl small-medium whitespace-pre-wrap break-words ${
                          isMine ? 'bg-primary-500 text-light-1' : 'bg-dark-3 text-light-1'
                        }`}
                      >
                        {message.text}
                      </div>
                      <p className="tiny-medium text-light-4 mt-1">
                        {multiFormatDateString(message.createdAt)}
                      </p>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form
              onSubmit={handleSend}
              className="flex items-center gap-3 px-4 md:px-8 pt-5 pb-bottom-nav md:pb-5 border-t border-dark-4"
            >
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Write your message here..."
                className="flex-1 h-[54px] bg-dark-3 rounded-[10px] px-4 text-light-1 placeholder:text-light-3 outline-none focus-visible:ring-1 focus-visible:ring-offset-1 ring-offset-light-3"
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={isSending || !messageText.trim()}
                className="bg-secondary-500 rounded-[10px] size-[54px] flex-center shrink-0 disabled:opacity-50"
                aria-label="Send message"
              >
                <Send size={20} className="text-dark-1" />
              </button>
            </form>
          </>
        )}
      </div>

      {isNewChatOpen && (
        <NewChatModal onClose={() => setIsNewChatOpen(false)} onSelect={handleContactSelected} />
      )}
    </div>
  );
};

export default ChatsPage;
