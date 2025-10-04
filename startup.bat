@echo off
echo Starting TukacoPic services...

echo.
echo [1/3] Starting Backend (Django)...
start "TukacoPic Backend" cmd /k "backend\venv\Scripts\python.exe backend\manage.py runserver 127.0.0.1:8000"

echo [2/3] Starting Frontend (Vite)...
start "TukacoPic Frontend" cmd /k "cd frontend && npm run dev"

echo [3/3] Starting Cloudflared Tunnel...
start "TukacoPic Cloudflared" cmd /k "cloudflared.exe tunnel run --token eyJhIjoiZjRiYWUwYjQzMTZhMGIzYTNhNTIzNzUyYzNmZWJlZWIiLCJ0IjoiMDQxOTNhOTItYzRiOS00ZmYxLTkxZDEtY2M5OWRmMDI0ODVkIiwicyI6Ik5EWTJOV1F4WlRJdE5ESmxaQzAwTkRZekxXSmlNbVl0T0RVNVlqTXdabUl6WWpWbSJ9"

echo.
echo All services started in separate windows!
echo Frontend: http://localhost:3000
echo Backend: http://127.0.0.1:8000
echo Public Frontend: https://tukacopic.aether-lab.xyz
echo Public Backend: https://apitukacopic.aether-lab.xyz
echo.
pause
