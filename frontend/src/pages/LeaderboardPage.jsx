import { useState, useEffect } from 'react';
import api from '../services/api';

const LeaderboardPage = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await api.get('/leaderboard/');
        setPhotos(response.data.results);
      } catch (err) {
        setError('Failed to load leaderboard');
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-xl text-gray-600">Loading leaderboard...</div>
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
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          Top Ivan Photos
        </h1>
        <p className="text-lg text-gray-600">
          Top-rated photos based on community votes
        </p>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            No Photos Yet
          </h2>
          <p className="text-gray-600">
            Be the first to upload and vote on photos!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {photos.map((photo, index) => (
            <div key={photo.id} className="card">
              <div className="relative">
                {/* Rank badge */}
                <div className="absolute top-2 left-2 z-10">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-500' :
                    'bg-primary'
                  }`}>
                    {index + 1}
                  </div>
                </div>

                {/* Photo */}
                <div className="aspect-square">
                  <img
                    src={photo.image}
                    alt={`Photo by ${photo.uploader.username}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Image failed to load:', photo.image);
                    }}
                  />
                </div>
              </div>

              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {photo.uploader.username}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(photo.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">
                      {Math.round(photo.elo_score)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Elo Score
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-sm text-gray-600">
                  <span className="flex items-center">
                    <span className="text-green-600 font-medium">
                      {photo.wins_count}
                    </span>
                    <span className="ml-1">wins</span>
                  </span>
                  <span className="flex items-center">
                    <span className="text-red-600 font-medium">
                      {photo.losses_count}
                    </span>
                    <span className="ml-1">losses</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;