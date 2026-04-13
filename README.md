<p align="center">
  <img src="docs/logo.png" alt="TukacoPic" width="180" />
</p>

<h1 align="center">TukacoPic</h1>
<p align="center"><em>One Nose to Rule Them All</em></p>

<p align="center">
  A competitive photo-voting platform where users upload photos, go head-to-head, and climb the leaderboard — powered by an Elo rating system.
</p>

---

## Features

- **Head-to-head voting** — swipe through random matchups and pick a winner
- **Elo ranking** — every vote updates both photos' ratings (K-factor 32, starting at 1200)
- **Public leaderboard** — see the highest-rated photos across the community
- **User profiles** — track your uploads, win rate, and ranking history
- **Cross-platform** — web app + native iOS/Android via Expo
- **Secure auth** — JWT access tokens in memory, refresh tokens in httpOnly cookies

## Architecture

```
backend/     Django 4.2 + DRF REST API, PostgreSQL, GCS media storage
frontend/    React 18 SPA — Vite, Tailwind CSS, Zustand
mobile/      React Native (Expo 54) — Expo Router, Reanimated
```

## Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| PostgreSQL | 15+ (or SQLite for local dev) |
| Docker | Optional — for containerised setup |

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edit with your credentials
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

### Docker Compose (full stack)

```bash
docker compose up --build
```

This starts PostgreSQL (5432), the Django API (8000), and the React frontend (3000).

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/api/users/register/` | | Create account |
| `POST` | `/api/token/` | | Login — returns JWT |
| `POST` | `/api/token/refresh/` | | Refresh access token |
| `GET` | `/api/photos/pair/` | Yes | Fetch random matchup |
| `POST` | `/api/vote/` | Yes | Submit vote |
| `GET` | `/api/leaderboard/` | | Public rankings |
| `POST` | `/api/photos/upload/` | Yes | Upload photo |
| `GET` | `/api/profile/` | Yes | User profile & stats |
| `GET` | `/api/photos/my/` | Yes | User's uploads |

## Elo Rating System

Photos start at **1200**. After each vote both ratings are updated:

```
E = 1 / (1 + 10^((R_opponent - R_self) / 400))
R' = R + K * (S - E)
```

Where **K = 32**, **S = 1** (win) or **0** (loss), and **E** is the expected outcome.

## Deployment

Both `backend/` and `frontend/` include production-ready `Dockerfile`s. The root `docker-compose.yml` orchestrates all services. For GCP Cloud Run deployments, see the `Procfile` in each service directory.

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create a feature branch** — `git checkout -b feat/my-feature`
3. **Commit your changes** — use clear, descriptive commit messages
4. **Push** to your fork — `git push origin feat/my-feature`
5. **Open a Pull Request** against `master`

### Guidelines

- Keep PRs focused — one feature or fix per PR
- Follow the existing code style
- Add or update tests where applicable
- Update documentation if your change affects the public API or setup steps

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

Built with [Django](https://www.djangoproject.com/), [React](https://react.dev/), [Expo](https://expo.dev/), and [Tailwind CSS](https://tailwindcss.com/).
