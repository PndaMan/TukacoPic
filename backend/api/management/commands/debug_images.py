from django.core.management.base import BaseCommand
from api.models import Photo

class Command(BaseCommand):
    help = 'Debug image URLs in database'

    def handle(self, *args, **options):
        photos = Photo.objects.all()[:5]

        for photo in photos:
            self.stdout.write(f'Photo {photo.id}:')
            self.stdout.write(f'  Raw image field: {photo.image}')
            self.stdout.write(f'  Image name: {photo.image.name}')
            self.stdout.write(f'  Image URL: {photo.image.url}')
            self.stdout.write('---')