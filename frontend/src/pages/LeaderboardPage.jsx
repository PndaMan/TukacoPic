import { useState, useEffect } from 'react';
import api from '../services/api';
import PhotoModal from '../components/PhotoModal';

const LeaderboardPage = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePhotoClick = (photoId) => {
    setSelectedPhotoId(photoId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPhotoId(null);
  };

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const response = await api.get('/leaderboard/');
        setPhotos(response.data.results || response.data);
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
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
          Top Ivan Photos
        </h1>
        <p className="text-base sm:text-lg text-gray-600">
          Top-rated photos based on community votes
        </p>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
            No Photos Yet
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Be the first to upload and vote on photos!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {photos.map((photo, index) => (
            <div key={photo.id} className="card">
              <div className="relative">
                {/* Rank badge */}
                <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-10">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-500' :
                    'bg-primary'
                  }`}>
                    {index + 1}
                  </div>
                </div>

                {/* Photo */}
                <div
                  className="aspect-square cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handlePhotoClick(photo.id)}
                >
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

              <div className="p-2 sm:p-3 md:p-4">
                <div className="flex justify-between items-center">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="font-semibold text-gray-800 text-xs sm:text-sm md:text-base truncate">
                      {photo.uploader.username}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {new Date(photo.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm sm:text-base md:text-lg font-bold text-primary">
                      {Math.round(photo.elo_score)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Elo
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Modal */}
      <PhotoModal
        photoId={selectedPhotoId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default LeaderboardPage;