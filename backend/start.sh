#!/bin/bash
set -e

echo "Running database migrations..."
python manage.py migrate --noinput

echo "Starting server..."
exec gunicorn --bind 0.0.0.0:$PORT --workers 3 tukaco_pic.wsgi:application