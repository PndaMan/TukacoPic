import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [userPhotos, setUserPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState('');
  const [uploading, setUploading] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);

  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const [profileResponse, photosResponse] = await Promise.all([
        api.get('/profile/me/'),
        api.get('/photos/my/')
      ]);
      setProfile(profileResponse.data);
      setEditedBio(profileResponse.data.bio || '');
      setUserPhotos(photosResponse.data.results || photosResponse.data);
    } catch (err) {
      setError('Failed to load profile data');
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10485760) {
      alert(`File too large. Maximum size is 10MB.`);
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append(type, file);

      await api.patch('/profile/me/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      await fetchProfileData();
      alert(`${type === 'profile_picture' ? 'Profile picture' : 'Banner'} updated successfully!`);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleBioSave = async () => {
    try {
      await api.patch('/profile/me/', { bio: editedBio });
      await fetchProfileData();
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating bio:', err);
      alert('Failed to update bio');
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
        <button onClick={() => window.location.reload()} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  const badgeProgress = profile?.badge_progress;
  const badge = profile?.badge;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Banner and Profile Picture Section */}
      <div className="card mb-6 overflow-hidden">
        {/* Banner */}
        <div className="relative h-48 sm:h-64 bg-white">
          {profile?.banner_image && (
            <img
              src={profile.banner_image}
              alt="Profile banner"
              className="w-full h-full object-cover"
            />
          )}
          <label className="absolute top-4 right-4 btn-primary cursor-pointer text-sm">
            {uploading ? 'Uploading...' : 'Change Banner'}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'banner_image')}
              disabled={uploading}
            />
          </label>
        </div>

        {/* Profile Info */}
        <div className="p-6 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-16 sm:-mt-20 mb-6">
            {/* Profile Picture */}
            <div className="relative mb-4 sm:mb-0 sm:mr-6">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white bg-gray-200 overflow-hidden">
                {profile?.profile_picture ? (
                  <img
                    src={profile.profile_picture}
                    alt={profile.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl text-gray-400">
                    {profile?.username?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 cursor-pointer hover:bg-primary-dark shadow-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'profile_picture')}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* User Info */}
            <div className="text-center sm:text-left flex-1 mt-4 sm:mt-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                {profile?.username}
              </h1>
              <p className="text-gray-600 mb-2">{profile?.email}</p>
              <p className="text-sm text-gray-500">
                Member since {new Date(profile?.date_joined).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Badge */}
          {badge && (
            <div className="mt-4">
              <div className={`inline-block px-6 py-3 rounded-full ${getBadgeColor(badge)} font-bold text-lg shadow-lg`}>
                🏆 {badge}
              </div>
              {badgeProgress?.next && (
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Progress to {badgeProgress.next}</span>
                    <span>{badgeProgress.votes_needed} more votes needed</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-primary to-primary-dark h-3 rounded-full transition-all duration-500"
                      style={{ width: `${badgeProgress.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              {badge === 'King of the Kov' && (
                <div className="mt-2 text-sm text-gray-600 font-medium">
                  👑 You've reached the highest rank! Keep uploading to maintain your crown!
                </div>
              )}
            </div>
          )}
          {!badge && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                📸 Upload 5 photos to earn your first badge: <strong>TukacoPic Noob</strong>
              </p>
            </div>
          )}

          {/* Voting Streak */}
          {profile?.current_voting_streak > 0 && (
            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔥</span>
                <div>
                  <div className="font-bold text-orange-600 text-lg">
                    {profile.current_voting_streak} Day Voting Streak!
                  </div>
                  <div className="text-sm text-gray-600">
                    Longest streak: {profile.longest_voting_streak} days
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bio */}
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold text-gray-700">Bio</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-primary hover:text-primary-dark"
                >
                  Edit
                </button>
              )}
            </div>
            {isEditing ? (
              <div>
                <textarea
                  value={editedBio}
                  onChange={(e) => setEditedBio(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows="4"
                  maxLength="500"
                  placeholder="Tell us about yourself..."
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedBio(profile?.bio || '');
                    }}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button onClick={handleBioSave} className="btn-primary text-sm">
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700">
                {profile?.bio || 'No bio yet. Click edit to add one!'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Achievements */}
      {profile?.achievements && profile.achievements.length > 0 && (
        <div className="card mb-6">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Achievements</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {profile.achievements.map((userAchievement) => {
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
            {userPhotos.length}
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

      {/* User Photos */}
      <div className="card">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Your Photos</h2>
          {userPhotos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">You haven't uploaded any photos yet.</p>
              <button onClick={() => navigate('/upload')} className="btn-primary">
                Upload Your First Photo
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {userPhotos.slice(0, displayCount).map((photo) => (
                  <div key={photo.id} className="space-y-2">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={photo.image}
                        alt="Your uploaded photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-primary">
                        {Math.round(photo.elo_score)}
                      </div>
                      <div className="text-sm text-gray-500">Elo Score</div>
                      <div className="text-xs text-gray-400">
                        {new Date(photo.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Show More Button */}
              {displayCount < userPhotos.length && (
                <div className="text-center mt-8">
                  <button
                    onClick={() => setDisplayCount(prev => prev + 20)}
                    className="btn-primary"
                  >
                    Show More ({userPhotos.length - displayCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
