# Use official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Create non-root user
RUN addgroup --system django && adduser --system --group django

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       postgresql-client \
       build-essential \
       libpq-dev \
       sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project and entrypoint script
COPY . /app/

# Make the entrypoint script executable
RUN chmod +x /app/entrypoint.sh

# Create directories for static and media files
RUN mkdir -p /app/staticfiles /app/media

# Change ownership of the app directory to django user
RUN chown -R django:django /app

# Switch to non-root user
USER django

# Collect static files
RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Set the entrypoint to run migrations
ENTRYPOINT ["/app/entrypoint.sh"]

# Command to run the application with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "tukaco_pic.wsgi:application"]

