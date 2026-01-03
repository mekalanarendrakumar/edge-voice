
from flask import Flask, request, jsonify, make_response
from command_detect import detect_command
import requests  # For sending to firmware (if networked)
from flask_cors import CORS
import os
import time
import json
import traceback

app = Flask(__name__)
# Enable wide-open CORS for local file:// usage (no credentials needed)
CORS(app, resources={r"/*": {"origins": "*"}})

# Add explicit CORS headers on every response (covers file:// origin "null")
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

# Log unhandled errors so we can see root cause of 500s
@app.errorhandler(Exception)
def handle_error(e):
    # Print to server log for debugging
    print('Unhandled exception:', e)
    return jsonify({'error': str(e)}), 500

import librosa
import numpy as np

# --- CORS Helper Function ---
def handle_cors_preflight():
    """Handle CORS preflight requests"""
    response = make_response()
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS, GET'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response, 200

# --- Real-time MFCC and Wake Word Detection ---
import io
from flask import send_file

@app.route('/upload', methods=['GET', 'POST', 'OPTIONS'])
def upload():
    # Respond to CORS preflight cleanly
    if request.method == 'OPTIONS':
        print("📋 OPTIONS preflight request received")
        return handle_cors_preflight()

    # A GET here is usually someone testing the route or a stray navigation; return a brief hint instead of a 405.
    if request.method == 'GET':
        return jsonify({'message': 'POST an audio file as form-data with field "audio".'})

    try:
        print("📤 Upload request received")
        print("Request content type:", request.content_type)
        print("Request files:", list(request.files.keys()))
        
        audio = request.files.get('audio')
        if not audio:
            print("❌ No audio file in request")
            return jsonify({'error': 'No audio file provided'}), 400
        
        print(f"✅ Audio file received: {audio.filename}")
        # Get original filename and extension
        original_filename = audio.filename
        file_ext = os.path.splitext(original_filename)[1] if original_filename else '.wav'
        temp_filename = f'temp{file_ext}'
        audio.save(temp_filename)
        print(f"📁 Audio saved to {temp_filename}")
        
        # librosa.load handles multiple formats: WAV, MP3, OGG, FLAC, M4A, etc.
        try:
            y, sr = librosa.load(temp_filename, sr=16000)
            print(f"🔊 Audio loaded: {len(y)} samples at {sr} Hz")
        except Exception as e:
            # Surface decoder problems (e.g., missing FFmpeg for MP3) instead of generic 500
            print(f"❌ Failed to load audio: {str(e)}")
            return jsonify({
                'error': 'Could not decode audio. Install FFmpeg for MP3/OGG or upload a WAV file.',
                'details': str(e)
            }), 415
        
        print("🎵 Extracting MFCC...")
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
        stats = {
            'mean': np.mean(mfcc, axis=1).round(3).tolist(),
            'std': np.std(mfcc, axis=1).round(3).tolist(),
            'energy': float(np.sum(y ** 2) / len(y)),
            'duration': round(len(y) / sr, 2)
        }
        print(f"✅ MFCC extracted: shape {mfcc.shape}")
        
        # Wake word detection
        try:
            wake_word, wake_range = detect_command(mfcc)
            confidence = None
            if wake_word:
                # Simple confidence: inverse of min_dist (simulate)
                confidence = 95.0
        except Exception as e:
            print(f"⚠️ Wake word detection failed: {str(e)}, continuing without it")
            wake_word = None
            wake_range = None
            confidence = None
        
        result = {
            'mfcc': mfcc.tolist(),
            'shape': [int(x) for x in mfcc.shape],
            'stats': stats,
            'wake_word': bool(wake_word),
            'wake_range': [int(x) for x in wake_range] if wake_range else None,
            'confidence': float(confidence) if confidence else None,
            'timestamp': int((wake_range[0] / mfcc.shape[1]) * stats['duration'] * 1000) if wake_range else None,
            'keyword': wake_word
        }
        print("✅ Upload/MFCC processing complete, returning result")
        return jsonify(result)
    
    except Exception as e:
        print(f"❌ FATAL ERROR in upload: {str(e)}")
        print(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }), 500

