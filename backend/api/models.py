from django.db import models, transaction
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from datetime import date, timedelta
import math


class Photo(models.Model):
    uploader = models.ForeignKey(User, on_delete=models.CASCADE, related_name='uploaded_photos')
    image = models.ImageField(upload_to='photos/')
    elo_score = models.FloatField(default=1200.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-elo_score', '-created_at']

    def __str__(self):
        return f"Photo {self.id} by {self.uploader.username} (Elo: {self.elo_score:.0f})"


class Vote(models.Model):
    voter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='votes')
    winner = models.ForeignKey(Photo, on_delete=models.CASCADE, related_name='wins')
    loser = models.ForeignKey(Photo, on_delete=models.CASCADE, related_name='losses')
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['voter', 'winner', 'loser']
        ordering = ['-voted_at']

    def __str__(self):
        return f"{self.voter.username}: {self.winner.id} beats {self.loser.id}"

    def save(self, *args, **kwargs):
        """Override save to update Elo scores atomically"""
        with transaction.atomic():
            # Calculate new Elo scores
            winner_new_score, loser_new_score = self.calculate_elo_scores()

            # Update the photos with new scores
            Photo.objects.filter(id=self.winner.id).update(elo_score=winner_new_score)
            Photo.objects.filter(id=self.loser.id).update(elo_score=loser_new_score)

            # Save the vote record
            super().save(*args, **kwargs)

    def calculate_elo_scores(self, k_factor=32):
        """
        Calculate new Elo scores using the standard formula:
        E_A = 1 / (1 + 10^((R_B - R_A) / 400))
        R_A' = R_A + K * (S_A - E_A)

        Where:
        - E_A is the expected score for player A
        - R_A, R_B are current ratings
        - K is the K-factor (32)
        - S_A is the actual score (1 for win, 0 for loss)
        """
        winner_rating = float(self.winner.elo_score)
        loser_rating = float(self.loser.elo_score)

        # Calculate expected scores
        expected_winner = 1 / (1 + math.pow(10, (loser_rating - winner_rating) / 400))
        expected_loser = 1 / (1 + math.pow(10, (winner_rating - loser_rating) / 400))

        # Calculate new ratings
        # Winner gets score of 1, loser gets score of 0
        winner_new = winner_rating + k_factor * (1 - expected_winner)
        loser_new = loser_rating + k_factor * (0 - expected_loser)

        return winner_new, loser_new


class UserProfile(models.Model):
    """Extended user profile with additional fields"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    banner_image = models.ImageField(upload_to='banners/', null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)

    # Streak tracking
    current_voting_streak = models.IntegerField(default=0)
    longest_voting_streak = models.IntegerField(default=0)
    last_vote_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

    def get_badge(self):
        """Calculate badge based on number of photos uploaded"""
        photo_count = self.user.uploaded_photos.count()

        if photo_count >= 150:
            return "King of the Kov"
        elif photo_count >= 100:
            return "Tucakovic Tracker"
        elif photo_count >= 50:
            return "The Tukarazzi"
        elif photo_count >= 20:
            return "Tukarazzi Intern"
        elif photo_count >= 10:
            return "Tuka-Spotter"
        elif photo_count >= 5:
            return "TukacoPic Noob"
        else:
            return None

    def get_badge_progress(self):
        """Get progress to next badge"""
        photo_count = self.user.uploaded_photos.count()

        if photo_count >= 150:
            return {"current": "King of the Kov", "next": None, "progress": 100, "photos_needed": 0}
        elif photo_count >= 100:
            return {"current": "Tucakovic Tracker", "next": "King of the Kov", "progress": (photo_count - 100) / 50 * 100, "photos_needed": 150 - photo_count}
        elif photo_count >= 50:
            return {"current": "The Tukarazzi", "next": "Tucakovic Tracker", "progress": (photo_count - 50) / 50 * 100, "photos_needed": 100 - photo_count}
        elif photo_count >= 20:
            return {"current": "Tukarazzi Intern", "next": "The Tukarazzi", "progress": (photo_count - 20) / 30 * 100, "photos_needed": 50 - photo_count}
        elif photo_count >= 10:
            return {"current": "Tuka-Spotter", "next": "Tukarazzi Intern", "progress": (photo_count - 10) / 10 * 100, "photos_needed": 20 - photo_count}
        elif photo_count >= 5:
            return {"current": "TukacoPic Noob", "next": "Tuka-Spotter", "progress": (photo_count - 5) / 5 * 100, "photos_needed": 10 - photo_count}
        else:
            return {"current": None, "next": "TukacoPic Noob", "progress": photo_count / 5 * 100, "photos_needed": 5 - photo_count}

    def update_voting_streak(self):
        """Update voting streak when user casts a vote"""
        today = date.today()

        if self.last_vote_date is None:
            # First ever vote
            self.current_voting_streak = 1
            self.longest_voting_streak = 1
        elif self.last_vote_date == today:
            # Already voted today, no change
            return
        elif self.last_vote_date == today - timedelta(days=1):
            # Voted yesterday, continue streak
            self.current_voting_streak += 1
            if self.current_voting_streak > self.longest_voting_streak:
                self.longest_voting_streak = self.current_voting_streak
        else:
            # Streak broken, start over
            self.current_voting_streak = 1

        self.last_vote_date = today
        self.save()


class Friendship(models.Model):
    """Friend relationship between users"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]

    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_friend_requests')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_friend_requests')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['from_user', 'to_user']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.from_user.username} → {self.to_user.username} ({self.status})"

    @staticmethod
    def are_friends(user1, user2):
        """Check if two users are friends"""
        return Friendship.objects.filter(
            models.Q(from_user=user1, to_user=user2, status='accepted') |
            models.Q(from_user=user2, to_user=user1, status='accepted')
        ).exists()

    @staticmethod
    def get_friends(user):
        """Get all friends of a user"""
        friends_as_from = Friendship.objects.filter(
            from_user=user, status='accepted'
        ).values_list('to_user', flat=True)

        friends_as_to = Friendship.objects.filter(
            to_user=user, status='accepted'
        ).values_list('from_user', flat=True)

        friend_ids = list(friends_as_from) + list(friends_as_to)
        return User.objects.filter(id__in=friend_ids)


