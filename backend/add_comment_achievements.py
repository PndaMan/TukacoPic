import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tukaco_pic.settings')
django.setup()

from api.models import Achievement

# Create comment-related achievements
achievements_to_create = [
    {"name": "First Thoughts", "description": "Leave your first comment on a photo", "icon": "💭", "difficulty": "easy", "points": 5},
    {"name": "Chatterbox", "description": "Leave 25 comments on photos", "icon": "💬", "difficulty": "medium", "points": 15},
    {"name": "Photo Critic", "description": "Leave 100 comments on photos", "icon": "📝", "difficulty": "hard", "points": 30},
]

for ach_data in achievements_to_create:
    achievement, created = Achievement.objects.get_or_create(
        name=ach_data["name"],
        defaults=ach_data
    )
    if created:
        print(f"Created achievement: {achievement.name}")
    else:
        print(f"Achievement already exists: {achievement.name}")

print("\nAll comment achievements created!")
