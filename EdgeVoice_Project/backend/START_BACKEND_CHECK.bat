@echo off
echo ========================================
echo EdgeVoice Backend Health Check
echo ========================================
echo.

echo [1/5] Checking Python installation...
python --version
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python 3.9 or later from https://python.org
    pause
    exit /b 1
)
echo OK
echo.

echo [2/5] Checking required packages...
python -c "import flask, flask_cors, librosa, numpy, soundfile; print('✓ All packages installed')" 2>nul
if errorlevel 1 (
    echo ERROR: Missing packages!
    echo Installing requirements...
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Failed to install packages
        pause
        exit /b 1
    )
)
echo OK
echo.

echo [3/5] Testing MFCC extraction...
python test_mfcc.py
if errorlevel 1 (
    echo ERROR: MFCC test failed!
    echo See MFCC_TROUBLESHOOTING.md for help
    pause
    exit /b 1
)
echo OK
echo.

echo [4/5] Checking if port 5000 is available...
netstat -ano | findstr :5000 >nul
if not errorlevel 1 (
    echo WARNING: Port 5000 is already in use!
    echo You may need to stop the existing process or use a different port.
    echo.
)

echo [5/5] Starting backend server...
echo.
echo ========================================
echo Backend is starting...
echo You can now use the frontend!
echo ========================================
echo.
echo To stop the server, press Ctrl+C
echo.

python app.py
