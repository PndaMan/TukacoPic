import { useState, useEffect } from 'react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const TukacodlePage = () => {
  const { isAuthenticated } = useAuthStore();
  const [gameState, setGameState] = useState('loading'); // loading, playing, game_over, leaderboard
  const [photos, setPhotos] = useState([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [finalScore, setFinalScore] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userPlayedToday, setUserPlayedToday] = useState(false);
  const [clickedPhoto, setClickedPhoto] = useState(null);
  const [showCorrectFeedback, setShowCorrectFeedback] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState('');

  useEffect(() => {
    checkUserStatus();
  }, [isAuthenticated]);

  const checkUserStatus = async () => {
    if (isAuthenticated) {
      try {
        const response = await api.get('/tukacodle/user-score/');
        if (response.data.played_today) {
          setUserPlayedToday(true);
          setFinalScore(response.data.score.score);
          await fetchLeaderboard();
          setGameState('leaderboard');
        } else {
          startGame();
        }
      } catch (error) {
        startGame();
      }
    } else {
      startGame();
    }
  };

  const startGame = async () => {
    try {
      setGameState('loading');
      const response = await api.post('/tukacodle/start/');
      setPhotos(response.data.photos);
      setCurrentStreak(0);
      setGameState('playing');
    } catch (error) {
      console.error('Error starting game:', error);
    }
  };

  const handlePhotoClick = async (chosenPhoto) => {
    if (clickedPhoto) return; // Prevent double clicks

    const otherPhoto = photos.find(p => p.id !== chosenPhoto.id);

    try {
      const response = await api.post('/tukacodle/guess/', {
        chosen_id: chosenPhoto.id,
        other_id: otherPhoto.id,
        current_streak: currentStreak
      });

      if (response.data.correct) {
        setClickedPhoto(chosenPhoto.id);
        setShowCorrectFeedback(true);

        setTimeout(() => {
          if (response.data.game_over) {
            setFinalScore(response.data.final_score);
            setGameState('game_over');
          } else {
            // Replace the losing photo with the new one
            setPhotos([chosenPhoto, response.data.next_photo]);
            setCurrentStreak(response.data.current_streak);
            setShowCorrectFeedback(false);
          }
          setClickedPhoto(null);
        }, 800);
      } else {
        // Wrong answer
        setClickedPhoto(chosenPhoto.id);
        setShowCorrectFeedback(false);

        setTimeout(() => {
          setFinalScore(response.data.final_score);
          setCorrectAnswer(response.data.correct_answer);
          setGameState('game_over');
          if (isAuthenticated) {
            setTimeout(() => {
              fetchLeaderboard();
              setGameState('leaderboard');
            }, 3000);
          }
        }, 800);
      }
    } catch (error) {
      console.error('Error submitting guess:', error);
      setClickedPhoto(null);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await api.get('/tukacodle/leaderboard/');
      setLeaderboard(response.data.scores);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  if (gameState === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="text-xl text-gray-600">Loading Tukacodle...</div>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
            🎯 Tukacodle
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Which photo has a higher ELO rating?
          </p>
          <div className="inline-block bg-primary text-white px-6 py-3 rounded-full font-bold text-xl">
            Current Streak: {currentStreak}
          </div>
        </div>

        {/* Photos Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-6xl mx-auto">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => handlePhotoClick(photo)}
              className={`relative group cursor-pointer transform transition-all duration-300 ${
                clickedPhoto === photo.id
                  ? (showCorrectFeedback ? 'scale-105 ring-4 ring-green-500' : 'scale-105 ring-4 ring-red-500')
                  : clickedPhoto
                  ? 'scale-95 opacity-50'
                  : 'hover:scale-105 hover:shadow-2xl'
              }`}
            >
              <div className="card overflow-hidden">
                <div className="aspect-square relative">
                  <img
                    src={photo.image}
                    alt={`Photo by ${photo.uploader.username}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Hover Overlay */}
                  {!clickedPhoto && (
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                      <div className="text-white text-2xl font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Choose Me
                      </div>
                    </div>
                  )}

                  {/* Correct/Wrong Feedback */}
                  {clickedPhoto === photo.id && (
                    <div className={`absolute inset-0 flex items-center justify-center ${
                      showCorrectFeedback ? 'bg-green-500' : 'bg-red-500'
                    } bg-opacity-80 animate-pulse`}>
                      <div className="text-white text-6xl font-bold">
                        {showCorrectFeedback ? '✓' : '✗'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <p className="font-semibold text-lg text-gray-800 text-center">
                    {photo.uploader.username}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-gray-600">
          <p className="text-sm">Click on the photo you think has a higher ELO rating!</p>
          <p className="text-xs mt-1">Your streak continues for each correct guess</p>
        </div>
      </div>
    );
  }

  if (gameState === 'game_over') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="card p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Game Over!
          </h1>

          <div className="my-8">
            <div className="text-6xl font-bold text-primary mb-2">
              {finalScore}
            </div>
            <div className="text-xl text-gray-600">
              Your Score
            </div>
          </div>

          {correctAnswer && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-700">{correctAnswer}</p>
            </div>
          )}

          {isAuthenticated ? (
            <div>
              <p className="text-gray-600 mb-4">
                Viewing leaderboard...
              </p>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                Login to save your score and see the leaderboard!
              </p>
              <button
                onClick={startGame}
                className="btn-primary"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gameState === 'leaderboard') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
            🏆 Today's Tukacodle Leaderboard
          </h1>
          <p className="text-lg text-gray-600">
            Daily scores reset at midnight
          </p>
        </div>

        {/* User's Score */}
        {userPlayedToday && (
          <div className="card p-6 mb-6 bg-gradient-to-r from-primary to-blue-600 text-white">
            <h2 className="text-2xl font-bold mb-2">Your Score Today</h2>
            <div className="text-5xl font-bold">{finalScore}</div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="card">
          <div className="p-4 border-b">
            <h2 className="text-2xl font-bold text-gray-800">Top Scores</h2>
          </div>

          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No scores yet today. Be the first!</p>
            </div>
          ) : (
            <div className="divide-y">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`p-4 flex items-center justify-between ${
                    index < 3 ? 'bg-yellow-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`text-2xl font-bold ${
                      index === 0 ? 'text-yellow-500' :
                      index === 1 ? 'text-gray-400' :
                      index === 2 ? 'text-orange-500' :
                      'text-gray-400'
                    }`}>
                      #{index + 1}
                    </div>

                    <div className="flex items-center gap-3">
                      {entry.user.profile_picture && (
                        <img
                          src={entry.user.profile_picture}
                          alt={entry.user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <div className="font-semibold text-gray-800">
                          {entry.user.username}
                        </div>
                        {entry.user.badge && (
                          <div className="text-xs text-gray-500">
                            {entry.user.badge}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-2xl font-bold text-primary">
                    {entry.score}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600 mb-4">
            You've already played today! Come back tomorrow for a new challenge.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary"
          >
            Refresh Leaderboard
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default TukacodlePage;
