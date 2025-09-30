#!/usr/bin/env python
"""
Script to migrate existing photos from file storage to database binary storage.
Run this after deploying the new model changes.
"""

import os
import django
import requests
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tukaco_pic.settings')
django.setup()

from api.models import Photo

def migrate_photos():
    """Migrate photos from file URLs to database binary storage"""
    photos_migrated = 0
    photos_failed = 0

    for photo in Photo.objects.filter(image_data__isnull=True):
        try:
            if photo.image:
                print(f"Migrating photo {photo.id}: {photo.image.url}")

                # Try to fetch the image from the URL
                try:
                    if photo.image.url.startswith('http'):
                        response = requests.get(photo.image.url, timeout=30)
                        response.raise_for_status()
                        image_data = response.content
                    else:
                        # Local file
                        with open(photo.image.path, 'rb') as f:
                            image_data = f.read()

                    # Update the photo with binary data
                    photo.image_data = image_data
                    photo.image_name = os.path.basename(photo.image.name)

                    # Determine content type from file extension
                    ext = Path(photo.image.name).suffix.lower()
                    if ext in ['.jpg', '.jpeg']:
                        photo.image_type = 'image/jpeg'
                    elif ext == '.png':
                        photo.image_type = 'image/png'
                    elif ext == '.gif':
                        photo.image_type = 'image/gif'
                    elif ext == '.webp':
                        photo.image_type = 'image/webp'
                    else:
                        photo.image_type = 'image/jpeg'  # Default

                    photo.save()
                    photos_migrated += 1
                    print(f"  ✓ Migrated photo {photo.id}")

                except Exception as e:
                    print(f"  ✗ Failed to fetch image for photo {photo.id}: {e}")
                    photos_failed += 1
            else:
                print(f"Photo {photo.id} has no image file")
                photos_failed += 1

        except Exception as e:
            print(f"Error processing photo {photo.id}: {e}")
            photos_failed += 1

    print(f"\nMigration complete:")
    print(f"  Migrated: {photos_migrated}")
    print(f"  Failed: {photos_failed}")

if __name__ == '__main__':
    migrate_photos()