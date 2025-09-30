#!/usr/bin/env python3
"""
Script to update Photo model records to use GCS URLs instead of local file paths
"""
import os
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tukaco_pic.settings')
django.setup()

from api.models import Photo

def update_image_urls():
    """Update all photo records to use GCS URLs"""
    base_url = "https://storage.googleapis.com/tukacopic-images/photos/"

    photos = Photo.objects.all()
    updated_count = 0

    for photo in photos:
        if photo.image and photo.image.name:
            # Extract just the filename from the current path
            filename = os.path.basename(photo.image.name)

            # Update to GCS URL
            new_url = base_url + filename
            photo.image = new_url
            photo.save()

            updated_count += 1
            print(f"Updated {photo.id}: {filename} -> {new_url}")

    print(f"\nUpdated {updated_count} photo records with GCS URLs")

if __name__ == "__main__":
    update_image_urls()