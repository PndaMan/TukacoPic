import { useState, useEffect } from 'react';
import api from '../services/api';

const RecentUploadsPage = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecentUploads = async () => {
      try {
        setLoading(true);
        const response = await api.get('/recent/');
        setPhotos(response.data.results);
      } catch (err) {
        setError('Failed to load recent uploads');
        console.error('Error fetching recent uploads:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentUploads();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64 sm:min-h-96 px-4">
        <div className="text-lg sm:text-xl text-gray-600">Loading recent uploads...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 sm:py-12 px-4">
        <div className="text-red-600 mb-4 text-sm sm:text-base">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary min-h-[44px] text-sm sm:text-base"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-6 sm:mb-8 px-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-3 sm:mb-4">
          Recent Ivan Photos
        </h1>
        <p className="text-sm sm:text-base lg:text-lg text-gray-600">
          The latest 20 photos uploaded to the community
        </p>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-8 sm:py-12 px-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">
            No Photos Yet
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Be the first to upload some photos!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 px-4 sm:px-0">
          {photos.map((photo) => (
            <div key={photo.id} className="card shadow-md hover:shadow-lg transition-shadow duration-200">
              <div className="relative">
                {/* Photo */}
                <div className="aspect-square">
                  <img
                    src={photo.image}
                    alt={`Photo by ${photo.uploader.username}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="p-3 sm:p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                      {photo.uploader.username}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {new Date(photo.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right ml-2">
                    <div className="text-base sm:text-lg font-bold text-primary">
                      {Math.round(photo.elo_score)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Elo Score
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-xs sm:text-sm text-gray-600">
                  <span className="flex items-center">
                    <span className="text-green-600 font-semibold">
                      {photo.wins_count}
                    </span>
                    <span className="ml-1">wins</span>
                  </span>
                  <span className="flex items-center">
                    <span className="text-red-600 font-semibold">
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

      {photos.length > 0 && (
        <div className="text-center mt-6 sm:mt-8 text-gray-500 px-4">
          <p className="text-sm sm:text-base">Showing the latest {photos.length} uploaded photos</p>
        </div>
      )}
    </div>
  );
};

export default RecentUploadsPage;