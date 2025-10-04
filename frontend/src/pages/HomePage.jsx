import { useState, useEffect } from 'react';
import api from '../services/api';

const HomePage = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [voted, setVoted] = useState(false);
  const [message, setMessage] = useState('');

  const fetchPhotoPair = async () => {
    try {
      setLoading(true);
      setVoted(false);
      setMessage('');

      const response = await api.get('/photos/pair/');
      setPhotos(response.data.photos);
    } catch (error) {
      if (error.response?.data?.error === 'You reached the end, consider uploading more Ivan photos') {
        setMessage('You reached the end, consider uploading more Ivan photos');
        setPhotos([]);
      } else if (error.response?.data?.error === 'No more photos, upload one of Ivan') {
        setMessage('No more photos, upload one of Ivan');
        setPhotos([]);
      } else {
        setMessage('Error loading photos. Please try again.');
      }
      console.error('Error fetching photo pair:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (winnerId, loserId) => {
    try {
      setLoading(true);

      await api.post('/vote/', {
        winner_id: winnerId,
        loser_id: loserId
      });

      setVoted(true);
      setMessage('Vote submitted successfully!');

      // Automatically load next pair after 2 seconds
      setTimeout(() => {
        fetchPhotoPair();
      }, 2000);
    } catch (error) {
      setMessage('Error submitting vote. Please try again.');
      console.error('Error submitting vote:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotoPair();
  }, []);

  if (loading && !voted) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-xl text-gray-600">Loading photos...</div>
      </div>
    );
  }

  if (photos.length < 2 && (message === 'You reached the end, consider uploading more Ivan photos' || message === 'No more photos, upload one of Ivan')) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          🎉 Congratulations!
        </h2>
        <p className="text-lg text-gray-600 mb-6">
          {message === 'You reached the end, consider uploading more Ivan photos'
            ? "You've reached the end of all photo pairs!"
            : "You've voted on all available photo pairs!"}
        </p>
        <div className="bg-blue-100 text-blue-800 p-6 rounded-lg max-w-md mx-auto">
          <p className="font-semibold text-xl mb-2">
            {message}
          </p>
          <p className="text-sm">
            Upload more photos to continue voting and comparing!
          </p>
        </div>
      </div>
    );
  }

  if (photos.length < 2) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          No Photos Available
        </h2>
        <p className="text-gray-600">
          There aren't enough photos to vote on yet. Try uploading some photos first!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2 sm:mb-4">
          Choose Your Favorite
        </h1>
        <p className="text-base sm:text-lg text-gray-600">
          Tap the photo you think is better!
        </p>
      </div>

      {message && (
        <div className={`text-center mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg text-sm sm:text-base ${
          message.includes('Error')
            ? 'bg-red-100 text-red-700'
            : 'bg-green-100 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {photos.map((photo, index) => (
          <div key={photo.id} className="space-y-3 sm:space-y-4">
            <div className="card overflow-hidden">
              <div className="aspect-square relative group">
                <img
                  src={photo.image}
                  alt={`Photo by ${photo.uploader.username}`}
                  className="w-full h-full object-cover"
                />
                {!voted && !loading && (
                  <button
                    onClick={() => handleVote(photo.id, photos[1 - index].id)}
                    className="absolute inset-0 bg-black bg-opacity-0 active:bg-opacity-30 md:hover:bg-opacity-20 transition duration-300 flex items-center justify-center group"
                    disabled={loading}
                  >
                    <span className="bg-primary text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-semibold text-sm sm:text-base opacity-0 group-hover:opacity-100 group-active:opacity-100 transition duration-300 transform scale-95 group-hover:scale-100 group-active:scale-100">
                      Choose This One
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div className="text-center space-y-1 sm:space-y-2">
              <p className="text-xs sm:text-sm text-gray-600">
                by <span className="font-medium">{photo.uploader.username}</span>
              </p>
              <p className="text-xs sm:text-sm text-gray-500">
                Elo Score: <span className="font-medium">{Math.round(photo.elo_score)}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {voted && (
        <div className="text-center mt-6 sm:mt-8">
          <p className="text-sm sm:text-base text-gray-600">Loading next photo pair...</p>
        </div>
      )}

      {!voted && !loading && (
        <div className="text-center mt-6 sm:mt-8">
          <button
            onClick={fetchPhotoPair}
            className="btn-secondary text-sm sm:text-base"
          >
            Skip This Pair
          </button>
        </div>
      )}
    </div>
  );
};

export default HomePage;