from django.core.management.base import BaseCommand
from django.db import models
from api.models import Achievement


class Command(BaseCommand):
    help = 'Update achievement names, descriptions, and icons to be TukacoPic/Ivan themed'

    def handle(self, *args, **options):
        achievements_data = [
            # Easy achievements
            {
                'old_name': 'First Steps',
                'name': 'Ivan Initiate',
                'description': 'Cast your first vote',
                'icon': '🎯',
                'difficulty': 'easy',
                'points': 5
            },
            {
                'old_name': 'Newbie Uploader',
                'name': 'Photo Pioneer',
                'description': 'Upload your first photo',
                'icon': '📸',
                'difficulty': 'easy',
                'points': 5
            },
            {
                'old_name': 'Social Starter',
                'name': 'Friendly Face',
                'description': 'Add your first friend',
                'icon': '👋',
                'difficulty': 'easy',
                'points': 5
            },
            {
                'old_name': 'Reactor',
                'name': 'Heart Giver',
                'description': 'React to your first photo',
                'icon': '❤️',
                'difficulty': 'easy',
                'points': 5
            },
            {
                'old_name': 'First Thoughts',
                'name': 'Commentator',
                'description': 'Leave your first comment',
                'icon': '💬',
                'difficulty': 'easy',
                'points': 5
            },

            # Medium achievements
            {
                'old_name': 'Century Voter',
                'name': 'Ivan Enthusiast',
                'description': 'Cast 50 votes',
                'icon': '🗳️',
                'difficulty': 'medium',
                'points': 15
            },
            {
                'old_name': 'Social Butterfly',
                'name': 'Popular Voter',
                'description': 'Make 5 friends',
                'icon': '🦋',
                'difficulty': 'medium',
                'points': 15
            },
            {
                'old_name': 'Popular',
                'name': 'Rising Star',
                'description': 'Receive 25 reactions on your photos',
                'icon': '⭐',
                'difficulty': 'medium',
                'points': 15
            },
            {
                'old_name': 'Consistent',
                'name': 'Daily Devotee',
                'description': 'Vote for 3 days in a row',
                'icon': '🔥',
                'difficulty': 'medium',
                'points': 15
            },
            {
                'old_name': 'Photographer',
                'name': 'Photo Collector',
                'description': 'Upload 10 photos',
                'icon': '📷',
                'difficulty': 'medium',
                'points': 15
            },
            {
                'old_name': 'Generous',
                'name': 'Love Spreader',
                'description': 'React to 50 photos',
                'icon': '💝',
                'difficulty': 'medium',
                'points': 15
            },
            {
                'old_name': 'Chatterbox',
                'name': 'Talkative Critic',
                'description': 'Leave 10 comments',
                'icon': '💭',
                'difficulty': 'medium',
                'points': 15
            },

            # Hard achievements
            {
                'old_name': 'Thousand Votes',
                'name': 'Ivan Expert',
                'description': 'Cast 500 votes',
                'icon': '🏅',
                'difficulty': 'hard',
                'points': 30
            },
            {
                'old_name': 'Dedicated',
                'name': 'Streak Master',
                'description': 'Vote for 7 days in a row',
                'icon': '⚡',
                'difficulty': 'hard',
                'points': 30
            },
            {
                'old_name': 'Viral',
                'name': 'Crowd Favorite',
                'description': 'Get 50 reactions on a single photo',
                'icon': '🚀',
                'difficulty': 'hard',
                'points': 30
            },
            {
                'old_name': 'Elo Master',
                'name': 'ELO Champion',
                'description': 'Have a photo reach 1400 ELO',
                'icon': '👑',
                'difficulty': 'hard',
                'points': 30
            },
            {
                'old_name': 'Quality Creator',
                'name': 'Quality Ivan Pics',
                'description': 'Upload 15 photos with 1200+ average ELO',
                'icon': '✨',
                'difficulty': 'hard',
                'points': 30
            },
            {
                'old_name': 'Friend to All',
                'name': 'Social Legend',
                'description': 'Make 20 friends',
                'icon': '🤝',
                'difficulty': 'hard',
                'points': 30
            },
            {
                'old_name': 'Photo Critic',
                'name': 'Comment Connoisseur',
                'description': 'Leave 50 comments',
                'icon': '📝',
                'difficulty': 'hard',
                'points': 30
            },

            # Legendary achievements
            {
                'old_name': 'Obsessed',
                'name': 'TukacoPic Addict',
                'description': 'Vote for 30 days in a row',
                'icon': '🔥',
                'difficulty': 'legendary',
                'points': 100
            },
            {
                'old_name': 'Vote Master',
                'name': 'Ivan Connoisseur',
                'description': 'Cast 2000 votes',
                'icon': '🏆',
                'difficulty': 'legendary',
                'points': 100
            },
            {
                'old_name': 'King of Content',
                'name': 'Photo Library Master',
                'description': 'Upload 100 photos',
                'icon': '📚',
                'difficulty': 'legendary',
                'points': 100
            },
            {
                'old_name': 'Elite Collector',
                'name': 'King of the Kov',
                'description': 'Earn the highest badge (King of the Kov)',
                'icon': '👑',
                'difficulty': 'legendary',
                'points': 100
            },
        ]

        updated_count = 0
        created_count = 0

        for data in achievements_data:
            old_name = data.pop('old_name')

            # Try to find by old name OR new name
            achievement = Achievement.objects.filter(
                models.Q(name=old_name) | models.Q(name=data['name'])
            ).first()

            if achievement:
                # Update existing
                for key, value in data.items():
                    setattr(achievement, key, value)
                achievement.save()
                self.stdout.write(
                    self.style.SUCCESS(f"Updated: {old_name} -> {data['name']}")
                )
                updated_count += 1
            else:
                # Create new if it doesn't exist
                Achievement.objects.create(**data)
                self.stdout.write(
                    self.style.SUCCESS(f"Created: {data['name']}")
                )
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone! Updated: {updated_count}, Created: {created_count}"
            )
        )
