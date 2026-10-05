@echo off
rem Abre el panel de administracion de REBOUND.
rem La primera vez (o si cambian las dependencias) prepara el entorno de Python.
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo No se encontro Python. Instala Python 3.10 o superior desde https://www.python.org/downloads/
  echo y marca "Add python.exe to PATH" durante la instalacion.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Preparando el panel por primera vez...
  python -m venv .venv || goto :error
)

fc /b requirements.txt ".venv\requirements.installed" >nul 2>nul
if errorlevel 1 (
  echo Instalando dependencias...
  ".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -q -r requirements.txt || goto :error
  copy /y requirements.txt ".venv\requirements.installed" >nul
)

if not exist ".env" (
  copy /y .env.example .env >nul
  echo.
  echo Se creo admin\.env: completa SUPABASE_SECRET_KEY, guarda y volve a abrir el panel.
  notepad .env
  exit /b 0
)

start "" ".venv\Scripts\pythonw.exe" app.py
exit /b 0

:error
echo.
echo No se pudo preparar el panel. Revisa tu conexion a internet y volve a intentar.
pause
exit /b 1
