from django.core.management.base import BaseCommand
from api.models import Photo, Vote
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = 'Reset all ELO scores, win/loss counts, and delete all votes'

    def handle(self, *args, **options):
        self.stdout.write('Resetting all game statistics...')

        # Delete all votes
        vote_count = Vote.objects.count()
        Vote.objects.all().delete()
        self.stdout.write(f'Deleted {vote_count} votes')

        # Reset all photo ELO scores and win/loss counts
        photos = Photo.objects.all()
        for photo in photos:
            photo.elo_score = 1200.0  # Default ELO rating
            photo.wins_count = 0
            photo.losses_count = 0
            photo.save()

        photo_count = photos.count()
        self.stdout.write(f'Reset {photo_count} photo statistics')

        # Reset user statistics if they have any
        # (Assuming you might add user stats later)

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully reset all game statistics!\n'
                f'- Deleted {vote_count} votes\n'
                f'- Reset {photo_count} photos to ELO 1200\n'
                f'- Reset all win/loss counts to 0'
            )
        )