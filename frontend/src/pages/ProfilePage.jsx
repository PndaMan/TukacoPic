import { useState, useEffect } from 'react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [userPhotos, setUserPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user } = useAuthStore();

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);

        // Fetch profile stats and user photos in parallel
        const [profileResponse, photosResponse] = await Promise.all([
          api.get('/profile/'),
          api.get('/photos/my/')
        ]);

        setProfile(profileResponse.data);
        setUserPhotos(photosResponse.data.results || photosResponse.data);
      } catch (err) {
        setError('Failed to load profile data');
        console.error('Error fetching profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

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
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Profile
        </h1>
        <p className="text-lg text-gray-600">
          Your TukacoPic stats and uploaded photos
        </p>
      </div>

      {/* Profile Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {profile?.stats?.photos_uploaded || 0}
            </div>
            <div className="text-gray-600">Photos Uploaded</div>
          </div>
        </div>

        <div className="card">
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {profile?.stats?.votes_cast || 0}
            </div>
            <div className="text-gray-600">Votes Cast</div>
          </div>
        </div>

        <div className="card">
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {Math.round(profile?.stats?.total_elo || 0)}
            </div>
            <div className="text-gray-600">Total Elo</div>
          </div>
        </div>

        <div className="card">
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">
              {Math.round(profile?.stats?.average_elo || 0)}
            </div>
            <div className="text-gray-600">Average Elo</div>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="card mb-8">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Account Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="text-gray-900">{user?.username}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="text-gray-900">{user?.email}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Member Since
              </label>
              <div className="text-gray-900">
                {new Date(user?.date_joined).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User Photos */}
      <div className="card">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Your Photos
          </h2>

          {userPhotos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                You haven't uploaded any photos yet.
              </p>
              <a href="/upload" className="btn-primary">
                Upload Your First Photo
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {userPhotos.map((photo) => (
                <div key={photo.id} className="space-y-3">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:8000'}${photo.image}`}
                      alt="Your uploaded photo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-primary">
                      {Math.round(photo.elo_score)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Elo Score
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(photo.created_at).toLocaleDateString()}
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

export default ProfilePage;