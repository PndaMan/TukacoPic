from django.core.management.base import BaseCommand
from api.models import Photo
import os

class Command(BaseCommand):
    help = 'Fix image URLs to point to GCS bucket'

    def handle(self, *args, **options):
        self.stdout.write('Starting image URL fix...')

        base_url = "https://storage.googleapis.com/tukacopic-images/photos/"
        photos = Photo.objects.all()
        updated_count = 0

        for photo in photos:
            if photo.image and not photo.image.startswith('https://storage.googleapis.com'):
                # Extract filename from current path
                if '/' in str(photo.image):
                    filename = os.path.basename(str(photo.image))
                else:
                    filename = str(photo.image)

                # Update to GCS URL
                new_url = base_url + filename
                photo.image = new_url
                photo.save()
                updated_count += 1

                if updated_count <= 5:  # Show first 5 updates
                    self.stdout.write(f'Updated photo {photo.id}: {filename} -> {new_url}')

        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated {updated_count} photo URLs to GCS')
        )