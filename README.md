# TukacoPic - Photo Voting Platform

A "hot or not" style photo voting platform built with Django and React. Users can upload photos and vote on pairs of photos, with rankings determined by an Elo rating system.

## Features

- **Photo Upload & Voting**: Users can upload photos and vote on pairs of photos
- **Elo Rating System**: Photos are ranked using the Elo algorithm (K-factor: 32)
- **Public Leaderboard**: View top-rated photos based on community votes
- **User Profiles**: Track personal stats and uploaded photos
- **Secure Authentication**: JWT tokens with secure httpOnly cookies
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Backend**: Django 4.2, Django REST Framework, PostgreSQL
- **Frontend**: React 18, Vite, Tailwind CSS, Zustand
- **Authentication**: JWT with secure cookies
- **Deployment**: Docker containers for frontend and backend

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL
- Docker (for containerized deployment)

## Quick Start

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment and install dependencies:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials and settings
```

4. Run database migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

5. Create a superuser (optional):
```bash
python manage.py createsuperuser
```

6. Start the development server:
```bash
python manage.py runserver
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env if needed (default API URL should work for local development)
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Docker Deployment

### Using Docker Compose (Recommended)

Create a `docker-compose.yml` file in the project root:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: tukaco_pic
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      - DB_HOST=db
      - DB_NAME=tukaco_pic
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - DEBUG=False
    volumes:
      - ./backend/media:/app/media
    ports:
      - "8000:8000"
    depends_on:
      - db

  frontend:
    build: ./frontend
    environment:
      - VITE_API_BASE_URL=http://localhost:8000/api
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

Then run:
```bash
docker-compose up --build
```

### Individual Docker Builds

**Backend:**
```bash
cd backend
docker build -t tukaco-pic-backend .
docker run -p 8000:8000 tukaco-pic-backend
```

**Frontend:**
```bash
cd frontend
docker build -t tukaco-pic-frontend .
docker run -p 3000:80 tukaco-pic-frontend
```

## API Endpoints

### Authentication
- `POST /api/users/register/` - User registration
- `POST /api/token/` - Login (returns access token + httpOnly refresh cookie)
- `POST /api/token/refresh/` - Refresh access token

### Photos & Voting
- `GET /api/photos/pair/` - Get two random photos for voting (authenticated)
- `POST /api/vote/` - Submit a vote (authenticated)
- `GET /api/leaderboard/` - Public leaderboard
- `POST /api/photos/upload/` - Upload a photo (authenticated)

### User Profile
- `GET /api/profile/` - Get user profile and stats (authenticated)
- `GET /api/photos/my/` - Get user's uploaded photos (authenticated)

## Security Features

- **Secure JWT Implementation**: Access tokens stored in memory, refresh tokens in httpOnly cookies
- **CORS Protection**: Configured for specific origins
- **Input Validation**: Comprehensive validation on all endpoints
- **SQL Injection Protection**: Using Django ORM
- **XSS Protection**: Secure headers and CSP

## Elo Rating System

Photos start with an Elo score of 1200. When users vote, scores are updated using:

```
E_A = 1 / (1 + 10^((R_B - R_A) / 400))
R_A' = R_A + K × (S_A - E_A)
```

Where:
- `E_A` is the expected score for photo A
- `R_A`, `R_B` are current ratings
- `K` is the K-factor (32)
- `S_A` is the actual score (1 for win, 0 for loss)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.