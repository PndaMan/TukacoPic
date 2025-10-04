from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Photo, Vote


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
            # Skip if duplicate filename exists
            if Photo.objects.filter(image__endswith=image.name).exists():
                skipped.append(image.name)
                continue

            photo = Photo.objects.create(uploader=user, image=image)
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