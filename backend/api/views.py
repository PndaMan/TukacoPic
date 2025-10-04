from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth.models import User
from django.db.models import Count, Avg, Q
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from .models import Photo, Vote, UserProfile, Friendship, Reaction, Achievement, UserAchievement, Conversation, Message
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
    MessageSerializer
)
import random
from django.db import models


def check_and_unlock_achievements(user):
    """Check and unlock achievements for a user based on their stats"""
    # Get user stats
    vote_count = Vote.objects.filter(voter=user).count()
    photo_count = Photo.objects.filter(uploader=user).count()
    friend_count = Friendship.get_friends(user).count()
    reaction_count = Reaction.objects.filter(user=user).count()
    reactions_received = Reaction.objects.filter(photo__uploader=user).count()
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
        achievements_to_unlock.append('First Steps')
    if photo_count >= 1:
        achievements_to_unlock.append('Newbie Uploader')
    if friend_count >= 1:
        achievements_to_unlock.append('Social Starter')
    if reaction_count >= 1:
        achievements_to_unlock.append('Reactor')

    # Medium achievements
    if vote_count >= 100:
        achievements_to_unlock.append('Century Voter')
    if friend_count >= 10:
        achievements_to_unlock.append('Social Butterfly')
    if reactions_received >= 50:
        achievements_to_unlock.append('Popular')
    if streak >= 7:
        achievements_to_unlock.append('Consistent')
    if photo_count >= 50:
        achievements_to_unlock.append('Photographer')
    if reaction_count >= 100:
        achievements_to_unlock.append('Generous')

    # Hard achievements
    if vote_count >= 1000:
        achievements_to_unlock.append('Thousand Votes')
    if streak >= 30:
        achievements_to_unlock.append('Dedicated')
    if max_reactions_on_photo >= 100:
        achievements_to_unlock.append('Viral')
    if max_elo >= 1500:
        achievements_to_unlock.append('Elo Master')
    if photo_count >= 25 and avg_elo > 1200:
        achievements_to_unlock.append('Quality Creator')
    if friend_count >= 50:
        achievements_to_unlock.append('Friend to All')

    # Legendary achievements
    if streak >= 100:
        achievements_to_unlock.append('Obsessed')
    if vote_count >= 5000:
        achievements_to_unlock.append('Vote Master')
    if photo_count >= 200:
        achievements_to_unlock.append('King of Content')

    # Check if user has earned all badges
    badge = user.profile.get_badge()
    if badge == 'King of the Kov':
        achievements_to_unlock.append('Elite Collector')

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
    photos = Photo.objects.all()

    if photos.count() < 2:
        return Response(
            {'error': 'Not enough photos available for voting'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Get ALL photo pairs that have been voted on by ANYONE
    all_votes = Vote.objects.all()
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
        return Photo.objects.annotate(
            wins_count=Count('wins'),
            losses_count=Count('losses')
        ).order_by('-elo_score', '-created_at')[:100]  # Top 100 photos


class PhotoUploadView(generics.CreateAPIView):
    """Upload a new photo - authenticated users only"""
    serializer_class = PhotoSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # Check if duplicate before validation
        image = request.data.get('image')
        if image and hasattr(image, 'name'):
            if Photo.objects.filter(image__endswith=image.name).exists():
                return Response(
                    {
                        'message': f'Photo "{image.name}" already exists (duplicate skipped)',
                        'duplicate': True
                    },
                    status=status.HTTP_200_OK
                )

        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        photo = serializer.save()

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

        message = f'{len(photos)} photo(s) uploaded successfully'
        if skipped:
            message += f', {len(skipped)} duplicate(s) skipped'

        response_data = {
            'message': message,
            'photos': PhotoSerializer(photos, many=True).data
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