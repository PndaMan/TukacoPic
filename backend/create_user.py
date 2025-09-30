import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tukaco_pic.settings')
django.setup()

from django.contrib.auth.models import User

User.objects.create_superuser('sinisa_tukacovic', 'sinisa@example.com', 'iaaP_Tthalotohh210!')
print("Superuser 'sinisa_tukacovic' created successfully!")