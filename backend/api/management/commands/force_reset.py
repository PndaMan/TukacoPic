from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Force reset using raw SQL'

    def handle(self, *args, **options):
        self.stdout.write('Starting force reset using raw SQL...')

        with connection.cursor() as cursor:
            # Delete all votes
            cursor.execute("DELETE FROM api_vote")
            vote_count = cursor.rowcount
            self.stdout.write(f'Deleted {vote_count} votes')

            # Reset all ELO scores to 1200
            cursor.execute("UPDATE api_photo SET elo_score = 1200.0")
            photo_count = cursor.rowcount
            self.stdout.write(f'Updated {photo_count} photos')

            # Verify the update
            cursor.execute("SELECT COUNT(*) FROM api_photo WHERE elo_score = 1200.0")
            reset_count = cursor.fetchone()[0]
            self.stdout.write(f'Verified: {reset_count} photos now have ELO 1200')

            # Get sample of current scores
            cursor.execute("SELECT id, elo_score FROM api_photo LIMIT 3")
            samples = cursor.fetchall()
            for photo_id, elo in samples:
                self.stdout.write(f'Photo {photo_id}: ELO = {elo}')

        self.stdout.write(self.style.SUCCESS('Force reset completed!'))