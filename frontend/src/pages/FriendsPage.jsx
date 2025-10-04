import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const FriendsPage = () => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ received: [], sent: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'search'

  useEffect(() => {
    fetchFriendsData();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchUsers();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchFriendsData = async () => {
    try {
      setLoading(true);
      const [friendsRes, requestsRes] = await Promise.all([
        api.get('/friends/'),
        api.get('/friends/requests/')
      ]);
      setFriends(friendsRes.data.friends || []);
      setRequests(requestsRes.data || { received: [], sent: [] });
    } catch (err) {
      console.error('Error fetching friends data:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      setSearching(true);
      const response = await api.get(`/users/search/?q=${searchQuery}`);
      setSearchResults(response.data.users || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleAccept = async (friendshipId) => {
    try {
      await api.post(`/friends/request/${friendshipId}/accept/`);
      await fetchFriendsData();
    } catch (err) {
      alert('Failed to accept friend request');
    }
  };

  const handleReject = async (friendshipId) => {
    try {
      await api.post(`/friends/request/${friendshipId}/reject/`);
      await fetchFriendsData();
    } catch (err) {
      alert('Failed to reject friend request');
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      await api.post('/friends/request/send/', { to_user_id: userId });
      alert('Friend request sent!');
      await searchUsers(); // Refresh search results
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send friend request');
    }
  };

  const getBadgeColor = (badge) => {
    const colors = {
      'King of the Kov': 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
      'Tucakovic Tracker': 'bg-gradient-to-r from-purple-500 to-purple-700 text-white',
      'The Tukarazzi': 'bg-gradient-to-r from-blue-500 to-blue-700 text-white',
      'Tukarazzi Intern': 'bg-gradient-to-r from-green-500 to-green-700 text-white',
      'Tuka-Spotter': 'bg-gradient-to-r from-gray-500 to-gray-700 text-white',
      'TukacoPic Noob': 'bg-gradient-to-r from-orange-400 to-orange-600 text-white',
    };
    return colors[badge] || '';
  };

  const renderUserCard = (user, actions) => (
    <div key={user.id} className="card p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-4">
        {/* Profile Picture */}
        <div
          className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 cursor-pointer"
          onClick={() => navigate(`/users/${user.id}`)}
        >
          {user.profile_picture ? (
            <img
              src={user.profile_picture}
              alt={user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
              {user.username?.[0]?.toUpperCase()}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-gray-800 truncate cursor-pointer hover:text-primary"
            onClick={() => navigate(`/users/${user.id}`)}
          >
            {user.username}
          </h3>
          {user.badge && (
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${getBadgeColor(user.badge)}`}>
              🏆 {user.badge}
            </div>
          )}
          {user.bio && (
            <p className="text-sm text-gray-600 truncate mt-1">{user.bio}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          {actions}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Friends</h1>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'friends'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            My Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === 'requests'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Requests ({requests.received.length})
            {requests.received.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {requests.received.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'search'
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Find Friends
          </button>
        </div>
      </div>

      {/* Friends List */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {friends.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-gray-600 mb-4">You don't have any friends yet.</p>
              <button
                onClick={() => setActiveTab('search')}
                className="btn-primary"
              >
                Find Friends
              </button>
            </div>
          ) : (
            friends.map(user =>
              renderUserCard(user, (
                <button
                  onClick={() => navigate(`/users/${user.id}`)}
                  className="btn-primary text-sm"
                >
                  View Profile
                </button>
              ))
            )
          )}
        </div>
      )}

      {/* Friend Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Received Requests */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Received Requests ({requests.received.length})
            </h2>
            <div className="space-y-4">
              {requests.received.length === 0 ? (
                <div className="card p-8 text-center text-gray-600">
                  No pending friend requests
                </div>
              ) : (
                requests.received.map(request =>
                  renderUserCard(request.from_user, (
                    <>
                      <button
                        onClick={() => handleAccept(request.id)}
                        className="btn-primary text-sm"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(request.id)}
                        className="btn-secondary text-sm"
                      >
                        Decline
                      </button>
                    </>
                  ))
                )
              )}
            </div>
          </div>

          {/* Sent Requests */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Sent Requests ({requests.sent.length})
            </h2>
            <div className="space-y-4">
              {requests.sent.length === 0 ? (
                <div className="card p-8 text-center text-gray-600">
                  No pending sent requests
                </div>
              ) : (
                requests.sent.map(request =>
                  renderUserCard(request.to_user, (
                    <span className="text-sm text-gray-500">Pending...</span>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Users */}
      {activeTab === 'search' && (
        <div>
          {/* Search Input */}
          <div className="card p-6 mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users by username..."
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Search Results */}
          <div className="space-y-4">
            {searching ? (
              <div className="text-center py-8 text-gray-600">Searching...</div>
            ) : searchQuery.length < 2 ? (
              <div className="card p-8 text-center text-gray-600">
                Type at least 2 characters to search
              </div>
            ) : searchResults.length === 0 ? (
              <div className="card p-8 text-center text-gray-600">
                No users found matching "{searchQuery}"
              </div>
            ) : (
              searchResults.map(user =>
                renderUserCard(user, (
                  <>
                    <button
                      onClick={() => navigate(`/users/${user.id}`)}
                      className="btn-secondary text-sm"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      className="btn-primary text-sm"
                    >
                      Add
                    </button>
                  </>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsPage;
