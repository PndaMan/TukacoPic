from django.core.management.base import BaseCommand
from django.core.management import call_command
from api.models import Photo
import os

class Command(BaseCommand):
    help = 'Load data from JSON and update image URLs to GCS'

    def handle(self, *args, **options):
        self.stdout.write('Loading data from tukacopic_data.json...')

        # Load the data
        call_command('loaddata', 'tukacopic_data.json')
        self.stdout.write(self.style.SUCCESS('Data loaded successfully'))

        # Update image URLs
        self.stdout.write('Updating image URLs to GCS...')
        base_url = "https://storage.googleapis.com/tukacopic-images/photos/"

        photos = Photo.objects.all()
        updated_count = 0

        for photo in photos:
            if photo.image and photo.image.name:
                filename = os.path.basename(photo.image.name)
                new_url = base_url + filename
                photo.image = new_url
                photo.save()
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(f'Updated {updated_count} photo records with GCS URLs')
        )