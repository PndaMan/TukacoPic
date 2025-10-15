from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from api.views import check_and_unlock_achievements


class Command(BaseCommand):
    help = 'Recalculate and unlock achievements for all users'

    def handle(self, *args, **options):
        users = User.objects.all()
        total_users = users.count()

        self.stdout.write(f"Recalculating achievements for {total_users} users...\n")

        total_unlocked = 0
        for idx, user in enumerate(users, 1):
            unlocked = check_and_unlock_achievements(user)

            if unlocked:
                total_unlocked += len(unlocked)
                self.stdout.write(
                    self.style.SUCCESS(
                        f"[{idx}/{total_users}] {user.username}: Unlocked {len(unlocked)} achievement(s) - {', '.join(unlocked)}"
                    )
                )
            else:
                self.stdout.write(
                    f"[{idx}/{total_users}] {user.username}: No new achievements"
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone! Total achievements unlocked: {total_unlocked}"
            )
        )
