from django.db import models, transaction
from django.contrib.auth.models import User
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