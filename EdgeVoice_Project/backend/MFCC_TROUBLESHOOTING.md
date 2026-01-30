# MFCC Extraction Troubleshooting Guide

## Common Issues and Solutions

### Issue: "MFCC extraction failed" error message

This guide helps you diagnose and fix MFCC extraction failures in the EdgeVoice backend.

## Prerequisites Check

### 1. Verify Backend is Running

The backend must be running on port 5000. Check if you see:
```
✓ librosa X.XX.X
✓ numpy X.XX.X
✓ soundfile X.XX.X
* Running on http://127.0.0.1:5000
```

If not, start the backend:
```bash
cd EdgeVoice_Project/backend
python app.py
```

### 2. Verify Required Dependencies

All these packages must be installed:

```bash
pip install -r requirements.txt
```

Required packages:
- Flask==2.3.3
- Flask-CORS==4.0.0
- librosa==0.10.0
- numpy==1.24.3
- scipy==1.11.2
- soundfile==0.12.1
- audioread==3.0.0
- gunicorn==21.2.0

### 3. Test MFCC Extraction

Run the test script to verify MFCC extraction works:

```bash
cd EdgeVoice_Project/backend
python test_mfcc.py
```

Expected output:
```
✓ MFCC extraction successful!
MFCC shape: (13, 32)
✓ All tests passed!
```

## Common Error Messages

### "No audio file provided"
**Cause:** Frontend didn't send audio data
**Solution:** 
- Make sure you recorded or uploaded audio before clicking "Extract MFCC"
- Check browser console (F12) for JavaScript errors

### "Could not decode audio"
**Cause:** Audio format not supported or missing FFmpeg
**Solution:**
- For WAV files: Should work by default
- For MP3/OGG/M4A: Install FFmpeg
  ```bash
  # Windows: Download from https://ffmpeg.org/download.html
  # Or use chocolatey:
  choco install ffmpeg
  
  # Linux:
  sudo apt-get install ffmpeg
  
  # Mac:
  brew install ffmpeg
  ```

### "Failed to load audio"
**Cause:** Librosa can't read the audio file
**Solution:**
- Verify soundfile is installed: `pip install soundfile`
- Try with a simple WAV file first
- Check file permissions

### "Connection refused" or "Network error"
**Cause:** Backend not running or wrong port
**Solution:**
- Start backend: `python app.py` in backend folder
- Verify it's on port 5000
- Check firewall settings
- Try both http://127.0.0.1:5000 and http://localhost:5000

### "CORS error"
**Cause:** Browser blocking cross-origin requests
**Solution:**
- Backend already has CORS enabled (Flask-CORS)
- If using file:// protocol, some browsers restrict this
- Use a local web server instead:
  ```bash
  # In frontend folder:
  python -m http.server 8000
  # Then open: http://localhost:8000
  ```

## Debugging Steps

1. **Open Browser Console (F12)**
   - Check for JavaScript errors
   - Look for network request failures
   - See detailed error messages

2. **Check Backend Terminal**
   - Look for emoji indicators: 📤 📁 🔊 🎵 ✅ ❌
   - Read error messages if any
   - Verify requests are being received

3. **Test with Simple Audio**
   - Record a short 1-2 second audio clip
   - Try WAV format first (best compatibility)
   - Check file size isn't too large (< 10MB recommended)

4. **Verify Imports**
   ```bash
   python -c "import librosa, numpy, soundfile, flask_cors; print('All imports OK')"
   ```

5. **Check Python Version**
   - Recommended: Python 3.9 - 3.11
   - Check: `python --version`

## Version Compatibility

Known working combinations:
- Python 3.10 + librosa 0.10.0 + numpy 1.24.3 + soundfile 0.12.1 ✓
- Python 3.11 + librosa 0.11.0 + numpy 2.3.5 + soundfile 0.13.1 ✓

## Performance Issues

If MFCC extraction is slow:
1. Reduce audio duration (< 10 seconds)
2. Lower sample rate (16kHz is standard)
3. Check CPU usage during extraction
4. Consider using hardware acceleration (future feature)

## Still Having Issues?

1. Check the backend logs for detailed error messages
2. Verify all file paths are correct
3. Try restarting both frontend and backend
4. Check if temp files are being created in backend folder
5. Ensure you have write permissions in backend folder

## Success Indicators

When everything works, you should see:
- ✅ Audio loaded: XXXX samples at 16000 Hz
- ✅ MFCC extracted: shape (13, XX)
- MFCC heatmap displayed
- Statistics panel populated
- Wake word detection results shown

## Contact

If issues persist after following this guide, provide:
- Python version
- Package versions (pip list)
- Full error message from browser console
- Backend terminal output
- Audio file format and size