# --- Streaming endpoint for real-time MFCC (chunked audio) ---
@app.route('/stream_mfcc', methods=['POST'])
def stream_mfcc():
    # Accepts raw PCM or WAV chunks, returns MFCC for each chunk
    audio = request.files['audio']
    y, sr = librosa.load(audio, sr=16000)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    stats = {
        'mean': np.mean(mfcc, axis=1).round(3).tolist(),
        'std': np.std(mfcc, axis=1).round(3).tolist(),
        'energy': float(np.sum(y ** 2) / len(y)),
        'duration': round(len(y) / sr, 2)
    }
    return jsonify({
        'mfcc': mfcc.tolist(),
        'shape': list(mfcc.shape),
        'stats': stats
    })

# --- Wake Word Detection Endpoint (Real-Time) ---
@app.route('/wakeword_detect', methods=['POST', 'OPTIONS'])
def wakeword_detect():
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})
    
    try:
        audio = request.files.get('audio')
        wake_word = request.form.get('wakeWord', 'hey assistant')
        confidence = float(request.form.get('confidence', 0))
        
        if audio:
            # Save audio chunk
            temp_filename = 'wakeword_temp.wav'
            audio.save(temp_filename)
            
            # Process with librosa
            y, sr = librosa.load(temp_filename, sr=16000)
            mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
            
            # Detect wake word
            detected_word, wake_range = detect_command(mfcc)
            
            result = {
                'detected': bool(detected_word),
                'wake_word': wake_word,
                'detected_word': detected_word,
                'confidence': confidence,
                'timestamp': int(time.time() * 1000),
                'mfcc_shape': list(mfcc.shape)
            }
            
            return jsonify(result)
        else:
            return jsonify({'error': 'No audio data'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# --- Accelerator endpoint ---
@app.route('/accelerate', methods=['POST', 'OPTIONS'])
def accelerate():
    if request.method == 'OPTIONS':
        return handle_cors_preflight()
    
    try:
        mfcc_json = request.form.get('mfcc', '[]')
        if not mfcc_json or mfcc_json == '[]':
            return jsonify({
                'success': False,
                'error': 'No MFCC data provided'
            }), 400
        
        mfcc_data = json.loads(mfcc_json)
        
        # Validate MFCC data
        if not isinstance(mfcc_data, list) or len(mfcc_data) == 0:
            return jsonify({
                'success': False,
                'error': 'Invalid MFCC data format'
            }), 400
        
        # Get data dimensions
        rows = len(mfcc_data)
        cols = len(mfcc_data[0]) if mfcc_data and len(mfcc_data) > 0 else 0
        
        # Simulate hardware accelerator processing
        # In a real system, this would:
        # - Apply quantization (reduce precision for faster hardware)
        # - Send to FPGA/ASIC for processing
        # - Get optimized results back
        
        # Simulate processing time (hardware delay)
        time.sleep(0.1)
        
        # Process MFCC through accelerator (could be quantization, optimization, etc)
        result = {
            'success': True,
            'message': 'Hardware acceleration complete',
            'input_shape': [rows, cols],
            'processing_time': '0.1s',
            'accelerator_status': 'FPGA simulation OK',
            'optimized': True
        }
        
        print(f"✅ Accelerator processed MFCC data: {rows}x{cols}")
        return jsonify(result)
        
    except json.JSONDecodeError as e:
        return jsonify({
            'success': False,
            'error': 'Invalid JSON data',
            'details': str(e)
        }), 400
    except Exception as e:
        print(f"❌ Accelerator error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# --- Download endpoints ---
@app.route('/download_wav', methods=['GET'])
def download_wav():
    # Find temp file with any audio extension
    for ext in ['.wav', '.mp3', '.m4a', '.ogg', '.flac']:
        temp_file = f'temp{ext}'
        if os.path.exists(temp_file):
            return send_file(temp_file, as_attachment=True, download_name=f'audio{ext}')
    return 'No audio file available', 404

@app.route('/download_mfcc', methods=['GET'])
def download_mfcc():
    mfcc = np.loadtxt('temp.mfcc', delimiter=',') if os.path.exists('temp.mfcc') else None
    if mfcc is None:
        return 'No MFCC available', 404
    buf = io.StringIO()
    np.savetxt(buf, mfcc, delimiter=',')
    buf.seek(0)
    return send_file(io.BytesIO(buf.read().encode()), as_attachment=True, download_name='mfcc.csv', mimetype='text/csv')

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
