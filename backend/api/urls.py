from django.urls import path
from .authentication import CustomTokenObtainPairView, CustomTokenRefreshView
from .views import (
    UserRegistrationView,
    get_photo_pair,
    submit_vote,
    LeaderboardView,
    PhotoUploadView,
    bulk_photo_upload,
    user_profile,
    UserPhotosView
)

urlpatterns = [
    # Authentication endpoints
    path('users/register/', UserRegistrationView.as_view(), name='user_register'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),

    # Application endpoints
    path('photos/pair/', get_photo_pair, name='photo_pair'),
    path('vote/', submit_vote, name='submit_vote'),
    path('leaderboard/', LeaderboardView.as_view(), name='leaderboard'),
    path('photos/upload/', PhotoUploadView.as_view(), name='photo_upload'),
    path('photos/upload/bulk/', bulk_photo_upload, name='bulk_photo_upload'),

    # User profile endpoints
    path('profile/', user_profile, name='user_profile'),
    path('photos/my/', UserPhotosView.as_view(), name='user_photos'),
]