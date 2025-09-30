from django.core.management.base import BaseCommand
from api.models import Photo, Vote

class Command(BaseCommand):
    help = 'Simple reset of ELO scores and votes'

    def handle(self, *args, **options):
        self.stdout.write('Starting simple reset...')

        # Delete all votes first
        vote_count = Vote.objects.count()
        Vote.objects.all().delete()
        self.stdout.write(f'Deleted {vote_count} votes')

        # Reset ELO scores using bulk update
        Photo.objects.all().update(elo_score=1200.0)
        photo_count = Photo.objects.count()
        self.stdout.write(f'Reset {photo_count} photos to ELO 1200')

        # Verify the reset worked
        sample_photos = Photo.objects.all()[:3]
        for photo in sample_photos:
            self.stdout.write(f'Photo {photo.id}: ELO = {photo.elo_score}')

        self.stdout.write(self.style.SUCCESS('Reset completed!'))