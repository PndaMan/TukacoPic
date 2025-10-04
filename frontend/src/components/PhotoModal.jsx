import { useState, useEffect } from 'react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const PhotoModal = ({ photoId, isOpen, onClose }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Available reaction types
  const reactionTypes = ['❤️', '🔥', '😂', '😍', '👍', '😮'];

  useEffect(() => {
    if (isOpen && photoId) {
      fetchPhotoDetails();
    }
  }, [isOpen, photoId]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchPhotoDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/photos/${photoId}/`);
      setPhoto(response.data);
    } catch (error) {
      console.error('Error fetching photo details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (reactionType) => {
    if (!isAuthenticated) return;

    try {
      const hasReaction = photo.user_reaction?.includes(reactionType);

      if (hasReaction) {
        // Remove reaction
        await api.delete(`/photos/${photoId}/unreact/`, {
          data: { reaction_type: reactionType }
        });
      } else {
        // Add reaction
        await api.post(`/photos/${photoId}/react/`, { reaction_type: reactionType });
      }

      // Refresh photo details
      await fetchPhotoDetails();
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !isAuthenticated) return;

    try {
      setSubmitting(true);
      await api.post(`/photos/${photoId}/comments/`, {
        content: commentText
      });
      setCommentText('');
      await fetchPhotoDetails();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await api.delete(`/comments/${commentId}/`);
      await fetchPhotoDetails();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-0 md:p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white md:rounded-lg max-w-5xl w-full h-full md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col md:flex-row">
        {loading ? (
          <div className="flex items-center justify-center p-12 w-full">
            <div className="text-xl text-gray-600">Loading...</div>
          </div>
        ) : photo ? (
          <>
            {/* Left side - Photo */}
            <div className="md:w-2/3 bg-black flex items-center justify-center max-h-[40vh] md:max-h-[90vh]">
              <img
                src={photo.image}
                alt={`Photo by ${photo.uploader?.username}`}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Right side - Details, Reactions, Comments */}
            <div className="md:w-1/3 flex flex-col flex-1 md:flex-none overflow-y-auto md:max-h-[90vh]">
              {/* Header */}
              <div className="p-3 md:p-4 border-b flex justify-between items-center flex-shrink-0">
                <div className="min-w-0">
                  <h3 className="font-bold text-base md:text-lg truncate">{photo.uploader?.username}</h3>
                  <p className="text-xs md:text-sm text-gray-500">
                    {new Date(photo.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 text-3xl md:text-2xl ml-2 flex-shrink-0"
                >
                  ×
                </button>
              </div>

              {/* Reactions */}
              <div className="p-3 md:p-4 border-b flex-shrink-0">
                <h4 className="font-semibold mb-2 text-xs md:text-sm">Reactions</h4>
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {reactionTypes.map((reactionType) => {
                    const count = photo.reactions?.[reactionType] || 0;
                    const hasReacted = photo.user_reaction?.includes(reactionType);

                    return (
                      <button
                        key={reactionType}
                        onClick={() => handleReaction(reactionType)}
                        disabled={!isAuthenticated}
                        className={`px-2.5 md:px-3 py-1.5 md:py-1 rounded-full text-sm md:text-sm flex items-center gap-1 transition-colors ${
                          hasReacted
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 hover:bg-gray-200'
                        } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span className="text-base md:text-sm">{reactionType}</span>
                        {count > 0 && <span className="font-semibold text-xs md:text-sm">{count}</span>}
                      </button>
                    );
                  })}
                </div>
                {!isAuthenticated && (
                  <p className="text-xs text-gray-500 mt-2">Login to react to photos</p>
                )}
              </div>

              {/* Comments */}
              <div className="flex-1 overflow-y-auto p-3 md:p-4">
                <h4 className="font-semibold mb-2 md:mb-3 text-xs md:text-sm">
                  Comments ({photo.comments_count || 0})
                </h4>

                {photo.comments && photo.comments.length > 0 ? (
                  <div className="space-y-2 md:space-y-3">
                    {photo.comments.map((comment) => (
                      <div key={comment.id} className="bg-gray-50 rounded-lg p-2.5 md:p-3">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                            {comment.user?.profile_picture && (
                              <img
                                src={comment.user.profile_picture}
                                alt={comment.user.username}
                                className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover flex-shrink-0"
                              />
                            )}
                            <span className="font-semibold text-xs md:text-sm truncate">
                              {comment.user?.username}
                            </span>
                          </div>
                          {isAuthenticated && user?.id === comment.user?.id && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-red-500 hover:text-red-700 text-xs flex-shrink-0 ml-2"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-gray-700 break-words">{comment.content}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs md:text-sm text-gray-500 italic">No comments yet</p>
                )}
              </div>

              {/* Comment input */}
              {isAuthenticated ? (
                <form onSubmit={handleAddComment} className="p-3 md:p-4 border-t flex-shrink-0">
                  <div className="flex gap-1.5 md:gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a comment..."
                      maxLength={500}
                      className="flex-1 px-2.5 md:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-xs md:text-sm"
                      disabled={submitting}
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim() || submitting}
                      className="btn-primary text-xs md:text-sm px-3 md:px-4"
                    >
                      {submitting ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {commentText.length}/500
                  </p>
                </form>
              ) : (
                <div className="p-3 md:p-4 border-t bg-gray-50 flex-shrink-0">
                  <p className="text-xs md:text-sm text-gray-600 text-center">
                    Login to comment on photos
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-600">Failed to load photo</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoModal;
