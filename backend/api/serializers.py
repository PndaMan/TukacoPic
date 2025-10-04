from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Photo, Vote, UserProfile, Friendship, Reaction, Achievement, UserAchievement, Conversation, Message, Comment, TukacodleScore
import hashlib


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'date_joined']
        read_only_fields = ['id', 'date_joined']


class PhotoSerializer(serializers.ModelSerializer):
    uploader = UserSerializer(read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = ['id', 'uploader', 'image', 'elo_score', 'created_at']
        read_only_fields = ['id', 'uploader', 'elo_score', 'created_at']

    def get_image(self, obj):
        if obj.image:
            return f"https://apitukacopic.aether-lab.xyz{obj.image.url}"
        return None

    def create(self, validated_data):
        validated_data['uploader'] = self.context['request'].user
        return super().create(validated_data)

    def validate_image(self, value):
        # Check file size (100MB = 104857600 bytes)
        if value.size > 104857600:
            raise serializers.ValidationError("Image file too large. Maximum size is 100MB.")

        return value


class BulkPhotoUploadSerializer(serializers.Serializer):
    images = serializers.ListField(
        child=serializers.ImageField(),
        max_length=70,  # Allow up to 70 photos at once
        min_length=1
    )

    def validate_images(self, value):
        # Check individual file sizes (100MB = 104857600 bytes)
        for image in value:
            if image.size > 104857600:
                raise serializers.ValidationError(f"Image {image.name} is too large. Maximum size is 100MB per file.")

        # Check total upload size (150MB = 157286400 bytes)
        total_size = sum(image.size for image in value)
        if total_size > 157286400:
            total_mb = total_size / 1048576  # Convert to MB
            raise serializers.ValidationError(f"Total upload size is {total_mb:.1f}MB. Maximum total size is 150MB.")

        return value

    def create(self, validated_data):
        images = validated_data['images']
        user = self.context['request'].user
        photos = []
        skipped = []

        for image in images:
            # Calculate hash to check for duplicates
            image.seek(0)
            file_content = image.read()
            file_hash = hashlib.sha256(file_content).hexdigest()
            image.seek(0)

            # Skip if duplicate hash exists
            if Photo.objects.filter(file_hash=file_hash).exists():
                skipped.append(image.name)
                continue

            photo = Photo.objects.create(uploader=user, image=image, file_hash=file_hash)
            photos.append(photo)

        # Store skipped files info for response
        self.skipped_files = skipped

        return photos


class PhotoPairSerializer(serializers.ModelSerializer):
    uploader = UserSerializer(read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = ['id', 'uploader', 'image', 'elo_score']

    def get_image(self, obj):
        if obj.image:
            return f"https://apitukacopic.aether-lab.xyz{obj.image.url}"
        return None


class VoteSerializer(serializers.ModelSerializer):
    voter = UserSerializer(read_only=True)
    winner = PhotoSerializer(read_only=True)
    loser = PhotoSerializer(read_only=True)

    class Meta:
        model = Vote
        fields = ['id', 'voter', 'winner', 'loser', 'voted_at']
        read_only_fields = ['id', 'voter', 'voted_at']


class VoteCreateSerializer(serializers.Serializer):
    winner_id = serializers.IntegerField()
    loser_id = serializers.IntegerField()

    def validate(self, attrs):
        winner_id = attrs['winner_id']
        loser_id = attrs['loser_id']

        if winner_id == loser_id:
            raise serializers.ValidationError("Winner and loser must be different photos")

        # Check if photos exist
        try:
            Photo.objects.get(id=winner_id)
            Photo.objects.get(id=loser_id)
        except Photo.DoesNotExist:
            raise serializers.ValidationError("One or both photos do not exist")

        return attrs

    def create(self, validated_data):
        winner = Photo.objects.get(id=validated_data['winner_id'])
        loser = Photo.objects.get(id=validated_data['loser_id'])

        vote = Vote.objects.create(
            voter=self.context['request'].user,
            winner=winner,
            loser=loser
        )
        return vote


class LeaderboardSerializer(serializers.ModelSerializer):
    uploader = UserSerializer(read_only=True)
    wins_count = serializers.IntegerField(read_only=True)
    losses_count = serializers.IntegerField(read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = ['id', 'uploader', 'image', 'elo_score', 'created_at', 'wins_count', 'losses_count']

    def get_image(self, obj):
        if obj.image:
            return f"https://apitukacopic.aether-lab.xyz{obj.image.url}"
        return None


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    date_joined = serializers.DateTimeField(source='user.date_joined', read_only=True)
    badge = serializers.SerializerMethodField()
    badge_progress = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    banner_image = serializers.SerializerMethodField()
    achievements = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['id', 'username', 'email', 'date_joined', 'profile_picture', 'banner_image',
                  'bio', 'badge', 'badge_progress', 'current_voting_streak', 'longest_voting_streak',
                  'achievements', 'stats', 'created_at', 'updated_at']
        read_only_fields = ['id', 'current_voting_streak', 'longest_voting_streak', 'created_at', 'updated_at']

    def get_badge(self, obj):
        return obj.get_badge()

    def get_badge_progress(self, obj):
        return obj.get_badge_progress()

    def get_profile_picture(self, obj):
        if obj.profile_picture:
            return f"https://apitukacopic.aether-lab.xyz{obj.profile_picture.url}"
        return None

    def get_banner_image(self, obj):
        if obj.banner_image:
            return f"https://apitukacopic.aether-lab.xyz{obj.banner_image.url}"
        return None

    def get_achievements(self, obj):
        user_achievements = UserAchievement.objects.filter(user=obj.user).select_related('achievement')
        return UserAchievementSerializer(user_achievements, many=True).data

    def get_stats(self, obj):
        from django.db.models import Avg, Sum

        photos = obj.user.uploaded_photos.all()
        votes_cast = obj.user.votes.count()

        if photos.exists():
            total_elo = photos.aggregate(total=Sum('elo_score'))['total'] or 0
            average_elo = photos.aggregate(avg=Avg('elo_score'))['avg'] or 0
        else:
            total_elo = 0
            average_elo = 0

        return {
            'votes_cast': votes_cast,
            'total_elo': total_elo,
            'average_elo': average_elo
        }


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['profile_picture', 'banner_image', 'bio']

    def validate_profile_picture(self, value):
        if value and value.size > 10485760:  # 10MB
            raise serializers.ValidationError("Profile picture too large. Maximum size is 10MB.")
        return value

    def validate_banner_image(self, value):
        if value and value.size > 10485760:  # 10MB
            raise serializers.ValidationError("Banner image too large. Maximum size is 10MB.")
        return value


class PublicUserSerializer(serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()
    banner_image = serializers.SerializerMethodField()
    badge = serializers.SerializerMethodField()
    bio = serializers.CharField(source='profile.bio', read_only=True)
    current_voting_streak = serializers.IntegerField(source='profile.current_voting_streak', read_only=True)
    longest_voting_streak = serializers.IntegerField(source='profile.longest_voting_streak', read_only=True)
    achievements = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'date_joined', 'profile_picture', 'banner_image', 'badge', 'bio',
                  'current_voting_streak', 'longest_voting_streak', 'achievements', 'stats']

    def get_profile_picture(self, obj):
        if hasattr(obj, 'profile') and obj.profile.profile_picture:
            return f"https://apitukacopic.aether-lab.xyz{obj.profile.profile_picture.url}"
        return None

    def get_banner_image(self, obj):
        if hasattr(obj, 'profile') and obj.profile.banner_image:
            return f"https://apitukacopic.aether-lab.xyz{obj.profile.banner_image.url}"
        return None

    def get_badge(self, obj):
        if hasattr(obj, 'profile'):
            return obj.profile.get_badge()
        return None

    def get_achievements(self, obj):
        user_achievements = UserAchievement.objects.filter(user=obj).select_related('achievement')
        return UserAchievementSerializer(user_achievements, many=True).data

    def get_stats(self, obj):
        from django.db.models import Avg, Sum

        photos = obj.uploaded_photos.all()
        votes_cast = obj.votes.count()

        if photos.exists():
            total_elo = photos.aggregate(total=Sum('elo_score'))['total'] or 0
            average_elo = photos.aggregate(avg=Avg('elo_score'))['avg'] or 0
        else:
            total_elo = 0
            average_elo = 0

        return {
            'photos_uploaded': photos.count(),
            'votes_cast': votes_cast,
            'total_elo': total_elo,
            'average_elo': average_elo
        }


class FriendshipSerializer(serializers.ModelSerializer):
    from_user = PublicUserSerializer(read_only=True)
    to_user = PublicUserSerializer(read_only=True)

    class Meta:
        model = Friendship
        fields = ['id', 'from_user', 'to_user', 'status', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class FriendRequestSerializer(serializers.Serializer):
    to_user_id = serializers.IntegerField()

    def validate_to_user_id(self, value):
        try:
            User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User does not exist")
        return value


class ReactionSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)

    class Meta:
        model = Reaction
        fields = ['id', 'user', 'photo', 'reaction_type', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class PhotoWithReactionsSerializer(serializers.ModelSerializer):
    uploader = PublicUserSerializer(read_only=True)
    image = serializers.SerializerMethodField()
    reactions = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = ['id', 'uploader', 'image', 'elo_score', 'created_at', 'reactions', 'user_reaction']

    def get_image(self, obj):
        if obj.image:
            return f"https://apitukacopic.aether-lab.xyz{obj.image.url}"
        return None

    def get_reactions(self, obj):
        """Get reaction counts grouped by type"""
        reaction_counts = {}
        for reaction in obj.reactions.all():
            if reaction.reaction_type not in reaction_counts:
                reaction_counts[reaction.reaction_type] = 0
            reaction_counts[reaction.reaction_type] += 1
        return reaction_counts

    def get_user_reaction(self, obj):
        """Get current user's reaction if any"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            user_reactions = obj.reactions.filter(user=request.user).values_list('reaction_type', flat=True)
            return list(user_reactions)
        return []


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ['id', 'name', 'description', 'icon', 'difficulty', 'points']


class UserAchievementSerializer(serializers.ModelSerializer):
    achievement = AchievementSerializer(read_only=True)

    class Meta:
        model = UserAchievement
        fields = ['id', 'achievement', 'unlocked_at']


class MessageSerializer(serializers.ModelSerializer):
    sender = PublicUserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'content', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'other_user', 'last_message', 'unread_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_other_user(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            other_user = obj.get_other_user(request.user)
            return PublicUserSerializer(other_user).data
        return None

    def get_last_message(self, obj):
        last_message = obj.messages.last()
        if last_message:
            return MessageSerializer(last_message).data
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0


class CommentSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'photo', 'user', 'content', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']


class PhotoWithCommentsSerializer(serializers.ModelSerializer):
    uploader = PublicUserSerializer(read_only=True)
    image = serializers.SerializerMethodField()
    reactions = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = Photo
        fields = ['id', 'uploader', 'image', 'elo_score', 'created_at', 'reactions', 'user_reaction', 'comments', 'comments_count']

    def get_image(self, obj):
        if obj.image:
            return f"https://apitukacopic.aether-lab.xyz{obj.image.url}"
        return None

    def get_reactions(self, obj):
        """Get reaction counts grouped by type"""
        reaction_counts = {}
        for reaction in obj.reactions.all():
            if reaction.reaction_type not in reaction_counts:
                reaction_counts[reaction.reaction_type] = 0
            reaction_counts[reaction.reaction_type] += 1
        return reaction_counts

    def get_user_reaction(self, obj):
        """Get current user's reaction if any"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            user_reactions = obj.reactions.filter(user=request.user).values_list('reaction_type', flat=True)
            return list(user_reactions)
        return []

    def get_comments_count(self, obj):
        return obj.comments.count()


class TukacodleScoreSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)

    class Meta:
        model = TukacodleScore
        fields = ['id', 'user', 'score', 'date', 'created_at']
        read_only_fields = ['id', 'date', 'created_at']