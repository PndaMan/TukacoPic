from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Photo
from collections import defaultdict


class Command(BaseCommand):
    help = 'Find potential duplicate photos by checking file hashes and manual inspection'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete-ids',
            nargs='+',
            type=int,
            help='Space-separated list of photo IDs to delete',
        )

    def handle(self, *args, **options):
        delete_ids = options.get('delete_ids')

        if delete_ids:
            # Delete specified photos
            self.stdout.write(f"\nDeleting photos: {delete_ids}")
            confirm = input("Are you sure? (yes/no): ")
            if confirm.lower() == 'yes':
                with transaction.atomic():
                    for photo_id in delete_ids:
                        try:
                            photo = Photo.objects.get(id=photo_id)
                            self.stdout.write(f"  Deleting photo {photo_id} by {photo.uploader.username}")
                            photo.delete()
                        except Photo.DoesNotExist:
                            self.stdout.write(self.style.ERROR(f"  Photo {photo_id} not found"))
                self.stdout.write(self.style.SUCCESS(f"Deleted {len(delete_ids)} photos"))
            else:
                self.stdout.write("Cancelled")
            return

        # List all photos with details
        all_photos = Photo.objects.all().order_by('uploader__username', 'created_at')

        self.stdout.write(f"\nTotal photos in database: {all_photos.count()}\n")

        # Group by uploader
        by_uploader = defaultdict(list)
        for photo in all_photos:
            by_uploader[photo.uploader.username].append(photo)

        self.stdout.write("=" * 100)
        for username, photos in sorted(by_uploader.items()):
            self.stdout.write(f"\n{username} ({len(photos)} photos):")
            for photo in photos:
                hash_preview = photo.file_hash[:16] if photo.file_hash else "NO HASH"
                self.stdout.write(
                    f"  ID: {photo.id:4d} | "
                    f"Hash: {hash_preview}... | "
                    f"ELO: {photo.elo_score:7.1f} | "
                    f"Created: {photo.created_at.strftime('%Y-%m-%d %H:%M')} | "
                    f"File: {photo.image.name}"
                )

        # Check for hash collisions
        self.stdout.write("\n" + "=" * 100)
        self.stdout.write("\nChecking for identical hashes...")
        hash_groups = defaultdict(list)
        for photo in all_photos:
            if photo.file_hash:
                hash_groups[photo.file_hash].append(photo)

        duplicates = {k: v for k, v in hash_groups.items() if len(v) > 1}
        if duplicates:
            self.stdout.write(self.style.WARNING(f"Found {len(duplicates)} duplicate hash groups:"))
            for file_hash, photos in duplicates.items():
                self.stdout.write(f"\nHash {file_hash[:16]}...:")
                for photo in photos:
                    self.stdout.write(f"  ID {photo.id} - {photo.uploader.username}")
        else:
            self.stdout.write(self.style.SUCCESS("No identical file hashes found"))

        self.stdout.write("\n" + "=" * 100)
        self.stdout.write("\nTo delete specific photos, run:")
        self.stdout.write("  python manage.py find_visual_duplicates --delete-ids 123 456 789")
