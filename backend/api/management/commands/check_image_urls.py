from django.core.management.base import BaseCommand
from api.models import Photo
import os

class Command(BaseCommand):
    help = 'Check current image URL formats in database'

    def handle(self, *args, **options):
        photos = Photo.objects.all()[:5]  # Check first 5 photos

        self.stdout.write(f'Found {Photo.objects.count()} total photos')
        self.stdout.write('Sample image URLs:')

        for photo in photos:
            self.stdout.write(f'Photo {photo.id}: {photo.image}')

        # Check if any photos have GCS URLs
        gcs_photos = Photo.objects.filter(image__contains='storage.googleapis.com')
        old_photos = Photo.objects.filter(image__contains='/media/')

        self.stdout.write(f'\nPhotos with GCS URLs: {gcs_photos.count()}')
        self.stdout.write(f'Photos with old media URLs: {old_photos.count()}')