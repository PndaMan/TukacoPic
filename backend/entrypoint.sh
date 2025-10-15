#!/bin/sh

# This script is executed every time the backend container starts.

echo "Waiting for the database to be ready..."
# A simple check could be added here for production databases like Postgres.
# For SQLite, we can proceed directly.

echo "Applying database migrations..."
# This command creates the database tables if they don't exist.
python manage.py migrate --noinput

# The 'exec "$@"' command runs the command passed to the script.
# In our Dockerfile, this is CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
exec "$@"