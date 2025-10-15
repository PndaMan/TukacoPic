from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth.models import User
from django.db.models import Count, Avg, Q
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from .models import Photo, Vote, UserProfile, Friendship, Reaction, Achievement, UserAchievement, Conversation, Message, Comment, TukacodleScore
from .serializers import (
    UserRegistrationSerializer,
    PhotoSerializer,
    BulkPhotoUploadSerializer,
    PhotoPairSerializer,
    VoteCreateSerializer,
    VoteSerializer,
    LeaderboardSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    PublicUserSerializer,
    FriendshipSerializer,
    FriendRequestSerializer,
    ReactionSerializer,
    PhotoWithReactionsSerializer,
    ConversationSerializer,
    MessageSerializer,
    CommentSerializer,
    PhotoWithCommentsSerializer,
    TukacodleScoreSerializer
)
import random
import hashlib
from django.db import models


def check_and_unlock_achievements(user):
    """Check and unlock achievements for a user based on their stats"""
    # Get user stats
    vote_count = Vote.objects.filter(voter=user).count()
    photo_count = Photo.objects.filter(uploader=user).count()
    friend_count = Friendship.get_friends(user).count()
    reaction_count = Reaction.objects.filter(user=user).count()
    reactions_received = Reaction.objects.filter(photo__uploader=user).count()
    comment_count = Comment.objects.filter(user=user).count()
    streak = user.profile.current_voting_streak
    max_elo = Photo.objects.filter(uploader=user).aggregate(max_elo=models.Max('elo_score'))['max_elo'] or 0
    avg_elo = Photo.objects.filter(uploader=user).aggregate(avg_elo=Avg('elo_score'))['avg_elo'] or 0

    # Get single photo max reactions
    max_reactions_on_photo = 0
    for photo in Photo.objects.filter(uploader=user):
        photo_reactions = Reaction.objects.filter(photo=photo).count()
        if photo_reactions > max_reactions_on_photo:
            max_reactions_on_photo = photo_reactions

    # Achievement conditions
    achievements_to_unlock = []

    # Easy achievements
    if vote_count >= 1:
        achievements_to_unlock.append('Ivan Initiate')
    if photo_count >= 1:
        achievements_to_unlock.append('Photo Pioneer')
    if friend_count >= 1:
        achievements_to_unlock.append('Friendly Face')
    if reaction_count >= 1:
        achievements_to_unlock.append('Heart Giver')
    if comment_count >= 1:
        achievements_to_unlock.append('Commentator')

    # Medium achievements
    if vote_count >= 50:
        achievements_to_unlock.append('Ivan Enthusiast')
    if friend_count >= 5:
        achievements_to_unlock.append('Popular Voter')
    if reactions_received >= 25:
        achievements_to_unlock.append('Rising Star')
    if streak >= 3:
        achievements_to_unlock.append('Daily Devotee')
    if photo_count >= 10:
        achievements_to_unlock.append('Photo Collector')
    if reaction_count >= 50:
        achievements_to_unlock.append('Love Spreader')
    if comment_count >= 10:
        achievements_to_unlock.append('Talkative Critic')

    # Hard achievements
    if vote_count >= 500:
        achievements_to_unlock.append('Ivan Expert')
    if streak >= 7:
        achievements_to_unlock.append('Streak Master')
    if max_reactions_on_photo >= 50:
        achievements_to_unlock.append('Crowd Favorite')
    if max_elo >= 1400:
        achievements_to_unlock.append('ELO Champion')
    if photo_count >= 15 and avg_elo >= 1200:
        achievements_to_unlock.append('Quality Ivan Pics')
    if friend_count >= 20:
        achievements_to_unlock.append('Social Legend')
    if comment_count >= 50:
        achievements_to_unlock.append('Comment Connoisseur')

    # Legendary achievements
    if streak >= 30:
        achievements_to_unlock.append('TukacoPic Addict')
    if vote_count >= 2000:
        achievements_to_unlock.append('Ivan Connoisseur')
    if photo_count >= 100:
        achievements_to_unlock.append('Photo Library Master')

    # Check if user has earned all badges
    badge = user.profile.get_badge()
    if badge == 'King of the Kov':
        achievements_to_unlock.append('King of the Kov')

    # Unlock achievements
    unlocked = []
    for achievement_name in achievements_to_unlock:
        try:
            achievement = Achievement.objects.get(name=achievement_name)
            user_achievement, created = UserAchievement.objects.get_or_create(
                user=user,
                achievement=achievement
            )
            if created:
                unlocked.append(achievement_name)
        except Achievement.DoesNotExist:
            continue

    return unlocked


