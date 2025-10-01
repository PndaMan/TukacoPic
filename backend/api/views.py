from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth.models import User
from django.db.models import Count, Avg
from django.db import IntegrityError
from .models import Photo, Vote
from .serializers import (
    UserRegistrationSerializer,
    PhotoSerializer,
    BulkPhotoUploadSerializer,
    PhotoPairSerializer,
    VoteCreateSerializer,
    VoteSerializer,
    LeaderboardSerializer
)
import random


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
            vote_serializer = VoteSerializer(vote)
            return Response(
                {
                    'message': 'Vote submitted successfully',
                    'vote': vote_serializer.data
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

        return Response(
            {
                'message': 'Photo uploaded successfully',
                'photo': PhotoSerializer(photo).data
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