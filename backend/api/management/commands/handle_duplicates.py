from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Photo
import hashlib
from collections import defaultdict


class Command(BaseCommand):
    help = 'Calculate hashes for existing photos and identify/remove duplicates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Actually delete duplicate photos (keeps the oldest one)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        delete = options['delete']
        dry_run = options['dry_run']

        # Step 1: Calculate hashes for photos that don't have one
        photos_without_hash = Photo.objects.filter(file_hash__isnull=True)
        self.stdout.write(f"Found {photos_without_hash.count()} photos without hash")

        duplicates_to_delete = []

        for photo in photos_without_hash:
            try:
                with photo.image.open('rb') as f:
                    file_content = f.read()
                    file_hash = hashlib.sha256(file_content).hexdigest()

                    # Check if this hash already exists
                    existing = Photo.objects.filter(file_hash=file_hash).first()
                    if existing:
                        self.stdout.write(
                            self.style.WARNING(
                                f"  Photo {photo.id} is a DUPLICATE of photo {existing.id}"
                            )
                        )
                        duplicates_to_delete.append((photo, existing))
                    else:
                        photo.file_hash = file_hash
                        photo.save(update_fields=['file_hash'])
                        self.stdout.write(f"  Calculated hash for photo {photo.id}")
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"  Error processing photo {photo.id}: {str(e)}")
                )

        # Step 2: Find duplicates
        self.stdout.write("\nSearching for duplicates...")
        hash_groups = defaultdict(list)

        for photo in Photo.objects.filter(file_hash__isnull=False).order_by('created_at'):
            hash_groups[photo.file_hash].append(photo)

        duplicates_found = {k: v for k, v in hash_groups.items() if len(v) > 1}

        # Step 3: Display hash-based duplicates
        total_to_delete = 0
        if duplicates_found:
            self.stdout.write(
                self.style.WARNING(f"\nFound {len(duplicates_found)} groups of duplicates:")
            )

            for file_hash, photos in duplicates_found.items():
                self.stdout.write(f"\nHash {file_hash[:16]}... ({len(photos)} copies):")
                for idx, photo in enumerate(photos):
                    status = "KEEP (oldest)" if idx == 0 else "DELETE"
                    self.stdout.write(
                        f"  [{status}] Photo {photo.id} - "
                        f"by {photo.uploader.username} - "
                        f"uploaded {photo.created_at} - "
                        f"ELO: {photo.elo_score:.0f}"
                    )
                    if idx > 0:
                        total_to_delete += 1
        else:
            self.stdout.write(self.style.SUCCESS("\nNo hash-based duplicates found!"))

        # Step 4: Display and handle duplicates without hashes
        if duplicates_to_delete:
            self.stdout.write(
                self.style.WARNING(f"\n\nFound {len(duplicates_to_delete)} photos that are duplicates (couldn't set hash):")
            )
            for dup_photo, original in duplicates_to_delete:
                self.stdout.write(
                    f"  [DELETE] Photo {dup_photo.id} - "
                    f"by {dup_photo.uploader.username} - "
                    f"duplicate of Photo {original.id} by {original.uploader.username}"
                )
            total_to_delete += len(duplicates_to_delete)

        # Step 5: Delete duplicates if requested
        if delete or dry_run:
            self.stdout.write(f"\nTotal photos to delete: {total_to_delete}")

            if dry_run:
                self.stdout.write(
                    self.style.WARNING("DRY RUN - No changes made")
                )
                return

            if total_to_delete == 0:
                self.stdout.write(self.style.SUCCESS("No duplicates to delete!"))
                return

            confirm = input("\nAre you sure you want to delete these duplicates? (yes/no): ")
            if confirm.lower() != 'yes':
                self.stdout.write("Operation cancelled")
                return

            deleted_count = 0
            with transaction.atomic():
                # Delete hash-based duplicates (keep oldest)
                for file_hash, photos in duplicates_found.items():
                    for photo in photos[1:]:
                        photo_id = photo.id
                        photo.delete()
                        deleted_count += 1
                        self.stdout.write(f"  Deleted photo {photo_id}")

                # Delete photos that couldn't get hash due to duplicates
                for dup_photo, original in duplicates_to_delete:
                    photo_id = dup_photo.id
                    dup_photo.delete()
                    deleted_count += 1
                    self.stdout.write(f"  Deleted duplicate photo {photo_id}")

            self.stdout.write(
                self.style.SUCCESS(f"\nSuccessfully deleted {deleted_count} duplicate photos")
            )
        else:
            if total_to_delete > 0:
                self.stdout.write(
                    f"\nTo delete these duplicates, run: python manage.py handle_duplicates --delete"
                )
                self.stdout.write(
                    f"To preview without deleting, run: python manage.py handle_duplicates --dry-run"
                )