class UserRegistrationView(generics.CreateAPIView):
    """User registration endpoint - public access"""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                'message': 'User created successfully',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            },
            status=status.HTTP_201_CREATED
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_photo_pair(request):
    """Get two random photos for voting that haven't been voted on by anyone"""
    photos = Photo.objects.select_related('uploader').all()

    if photos.count() < 2:
        return Response(
            {'error': 'Not enough photos available for voting'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get ALL photo pairs that have been voted on by ANYONE
    all_votes = Vote.objects.select_related('winner', 'loser').only('winner_id', 'loser_id').all()
    voted_pairs = set()

    for vote in all_votes:
        # Add both orderings of the pair (A,B) and (B,A)
        pair1 = tuple(sorted([vote.winner.id, vote.loser.id]))
        voted_pairs.add(pair1)

    # Find unvoted photo pairs (never voted on by anyone)
    photo_ids = list(photos.values_list('id', flat=True))
    available_pairs = []

    for i in range(len(photo_ids)):
        for j in range(i + 1, len(photo_ids)):
            pair = tuple(sorted([photo_ids[i], photo_ids[j]]))
            if pair not in voted_pairs:
                available_pairs.append([photo_ids[i], photo_ids[j]])

    if not available_pairs:
        return Response(
            {'error': 'You reached the end, consider uploading more Ivan photos'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Select a random unvoted pair
    selected_ids = random.choice(available_pairs)
    selected_photos = Photo.objects.filter(id__in=selected_ids)

    serializer = PhotoPairSerializer(selected_photos, many=True)
    return Response({'photos': serializer.data})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_vote(request):
    """Submit a vote for a photo pair"""
    serializer = VoteCreateSerializer(data=request.data, context={'request': request})

    if serializer.is_valid():
        try:
            vote = serializer.save()

            # Update voting streak
            request.user.profile.update_voting_streak()

            # Check and unlock achievements
            unlocked = check_and_unlock_achievements(request.user)

            vote_serializer = VoteSerializer(vote)
            return Response(
                {
                    'message': 'Vote submitted successfully',
                    'vote': vote_serializer.data,
                    'unlocked_achievements': unlocked
                },
                status=status.HTTP_201_CREATED
            )
        except IntegrityError:
            return Response(
                {'error': 'You have already voted on this photo pair'},
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LeaderboardView(generics.ListAPIView):
    """Public leaderboard of top photos"""
    serializer_class = LeaderboardSerializer
    permission_classes = [AllowAny]
    pagination_class = None  # Disable pagination for leaderboard

    def get_queryset(self):
        return Photo.objects.select_related('uploader').annotate(
            wins_count=Count('wins'),
            losses_count=Count('losses')
        ).order_by('-elo_score', '-created_at')[:100]  # Top 100 photos


class PhotoUploadView(generics.CreateAPIView):
    """Upload a new photo - authenticated users only"""
    serializer_class = PhotoSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # Calculate hash of uploaded image to check for duplicates
        image = request.data.get('image')
        if image and hasattr(image, 'read'):
            # Read the file content
            image.seek(0)  # Reset file pointer to beginning
            file_content = image.read()
            file_hash = hashlib.sha256(file_content).hexdigest()
            image.seek(0)  # Reset again for actual upload

            # Check if this exact file already exists
            existing_photo = Photo.objects.filter(file_hash=file_hash).select_related('uploader').first()
            if existing_photo:
                return Response(
                    {
                        'message': f'This photo already exists (uploaded by {existing_photo.uploader.username})',
                        'duplicate': True,
                        'original_uploader': existing_photo.uploader.username,
                        'original_upload_date': existing_photo.created_at
                    },
                    status=status.HTTP_200_OK
                )

        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        # Save with hash
        photo = serializer.save(file_hash=file_hash if image else None)

        # Check and unlock achievements
        unlocked = check_and_unlock_achievements(request.user)

        return Response(
            {
                'message': 'Photo uploaded successfully',
                'photo': PhotoSerializer(photo).data,
                'unlocked_achievements': unlocked
            },
            status=status.HTTP_201_CREATED
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_photo_upload(request):
    """Upload multiple photos at once"""
    serializer = BulkPhotoUploadSerializer(data=request.data, context={'request': request})

    if serializer.is_valid():
        photos = serializer.save()
        skipped = getattr(serializer, 'skipped_files', [])

        # Check and unlock achievements
        unlocked = check_and_unlock_achievements(request.user)

        message = f'{len(photos)} photo(s) uploaded successfully'
        if skipped:
            message += f', {len(skipped)} duplicate(s) skipped'

        response_data = {
            'message': message,
            'photos': PhotoSerializer(photos, many=True).data,
            'unlocked_achievements': unlocked
        }

        if skipped:
            response_data['skipped'] = skipped

        return Response(response_data, status=status.HTTP_201_CREATED)
    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get current user's profile information"""
    user = request.user
    user_photos = Photo.objects.filter(uploader=user)
    user_votes = Vote.objects.filter(voter=user)

    return Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'date_joined': user.date_joined
        },
        'stats': {
            'photos_uploaded': user_photos.count(),
            'votes_cast': user_votes.count(),
            'total_elo': sum(photo.elo_score for photo in user_photos),
            'average_elo': user_photos.aggregate(
                avg_elo=Avg('elo_score')
            )['avg_elo'] or 0
        }
    })


class UserPhotosView(generics.ListAPIView):
    """Get current user's uploaded photos"""
    serializer_class = PhotoSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination to return all user photos

    def get_queryset(self):
        return Photo.objects.filter(uploader=self.request.user).order_by('-created_at')


# ============= NEW USER PROFILE ENDPOINTS =============

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def current_user_profile(request):
    """Get or update current user's profile"""
    profile = request.user.profile

    if request.method == 'GET':
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        serializer = UserProfileUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            response_serializer = UserProfileSerializer(profile)
            return Response(response_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_user_profile(request, user_id):
    """Get public profile of any user"""
    user = get_object_or_404(User, id=user_id)

    # Get user's stats
    user_photos = Photo.objects.filter(uploader=user)
    user_votes = Vote.objects.filter(voter=user)

    # Get best performing photos (top 12 by Elo score)
    best_photos = user_photos.order_by('-elo_score')[:12]

    # Check if requesting user is friends with this user
    is_friend = False
    friendship_status = None
    if request.user.is_authenticated:
        is_friend = Friendship.are_friends(request.user, user)
        # Check if there's a pending request
        pending_request = Friendship.objects.filter(
            Q(from_user=request.user, to_user=user, status='pending') |
            Q(from_user=user, to_user=request.user, status='pending')
        ).first()
        if pending_request:
            friendship_status = 'pending_from_me' if pending_request.from_user == request.user else 'pending_from_them'
        elif is_friend:
            friendship_status = 'friends'

    return Response({
        'user': PublicUserSerializer(user).data,
        'stats': {
            'photos_uploaded': user_photos.count(),
            'votes_cast': user_votes.count(),
            'total_elo': sum(photo.elo_score for photo in user_photos),
            'average_elo': user_photos.aggregate(avg_elo=Avg('elo_score'))['avg_elo'] or 0
        },
        'best_photos': PhotoWithReactionsSerializer(best_photos, many=True, context={'request': request}).data,
        'is_friend': is_friend,
        'friendship_status': friendship_status
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def search_users(request):
    """Search for users by username"""
    query = request.GET.get('q', '')
    if len(query) < 2:
        return Response({'users': []})

    users = User.objects.filter(username__icontains=query).select_related('profile')[:20]
    return Response({'users': PublicUserSerializer(users, many=True).data})


# ============= FRIEND SYSTEM ENDPOINTS =============

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_friend_request(request):
    """Send a friend request to another user"""
    serializer = FriendRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    to_user_id = serializer.validated_data['to_user_id']
    to_user = get_object_or_404(User, id=to_user_id)

    # Can't send request to self
    if to_user == request.user:
        return Response({'error': 'Cannot send friend request to yourself'}, status=status.HTTP_400_BAD_REQUEST)

    # Check if already friends
    if Friendship.are_friends(request.user, to_user):
        return Response({'error': 'Already friends'}, status=status.HTTP_400_BAD_REQUEST)

    # Check if request already exists
    existing = Friendship.objects.filter(
        Q(from_user=request.user, to_user=to_user) |
        Q(from_user=to_user, to_user=request.user)
    ).first()

    if existing:
        if existing.status == 'pending':
            return Response({'error': 'Friend request already pending'}, status=status.HTTP_400_BAD_REQUEST)
        elif existing.status == 'rejected':
            # Allow resend if previously rejected
            existing.status = 'pending'
            existing.from_user = request.user
            existing.to_user = to_user
            existing.save()
            return Response(FriendshipSerializer(existing).data, status=status.HTTP_200_OK)

    # Create new friend request
    friendship = Friendship.objects.create(from_user=request.user, to_user=to_user)
    return Response(FriendshipSerializer(friendship).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def accept_friend_request(request, friendship_id):
    """Accept a friend request"""
    friendship = get_object_or_404(Friendship, id=friendship_id)

    # Only the recipient can accept
    if friendship.to_user != request.user:
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    if friendship.status != 'pending':
        return Response({'error': 'Request is not pending'}, status=status.HTTP_400_BAD_REQUEST)

    friendship.status = 'accepted'
    friendship.save()

    # Check and unlock achievements for both users
    check_and_unlock_achievements(request.user)
    check_and_unlock_achievements(friendship.from_user)

    return Response(FriendshipSerializer(friendship).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reject_friend_request(request, friendship_id):
    """Reject a friend request"""
    friendship = get_object_or_404(Friendship, id=friendship_id)

    # Only the recipient can reject
    if friendship.to_user != request.user:
        return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    if friendship.status != 'pending':
        return Response({'error': 'Request is not pending'}, status=status.HTTP_400_BAD_REQUEST)

    friendship.status = 'rejected'
    friendship.save()

    return Response({'message': 'Friend request rejected'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def unfriend(request, user_id):
    """Remove a friend"""
    other_user = get_object_or_404(User, id=user_id)

    friendship = Friendship.objects.filter(
        Q(from_user=request.user, to_user=other_user, status='accepted') |
        Q(from_user=other_user, to_user=request.user, status='accepted')
    ).first()

    if not friendship:
        return Response({'error': 'Not friends'}, status=status.HTTP_400_BAD_REQUEST)

    friendship.delete()
    return Response({'message': 'Unfriended successfully'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_friends(request):
    """Get current user's friends"""
    friends = Friendship.get_friends(request.user)
    return Response({'friends': PublicUserSerializer(friends, many=True).data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def friend_requests(request):
    """Get pending friend requests"""
    # Requests sent to me
    received = Friendship.objects.filter(to_user=request.user, status='pending')
    # Requests I sent
    sent = Friendship.objects.filter(from_user=request.user, status='pending')

    return Response({
        'received': FriendshipSerializer(received, many=True).data,
        'sent': FriendshipSerializer(sent, many=True).data
    })


# ============= REACTION ENDPOINTS =============

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_reaction(request, photo_id):
    """Add a reaction to a photo"""
    photo = get_object_or_404(Photo, id=photo_id)
    reaction_type = request.data.get('reaction_type')

    if reaction_type not in ['heart', 'fire']:
        return Response({'error': 'Invalid reaction type'}, status=status.HTTP_400_BAD_REQUEST)

    # Create or get existing reaction
    reaction, created = Reaction.objects.get_or_create(
        user=request.user,
        photo=photo,
        reaction_type=reaction_type
    )

    # Check and unlock achievements
    unlocked = check_and_unlock_achievements(request.user)

    if created:
        response_data = ReactionSerializer(reaction).data
        response_data['unlocked_achievements'] = unlocked
        return Response(response_data, status=status.HTTP_201_CREATED)
    else:
        return Response({'message': 'Already reacted'}, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_reaction(request, photo_id):
    """Remove a reaction from a photo"""
    photo = get_object_or_404(Photo, id=photo_id)
    reaction_type = request.data.get('reaction_type')

    if reaction_type not in ['heart', 'fire']:
        return Response({'error': 'Invalid reaction type'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        reaction = Reaction.objects.get(user=request.user, photo=photo, reaction_type=reaction_type)
        reaction.delete()
        return Response({'message': 'Reaction removed'})
    except Reaction.DoesNotExist:
        return Response({'error': 'Reaction not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([AllowAny])
def photo_reactions(request, photo_id):
    """Get all reactions for a photo"""
    photo = get_object_or_404(Photo, id=photo_id)
    serializer = PhotoWithReactionsSerializer(photo, context={'request': request})
    return Response(serializer.data)


# Messaging endpoints
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def conversations(request):
    """Get all conversations for the current user"""
    user = request.user

    # Get conversations where user is either participant
    user_conversations = Conversation.objects.filter(
        models.Q(participant1=user) | models.Q(participant2=user)
    ).prefetch_related('messages')

    serializer = ConversationSerializer(user_conversations, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def conversation_messages(request, user_id):
    """Get or create conversation with a user and return messages"""
    other_user = get_object_or_404(User, id=user_id)

    if other_user == request.user:
        return Response({'error': 'Cannot message yourself'}, status=status.HTTP_400_BAD_REQUEST)

    # Get or create conversation
    conversation = Conversation.get_or_create_conversation(request.user, other_user)

    if request.method == 'GET':
        # Return all messages in the conversation
        messages = conversation.messages.all()
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        # Send a new message
        content = request.data.get('content', '').strip()

        if not content:
            return Response({'error': 'Message content is required'}, status=status.HTTP_400_BAD_REQUEST)

        if len(content) > 1000:
            return Response({'error': 'Message too long. Maximum 1000 characters.'}, status=status.HTTP_400_BAD_REQUEST)

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content
        )

        serializer = MessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_messages_read(request, conversation_id):
    """Mark all messages in a conversation as read"""
    conversation = get_object_or_404(Conversation, id=conversation_id)

    # Verify user is part of this conversation
    if request.user not in [conversation.participant1, conversation.participant2]:
        return Response({'error': 'You are not part of this conversation'}, status=status.HTTP_403_FORBIDDEN)

    # Mark all messages from the other user as read
    conversation.messages.exclude(sender=request.user).update(is_read=True)

    return Response({'message': 'Messages marked as read'})


# Comment endpoints
@api_view(['GET'])
@permission_classes([AllowAny])
def photo_detail(request, photo_id):
    """Get photo details with comments and reactions"""
    photo = get_object_or_404(Photo, id=photo_id)
    serializer = PhotoWithCommentsSerializer(photo, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_comment(request, photo_id):
    """Add a comment to a photo"""
    photo = get_object_or_404(Photo, id=photo_id)
    content = request.data.get('content', '').strip()

    if not content:
        return Response({'error': 'Comment content is required'}, status=status.HTTP_400_BAD_REQUEST)

    if len(content) > 500:
        return Response({'error': 'Comment too long. Maximum 500 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    comment = Comment.objects.create(
        photo=photo,
        user=request.user,
        content=content
    )

    # Check for comment achievements
    check_and_unlock_achievements(request.user)

    serializer = CommentSerializer(comment)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_comment(request, comment_id):
    """Delete a comment (only by the comment author)"""
    comment = get_object_or_404(Comment, id=comment_id)

    if comment.user != request.user:
        return Response({'error': 'You can only delete your own comments'}, status=status.HTTP_403_FORBIDDEN)

    comment.delete()
    return Response({'message': 'Comment deleted'})


# Tukacodle endpoints
from datetime import date

@api_view(['POST'])
@permission_classes([AllowAny])
def tukacodle_start(request):
    """Start a new Tukacodle game - get two random photos (excluding top 20 by Elo)"""
    # Get all photos and exclude top 20 by Elo to balance the game
    all_photos = Photo.objects.select_related('uploader').all()
    top_20_ids = all_photos.order_by('-elo_score')[:20].values_list('id', flat=True)
    photos = all_photos.exclude(id__in=top_20_ids)

    if photos.count() < 2:
        return Response({'error': 'Not enough photos for Tukacodle'}, status=status.HTTP_400_BAD_REQUEST)

    # Get two random photos
    random_photos = random.sample(list(photos), 2)
    serializer = PhotoPairSerializer(random_photos, many=True)

    return Response({
        'photos': serializer.data
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def tukacodle_guess(request):
    """
    Submit a guess - check if correct
    Request: { chosen_id, other_id, current_streak }
    Returns: { correct: bool, next_photo?: Photo, game_over?: bool, final_score?: int }
    """
    chosen_id = request.data.get('chosen_id')
    other_id = request.data.get('other_id')
    current_streak = request.data.get('current_streak', 0)

    if not chosen_id or not other_id:
        return Response({'error': 'Both photo IDs required'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        chosen_photo = Photo.objects.get(id=chosen_id)
        other_photo = Photo.objects.get(id=other_id)
    except Photo.DoesNotExist:
        return Response({'error': 'Photo not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check if guess was correct
    correct = chosen_photo.elo_score >= other_photo.elo_score

    if correct:
        # Get a new random photo (excluding the winner and top 20 by Elo)
        all_photos = Photo.objects.all()
        top_20_ids = all_photos.order_by('-elo_score')[:20].values_list('id', flat=True)
        photos = all_photos.exclude(id=chosen_id).exclude(id__in=top_20_ids)

        if photos.count() == 0:
            return Response({
                'correct': True,
                'game_over': True,
                'final_score': current_streak + 1,
                'message': 'Congratulations! You\'ve compared all photos!'
            })

        next_photo = random.choice(photos)
        serializer = PhotoPairSerializer(next_photo)

        return Response({
            'correct': True,
            'next_photo': serializer.data,
            'current_streak': current_streak + 1
        })
    else:
        # Game over - save score if authenticated
        final_score = current_streak

        if request.user.is_authenticated:
            # Get current attempt count for today
            today = date.today()
            attempts_today = TukacodleScore.objects.filter(user=request.user, date=today).count()

            if attempts_today < 3:
                # Save score for this attempt
                TukacodleScore.objects.create(
                    user=request.user,
                    date=today,
                    score=final_score,
                    attempt_number=attempts_today + 1
                )

        return Response({
            'correct': False,
            'game_over': True,
            'final_score': final_score,
            'correct_answer': f"{chosen_photo.uploader.username}'s photo had {int(chosen_photo.elo_score)} ELO, while {other_photo.uploader.username}'s had {int(other_photo.elo_score)} ELO"
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def tukacodle_leaderboard(request):
    """Get today's Tukacodle leaderboard - shows highest score per user"""
    today = date.today()

    # Get all scores for today
    all_scores = TukacodleScore.objects.filter(date=today).select_related('user__profile')

    # Group by user and keep only highest score
    user_best_scores = {}
    for score in all_scores:
        user_id = score.user.id
        if user_id not in user_best_scores or score.score > user_best_scores[user_id].score:
            user_best_scores[user_id] = score

    # Convert to list and sort by score descending
    best_scores = sorted(user_best_scores.values(), key=lambda x: (-x.score, x.created_at))

    serializer = TukacodleScoreSerializer(best_scores, many=True)

    return Response({
        'date': today,
        'scores': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tukacodle_user_score(request):
    """Check if user has played today and get their scores"""
    today = date.today()

    # Get all attempts for today
    scores = TukacodleScore.objects.filter(user=request.user, date=today).order_by('-score')

    if scores.exists():
        attempts_used = scores.count()
        attempts_remaining = 3 - attempts_used
        highest_score = scores.first()

        return Response({
            'played_today': True,
            'attempts_used': attempts_used,
            'attempts_remaining': attempts_remaining,
            'can_play_again': attempts_remaining > 0,
            'highest_score': highest_score.score,
            'all_scores': [s.score for s in scores]
        })
    else:
        return Response({
            'played_today': False,
            'attempts_used': 0,
            'attempts_remaining': 3,
            'can_play_again': True
        })