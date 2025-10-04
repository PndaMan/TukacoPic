import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const MessagesPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user: currentUser } = useAuthStore();
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    // If userId is provided in URL, open that conversation
    if (userId && friends.length > 0) {
      const friend = friends.find(f => f.id === parseInt(userId));
      if (friend) {
        selectFriend(friend);
      }
    }
  }, [userId, friends]);

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const response = await api.get('/friends/');
      setFriends(response.data.friends || []);
    } catch (err) {
      console.error('Error fetching friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectFriend = async (friend) => {
    setSelectedFriend(friend);
    navigate(`/messages/${friend.id}`, { replace: true });

    try {
      // Fetch messages with this friend
      const response = await api.get(`/conversations/${friend.id}/`);
      setMessages(response.data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setMessages([]);
    }
  };

  const handleBackToFriends = () => {
    setSelectedFriend(null);
    setMessages([]);
    navigate('/messages', { replace: true });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !selectedFriend) return;

    try {
      setSending(true);
      const response = await api.post(
        `/conversations/${selectedFriend.id}/`,
        { content: newMessage }
      );

      setMessages([...messages, response.data]);
      setNewMessage('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-gray-600">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 max-w-7xl">
      <h1 className="text-2xl font-bold mb-4 md:block hidden">Messages</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Friends List - Hidden on mobile when friend is selected */}
        <div className={`md:col-span-1 card overflow-y-auto ${selectedFriend ? 'hidden md:block' : 'block'}`}>
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Messages</h2>
          </div>

          {friends.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No friends yet</p>
              <p className="text-sm mt-2">Add friends to start messaging!</p>
              <button
                onClick={() => navigate('/friends')}
                className="btn-primary mt-4"
              >
                Find Friends
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  onClick={() => selectFriend(friend)}
                  className={`p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition ${
                    selectedFriend?.id === friend.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {friend.profile_picture ? (
                      <img
                        src={friend.profile_picture}
                        alt={friend.username}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-lg sm:text-xl text-white">
                          {friend.username?.[0]?.toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                        {friend.username}
                      </div>
                      {friend.badge && (
                        <div className="text-xs text-gray-500 truncate">
                          {friend.badge}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Messages Area - Hidden on mobile when no friend is selected */}
        <div className={`md:col-span-2 card flex flex-col ${selectedFriend ? 'block' : 'hidden md:block'}`}>
          {selectedFriend ? (
            <>
              {/* Header */}
              <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center gap-2 sm:gap-3">
                {/* Back button for mobile */}
                <button
                  onClick={handleBackToFriends}
                  className="md:hidden p-1 sm:p-2 hover:bg-gray-100 rounded-lg"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button
                  onClick={() => navigate(`/users/${selectedFriend.id}`)}
                  className="flex items-center gap-2 sm:gap-3 hover:bg-gray-50 rounded-lg p-1 sm:p-2 transition"
                >
                  {selectedFriend.profile_picture ? (
                    <img
                      src={selectedFriend.profile_picture}
                      alt={selectedFriend.username}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-base sm:text-lg text-white">
                        {selectedFriend.username?.[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="font-semibold text-gray-900 text-sm sm:text-base">
                    {selectedFriend.username}
                  </span>
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <p>No messages yet</p>
                    <p className="text-sm mt-2">Send a message to start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwnMessage = message.sender.id === currentUser?.id;

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-md px-3 sm:px-4 py-2 rounded-lg ${
                            isOwnMessage
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="break-words text-sm sm:text-base">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                            }`}
                          >
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={1000}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="btn-primary px-4 sm:px-6 text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-xl">Select a friend</p>
                <p className="text-sm mt-2">Choose a friend from the list to view your conversation</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
