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
    UserPhotosView,
    # New endpoints
    current_user_profile,
    public_user_profile,
    search_users,
    send_friend_request,
    accept_friend_request,
    reject_friend_request,
    unfriend,
    my_friends,
    friend_requests,
    add_reaction,
    remove_reaction,
    photo_reactions,
    # Messaging endpoints
    conversations,
    conversation_messages,
    mark_messages_read,
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

    # User profile endpoints (old)
    path('profile/', user_profile, name='user_profile'),
    path('photos/my/', UserPhotosView.as_view(), name='user_photos'),

    # User profile endpoints (new)
    path('profile/me/', current_user_profile, name='current_user_profile'),
    path('users/<int:user_id>/', public_user_profile, name='public_user_profile'),
    path('users/search/', search_users, name='search_users'),

    # Friend system endpoints
    path('friends/', my_friends, name='my_friends'),
    path('friends/requests/', friend_requests, name='friend_requests'),
    path('friends/request/send/', send_friend_request, name='send_friend_request'),
    path('friends/request/<int:friendship_id>/accept/', accept_friend_request, name='accept_friend_request'),
    path('friends/request/<int:friendship_id>/reject/', reject_friend_request, name='reject_friend_request'),
    path('friends/<int:user_id>/unfriend/', unfriend, name='unfriend'),

    # Reaction endpoints
    path('photos/<int:photo_id>/reactions/', photo_reactions, name='photo_reactions'),
    path('photos/<int:photo_id>/react/', add_reaction, name='add_reaction'),
    path('photos/<int:photo_id>/unreact/', remove_reaction, name='remove_reaction'),

    # Messaging endpoints
    path('conversations/', conversations, name='conversations'),
    path('conversations/<int:user_id>/', conversation_messages, name='conversation_messages'),
    path('conversations/<int:conversation_id>/read/', mark_messages_read, name='mark_messages_read'),
]