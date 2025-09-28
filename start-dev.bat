@echo off
echo Starting TukacoPic Development Environment...

echo.
echo Setting up backend...
cd backend
copy .env.local .env 2>nul
call python -m venv venv
call venv\Scripts\activate.bat
call pip install -r requirements-windows.txt
call python manage.py makemigrations
call python manage.py migrate
echo Backend setup complete!

echo.
echo Starting backend server...
start cmd /k "cd /d %CD% && venv\Scripts\activate.bat && python manage.py runserver"

echo.
echo Setting up frontend...
cd ..\frontend
call npm install
copy .env.example .env 2>nul
echo Frontend setup complete!

echo.
echo Starting frontend server...
start cmd /k "cd /d %CD% && npm run dev"

echo.
echo Both services are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit...
pause