class Reaction(models.Model):
    """Reactions to photos (heart, fire, etc.)"""
    REACTION_CHOICES = [
        ('heart', '❤️'),
        ('fire', '🔥'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reactions')
    photo = models.ForeignKey(Photo, on_delete=models.CASCADE, related_name='reactions')
    reaction_type = models.CharField(max_length=10, choices=REACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'photo', 'reaction_type']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} {self.get_reaction_type_display()} on Photo {self.photo.id}"


class Achievement(models.Model):
    """Predefined achievements users can unlock"""
    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
        ('legendary', 'Legendary'),
    ]

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(max_length=500)
    icon = models.CharField(max_length=10)  # Emoji icon
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)
    points = models.IntegerField(default=10)

    class Meta:
        ordering = ['difficulty', 'name']

    def __str__(self):
        return f"{self.icon} {self.name}"


class UserAchievement(models.Model):
    """Track which achievements a user has unlocked"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='achievements')
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE)
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'achievement']
        ordering = ['-unlocked_at']

    def __str__(self):
        return f"{self.user.username} - {self.achievement.name}"


class Conversation(models.Model):
    """Direct message conversation between two users"""
    participant1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_participant1')
    participant2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations_as_participant2')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        # Ensure unique conversation between two users (regardless of order)
        constraints = [
            models.UniqueConstraint(
                fields=['participant1', 'participant2'],
                name='unique_conversation'
            )
        ]

    def __str__(self):
        return f"Conversation between {self.participant1.username} and {self.participant2.username}"

    def get_other_user(self, user):
        """Get the other participant in the conversation"""
        return self.participant2 if self.participant1 == user else self.participant1

    @staticmethod
    def get_or_create_conversation(user1, user2):
        """Get or create a conversation between two users"""
        # Ensure consistent ordering to avoid duplicates
        if user1.id > user2.id:
            user1, user2 = user2, user1

        conversation, created = Conversation.objects.get_or_create(
            participant1=user1,
            participant2=user2
        )
        return conversation


class Message(models.Model):
    """Direct message in a conversation"""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField(max_length=1000)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message from {self.sender.username} at {self.created_at}"


class Comment(models.Model):
    """Comment on a photo"""
    photo = models.ForeignKey(Photo, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Comment by {self.user.username} on Photo {self.photo.id}"


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create a UserProfile when a User is created"""
    if created:
        UserProfile.objects.create(user=instance)