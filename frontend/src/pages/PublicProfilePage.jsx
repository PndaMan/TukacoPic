import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const PublicProfilePage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [reactingTo, setReactingTo] = useState(null);

  useEffect(() => {
    // Redirect to own profile if viewing self
    if (currentUser && parseInt(userId) === currentUser.id) {
      navigate('/profile');
      return;
    }
    fetchProfile();
  }, [userId, currentUser, navigate]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/users/${userId}/`);
      setProfile(response.data);
    } catch (err) {
      setError('Failed to load profile');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFriendRequest = async () => {
    try {
      setSendingRequest(true);
      await api.post('/friends/request/send/', { to_user_id: parseInt(userId) });
      await fetchProfile();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send friend request');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleUnfriend = async () => {
    if (!confirm('Are you sure you want to unfriend this user?')) return;
    try {
      await api.delete(`/friends/${userId}/unfriend/`);
      await fetchProfile();
    } catch (err) {
      alert('Failed to unfriend');
    }
  };

  const handleReaction = async (photoId, reactionType) => {
    try {
      setReactingTo(photoId);

      // Check if already reacted with this type
      const photo = profile.best_photos.find(p => p.id === photoId);
      const hasReacted = photo.user_reaction.includes(reactionType);

      if (hasReacted) {
        // Remove reaction
        await api.delete(`/photos/${photoId}/unreact/`, {
          data: { reaction_type: reactionType }
        });
      } else {
        // Add reaction with animation
        await api.post(`/photos/${photoId}/react/`, { reaction_type: reactionType });
      }

      await fetchProfile();
    } catch (err) {
      console.error('Reaction error:', err);
    } finally {
      setTimeout(() => setReactingTo(null), 500);
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
    return colors[badge] || 'bg-gray-200 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-xl text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button onClick={() => navigate('/')} className="btn-primary">
          Go Home
        </button>
      </div>
    );
  }

  const friendshipStatus = profile?.friendship_status;
  const badge = profile?.user?.badge;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Banner and Profile Picture */}
      <div className="card mb-6 overflow-hidden">
        {/* Banner */}
        <div className="relative h-48 sm:h-64 bg-white">
          {profile?.user?.banner_image && (
            <img
              src={profile.user.banner_image}
              alt={`${profile.user.username}'s banner`}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Profile Info */}
        <div className="p-6 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-20 mb-6">
            {/* Profile Picture */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white bg-gray-200 overflow-hidden mb-4 sm:mb-0 sm:mr-6">
              {profile?.user?.profile_picture ? (
                <img
                  src={profile.user.profile_picture}
                  alt={profile.user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl text-gray-400">
                  {profile?.user?.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                {profile?.user?.username}
              </h1>
              <p className="text-sm text-gray-500 mb-3">
                Member since {new Date(profile?.user?.date_joined).toLocaleDateString()}
              </p>

              {/* Friend Button */}
              {currentUser && (
                <div className="mt-2">
                  {friendshipStatus === 'friends' ? (
                    <button
                      onClick={handleUnfriend}
                      className="btn-secondary text-sm"
                    >
                      ✓ Friends
                    </button>
                  ) : friendshipStatus === 'pending_from_me' ? (
                    <button className="btn-secondary text-sm" disabled>
                      Friend Request Sent
                    </button>
                  ) : friendshipStatus === 'pending_from_them' ? (
                    <button
                      onClick={() => navigate('/friends')}
                      className="btn-primary text-sm"
                    >
                      Accept Friend Request
                    </button>
                  ) : (
                    <button
                      onClick={handleFriendRequest}
                      className="btn-primary text-sm"
                      disabled={sendingRequest}
                    >
                      {sendingRequest ? 'Sending...' : '+ Add Friend'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Badge */}
          {badge && (
            <div className="mt-4">
              <div className={`inline-block px-6 py-3 rounded-full ${getBadgeColor(badge)} font-bold text-lg shadow-lg`}>
                🏆 {badge}
              </div>
            </div>
          )}

          {/* Voting Streak */}
          {profile?.user?.current_voting_streak > 0 && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg inline-block">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <div className="font-bold text-orange-600">
                    {profile.user.current_voting_streak} Day Voting Streak!
                  </div>
                  <div className="text-xs text-gray-600">
                    Longest: {profile.user.longest_voting_streak} days
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bio */}
          {profile?.user?.bio && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-700 mb-2">Bio</h3>
              <p className="text-gray-700">{profile.user.bio}</p>
            </div>
          )}
        </div>
      </div>

      {/* Achievements */}
      {profile?.user?.achievements && profile.user.achievements.length > 0 && (
        <div className="card mb-6">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Achievements</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {profile.user.achievements.map((userAchievement) => {
                const achievement = userAchievement.achievement;
                const difficultyColors = {
                  easy: 'bg-green-50 border-green-200',
                  medium: 'bg-blue-50 border-blue-200',
                  hard: 'bg-purple-50 border-purple-200',
                  legendary: 'bg-yellow-50 border-yellow-200'
                };

                return (
                  <div
                    key={userAchievement.id}
                    className={`p-4 rounded-lg border ${difficultyColors[achievement.difficulty]}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{achievement.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-800 truncate">
                          {achievement.name}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {achievement.description}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {achievement.points} points • {achievement.difficulty}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-primary mb-2">
            {profile?.stats?.photos_uploaded || 0}
          </div>
          <div className="text-sm text-gray-600">Photos Uploaded</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-primary mb-2">
            {profile?.stats?.votes_cast || 0}
          </div>
          <div className="text-sm text-gray-600">Votes Cast</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-primary mb-2">
            {Math.round(profile?.stats?.total_elo || 0)}
          </div>
          <div className="text-sm text-gray-600">Total Elo</div>
        </div>
        <div className="card p-6 text-center">
          <div className="text-3xl font-bold text-primary mb-2">
            {Math.round(profile?.stats?.average_elo || 0)}
          </div>
          <div className="text-sm text-gray-600">Average Elo</div>
        </div>
      </div>

      {/* Best Performing Photos */}
      <div className="card">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Best Performing Photos
          </h2>

          {!profile?.best_photos || profile.best_photos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No photos uploaded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {profile.best_photos.map((photo) => (
                <div key={photo.id} className="space-y-2">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
                    <img
                      src={photo.image}
                      alt="User photo"
                      className="w-full h-full object-cover"
                    />

                    {/* Reaction Overlay */}
                    {currentUser && (
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                        <div className="flex gap-3">
                          {/* Heart Reaction */}
                          <button
                            onClick={() => handleReaction(photo.id, 'heart')}
                            className={`transform transition-all duration-200 ${
                              reactingTo === photo.id ? 'scale-150 rotate-12' : 'hover:scale-125'
                            } ${
                              photo.user_reaction?.includes('heart')
                                ? 'text-red-500'
                                : 'text-white'
                            }`}
                            style={{ fontSize: '2rem' }}
                          >
                            ❤️
                          </button>

                          {/* Fire Reaction */}
                          <button
                            onClick={() => handleReaction(photo.id, 'fire')}
                            className={`transform transition-all duration-200 ${
                              reactingTo === photo.id ? 'scale-150 -rotate-12' : 'hover:scale-125'
                            } ${
                              photo.user_reaction?.includes('fire')
                                ? 'text-orange-500'
                                : 'text-white'
                            }`}
                            style={{ fontSize: '2rem' }}
                          >
                            🔥
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Photo Info */}
                  <div className="text-center">
                    <div className="text-lg font-semibold text-primary">
                      {Math.round(photo.elo_score)}
                    </div>
                    <div className="text-sm text-gray-500">Elo Score</div>

                    {/* Reaction Counts */}
                    <div className="flex justify-center gap-3 mt-2 text-sm">
                      {photo.reactions?.heart > 0 && (
                        <span className="text-red-500">
                          ❤️ {photo.reactions.heart}
                        </span>
                      )}
                      {photo.reactions?.fire > 0 && (
                        <span className="text-orange-500">
                          🔥 {photo.reactions.fire}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicProfilePage;
