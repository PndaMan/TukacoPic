from django.core.management.base import BaseCommand
from api.models import Photo
import os

class Command(BaseCommand):
    help = 'Update image paths to just store filenames'

    def handle(self, *args, **options):
        self.stdout.write('Updating image paths to store just filenames...')

        photos = Photo.objects.all()
        updated_count = 0

        for photo in photos:
            if photo.image:
                current_path = str(photo.image)

                # Extract just the filename
                if '/' in current_path:
                    filename = os.path.basename(current_path)
                else:
                    filename = current_path

                # Update to just the filename - Django will handle the full URL
                photo.image = f'photos/{filename}'
                photo.save()
                updated_count += 1

                if updated_count <= 5:  # Show first 5 updates
                    self.stdout.write(f'Updated photo {photo.id}: {current_path} -> photos/{filename}')

        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated {updated_count} photo paths')
        )