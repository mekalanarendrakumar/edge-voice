console.log('Script.js loaded successfully');

// --- Wait for DOM to load ---
document.addEventListener('DOMContentLoaded', function() {
console.log('DOM Content Loaded - initializing EdgeVoice');

// --- UI Elements ---
const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');
const playbackBtn = document.getElementById('playbackBtn');
const chooseFileBtn = document.getElementById('chooseFileBtn');
const fileInput = document.getElementById('fileInput');
const extractMfccBtn = document.getElementById('extractMFCCBtn');
const runAcceleratorBtn = document.getElementById('runAcceleratorBtn');
const statusDiv = document.getElementById('status');
const durationSpan = document.getElementById('duration');
const waveformCanvas = document.getElementById('waveform');
const mfccHeatmapDiv = document.getElementById('mfccHeatmap');
const wakewordStatusDiv = document.getElementById('wakewordStatus');
const statsBox = document.getElementById('mfccStats');
const downloadWavBtn = document.getElementById('downloadWavBtn');
const downloadMfccBtn = document.getElementById('downloadMfccBtn');
const downloadGraphBtn = document.getElementById('downloadGraphBtn');
const audioPlayer = document.getElementById('audioPlayer');
const audioPlayerContainer = document.getElementById('audioPlayerContainer');
const shapeInfo = document.getElementById('shapeInfo');

// New panel references
const waveformPanel = document.getElementById('waveformPanel');
const heatmapPanel = document.getElementById('heatmapPanel');
const statsPanel = document.getElementById('statsPanel');
const wakewordPanel = document.getElementById('wakewordPanel');
const wakewordResults = document.getElementById('wakewordResults');

console.log('All UI elements fetched:', {
  recordBtn: !!recordBtn,
  chooseFileBtn: !!chooseFileBtn,
  fileInput: !!fileInput,
  extractMfccBtn: !!extractMfccBtn,
  runAcceleratorBtn: !!runAcceleratorBtn,
  statusDiv: !!statusDiv
});

let audioBuffer = null;
let audioBlob = null;
let mfccData = null;
let stats = null;
let isRecording = false;
let mediaRecorder, audioChunks = [], audioUrl = null;

// --- Clear Visualizations ---
function clearVisualizations() {
  // Hide all result panels
  if (waveformPanel) waveformPanel.style.display = 'none';
  if (heatmapPanel) heatmapPanel.style.display = 'none';
  if (statsPanel) statsPanel.style.display = 'none';
  if (wakewordPanel) wakewordPanel.style.display = 'none';
  
  if (waveformCanvas) {
    const ctx = waveformCanvas.getContext('2d');
    ctx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
  }
  if (document.getElementById("mfcc-heatmap")) {
    document.getElementById("mfcc-heatmap").innerHTML = "";
  }
  if (document.getElementById("mfcc-stats")) {
    document.getElementById("mfcc-stats").innerHTML = "";
  }
  if (mfccHeatmapDiv) {
    mfccHeatmapDiv.innerHTML = "";
  }
  if (statsBox) {
    statsBox.innerHTML = "";
  }
}

// --- Record Voice ---
if (recordBtn) {
  console.log('Record button found, attaching listener');
  recordBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎤 Record button clicked');
    if (!navigator.mediaDevices) {
      statusDiv.textContent = 'Microphone not supported.';
      return;
    }
    
    // Show result panel immediately
    if (waveformPanel) {
      waveformPanel.style.display = 'block';
    }
    
    statusDiv.textContent = 'Recording... 0%';
    audioChunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    let startTime = Date.now();
    let chunkCount = 0;
    let durationInterval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      durationSpan.textContent = `Duration: ${elapsed}s`;
    }, 100);
    
    // Real-time MFCC streaming
    mediaRecorder.ondataavailable = async (e) => {
      audioChunks.push(e.data);
      chunkCount++;
      const progress = Math.min(chunkCount * 2, 100); // Simulate progress
      statusDiv.textContent = `Recording... ${progress}%`;
      
      // Stream chunk to backend for real-time MFCC
      const formData = new FormData();
      formData.append('audio', e.data, `chunk_${chunkCount}.wav`);
      
      try {
        const response = await fetch('http://localhost:5000/stream_mfcc', {
          method: 'POST',
          body: formData
        });
        const result = await response.json();
        
        if (result.mfcc) {
          console.log('Real-time MFCC received, shape:', result.shape);
          // Update real-time display with MFCC data
          mfccData = result.mfcc;
          stats = result.stats || stats;
          
          // Display real-time MFCC heatmap
          if (mfccHeatmapDiv) {
            console.log('Updating MFCC heatmap');
            drawMfccHeatmap(result.mfcc);
          }
          
          // Update shape info
          if (shapeInfo) {
            const shape = result.shape || [13, result.mfcc[0]?.length || 0];
            shapeInfo.textContent = `MFCC Shape: (${shape[0]}, ${shape[1]})`;
            console.log('Shape info updated:', shapeInfo.textContent);
          }
          
          // Update stats display
          if (statsBox) {
            const mean = result.stats?.mean || [];
            const std = result.stats?.std || [];
            const energy = result.stats?.energy || 0;
            const duration = result.stats?.duration || 0;
            statsBox.innerHTML = `
              <strong>MFCC Mean (first 5):</strong> ${mean.slice(0, 5).map(x => x.toFixed(3)).join(', ')}<br>
              <strong>MFCC Std (first 5):</strong> ${std.slice(0, 5).map(x => x.toFixed(3)).join(', ')}<br>
              <strong>Energy:</strong> ${energy.toFixed(4)}<br>
              <strong>Duration:</strong> ${duration.toFixed(2)} sec
            `;
            console.log('Stats updated');
          }
        }
      } catch (err) {
        console.error('Stream error:', err);
      }
    };
    
    mediaRecorder.onstop = () => {
      clearInterval(durationInterval);
      statusDiv.textContent = 'Recording complete! 100%';
      audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      audioUrl = URL.createObjectURL(audioBlob);
      audioPlayer.src = audioUrl;
      audioPlayerContainer.style.display = 'block';
      playbackBtn.style.display = 'inline-block';
      
      // Load audio and update duration when metadata is ready
      audioPlayer.load();
      audioPlayer.onloadedmetadata = () => {
        const actualDuration = audioPlayer.duration || 0;
        durationSpan.textContent = `Duration: ${actualDuration.toFixed(1)}s`;
        if (durationDisplay) {
          durationDisplay.textContent = formatTime(actualDuration);
        }
        if (progressBar) {
          progressBar.max = actualDuration;
        }
        console.log('Recorded audio duration loaded:', actualDuration);
      };
      
      // Show waveform panel for recorded audio
      if (waveformPanel) {
        waveformPanel.style.display = 'block';
        drawWaveformFromBlob(audioBlob);
      }
      
      recordBtn.style.display = 'inline-block';
      stopBtn.style.display = 'none';
    };
    
    mediaRecorder.start(500); // Emit data every 500ms for real-time updates
    isRecording = true;
    recordBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
  });
} else {
  console.warn('Record button not found!');
}

// --- Stop Recording ---
if (stopBtn) {
  console.log('Stop button found, attaching listener');
  stopBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('⏹️ Stop button clicked');
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      isRecording = false;
    }
  });
} else {
  console.warn('Stop button not found!');
}

// --- Playback ---
if (playbackBtn) {
  console.log('Playback button found, attaching listener');
  playbackBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('▶️ Playback button clicked');
    if (audioPlayer.paused) {
      audioPlayer.play();
      playbackBtn.textContent = '⏸️ Pause';
    } else {
      audioPlayer.pause();
      playbackBtn.textContent = '▶️ Playback';
    }
  });
  if (audioPlayer) {
    audioPlayer.onended = () => {
      playbackBtn.textContent = '▶️ Playback';
    };
  }
} else {
  console.warn('Playback button not found!');
}

// --- Custom Audio Player Controls ---
const playPauseBtn = document.getElementById('playPauseBtn');
const progressBar = document.getElementById('progressBar');
const volumeControl = document.getElementById('volumeControl');
const timeDisplay = document.querySelector('.time-display');
const durationDisplay = document.querySelector('.duration-display');
const menuBtn = document.getElementById('menuBtn');

if (playPauseBtn && audioPlayer) {
  console.log('Play/Pause button found, attaching listener');
  playPauseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('Play/Pause button clicked');
    if (audioPlayer.paused) {
      audioPlayer.play();
      playPauseBtn.textContent = '⏸';
    } else {
      audioPlayer.pause();
      playPauseBtn.textContent = '▶';
    }
  });
}

if (progressBar && audioPlayer) {
  audioPlayer.onloadedmetadata = () => {
    const duration = audioPlayer.duration || 0;
    progressBar.max = duration;
    durationDisplay.textContent = formatTime(duration);
    console.log('Audio duration set to:', formatTime(duration));
  };
  audioPlayer.ontimeupdate = () => {
    progressBar.value = audioPlayer.currentTime;
    timeDisplay.textContent = formatTime(audioPlayer.currentTime);
  };
  audioPlayer.onended = () => {
    playPauseBtn.textContent = '▶';
  };
  progressBar.oninput = () => {
    audioPlayer.currentTime = progressBar.value;
  };
}

if (volumeControl && audioPlayer) {
  volumeControl.oninput = () => {
    audioPlayer.volume = volumeControl.value / 100;
  };
  audioPlayer.volume = 0.7;
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// --- File Upload ---
if (chooseFileBtn && fileInput) {
  console.log('File upload handler attaching...');
  chooseFileBtn.addEventListener('click', () => {
    console.log('📁 Choose File button clicked - opening file picker');
    fileInput.click();
  });
  
  fileInput.addEventListener('change', (e) => {
    console.log('File selected:', e.target.files.length);
    if (e.target.files.length > 0) {
      const file = e.target.files[0];
      console.log('Processing file:', file.name);
      statusDiv.textContent = `Selected: ${file.name}`;
      audioBlob = file;
      const audioUrl = URL.createObjectURL(audioBlob);
      audioPlayer.src = audioUrl;
      audioPlayerContainer.style.display = 'block';
      playbackBtn.style.display = 'inline-block';
      
      // Reset duration displays
      durationSpan.textContent = 'Duration: Loading...';
      if (durationDisplay) {
        durationDisplay.textContent = '0:00';
      }
      if (progressBar) {
        progressBar.max = 100;
        progressBar.value = 0;
      }
      
      // Ensure duration updates when metadata loads
      audioPlayer.load();
      audioPlayer.onloadedmetadata = () => {
        const actualDuration = audioPlayer.duration || 0;
        durationSpan.textContent = `Duration: ${actualDuration.toFixed(1)}s`;
        if (durationDisplay) {
          durationDisplay.textContent = formatTime(actualDuration);
        }
        if (progressBar) {
          progressBar.max = actualDuration;
        }
        console.log('Audio file duration loaded:', actualDuration);
      };
      drawWaveformFromBlob(audioBlob);
    }
  });
} else {
  console.warn('Choose File button or file input not found!', {
    chooseFileBtn: !!chooseFileBtn,
    fileInput: !!fileInput
  });
}

// --- Extract MFCC ---
window.extractMFCC = async function extractMFCC(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }
  console.log("Extract MFCC function called");
  try {
    console.log("MFCC extraction started");
    if (!audioBlob) {
      alert("Please record or select audio first");
      if (extractMfccBtn) extractMfccBtn.style.display = 'inline-block';
      return false;
    }
    statusDiv.textContent = 'Extracting MFCC...';
    extractMfccBtn.style.display = 'none';
    const formData = new FormData();
    formData.append('audio', audioBlob, 'audio.wav');

    const backendUrls = [
      'http://127.0.0.1:5000/upload',
      'http://localhost:5000/upload'
    ];

    let lastError = null;
    for (const url of backendUrls) {
      try {
        console.log('Trying backend URL:', url);
        statusDiv.textContent = 'Contacting backend at: ' + url;
        
        // Test connectivity first with OPTIONS
        try {
          const optionsResp = await fetch(url, {
            method: 'OPTIONS',
            mode: 'cors'
          });
          console.log('OPTIONS request successful:', optionsResp.status);
        } catch (optionsErr) {
          console.warn('OPTIONS preflight failed:', optionsErr);
        }
        
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.wav');
        
        console.log('Sending POST request with FormData...');
        const resp = await fetch(url, {
          method: 'POST',
          body: formData,
          mode: 'cors'
        });
        
        console.log('Response received:', resp.status, resp.statusText);

        // Read JSON even on failure so we can surface backend error details
        let result = null;
        try {
          result = await resp.json();
        } catch (jsonErr) {
          console.warn('Could not parse backend JSON response', jsonErr);
        }

        if (!resp.ok) {
          const serverMsg = result?.error || result?.details || result?.message;
          throw new Error(`Server error ${resp.status}${serverMsg ? ': ' + serverMsg : ''}`);
        }

        // Successful response
        console.log('Backend response:', result);
        mfccData = result.mfcc;
        stats = result.stats;
        
        // Show panels in order: 1. Waveform, 2. Heatmap, 2.5. Coefficients Chart, 3. Stats, 4. Wake word (if detected)
        try {
          // Show waveform
          if (waveformPanel) {
            waveformPanel.style.display = 'block';
            drawWaveformFromBlob(audioBlob);
          }
          
          // Show and draw heatmap
          if (heatmapPanel) {
            heatmapPanel.style.display = 'block';
            drawMfccHeatmap(mfccData);
          }
          
          // Show MFCC coefficients line chart with wake word highlight
          const coefficientsPanel = document.getElementById('coefficientsPanel');
          if (coefficientsPanel) {
            coefficientsPanel.style.display = 'block';
            drawMfccCoefficientsChart(mfccData, result.wake_range);
          }
          
          // Show statistics
          if (statsPanel) {
            statsPanel.style.display = 'block';
            showStats(stats, result.shape);
          }
          
          // Always show wake word detection panel (part of results)
          if (wakewordPanel) {
            wakewordPanel.style.display = 'block';
            if (result.wake_word && result.keyword) {
              displayWakeWordDetection(result);
            } else {
              // Show "not detected" message
              displayWakeWordDetection({
                wake_word: false,
                keyword: 'No wake word detected',
                confidence: 0,
                timestamp: new Date().toISOString()
              });
            }
          }
        } catch (err) {
          console.error('Error displaying results:', err);
        }
        statusDiv.textContent = 'MFCC extraction complete!';
        statusDiv.style.color = '#fff';
        // Display shape info in stats panel
        if (shapeInfo && result.shape && statsPanel) {
          shapeInfo.textContent = `MFCC Shape: [${result.shape.join(', ')}]`;
          statsPanel.style.display = 'block';
        }
        extractMfccBtn.style.display = 'inline-block';
        console.log("MFCC extraction successful");
        return;
      } catch (err) {
        lastError = err;
        console.error('Fetch error for', url, err);
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error type:', typeof err);
        statusDiv.textContent = 'Error contacting ' + url + ': ' + err.message;
        continue;
      }
    }

    // If all attempts failed
    const errorMsg = lastError ? lastError.message : 'Unknown error';
    statusDiv.textContent = 'Error extracting MFCC: ' + errorMsg + '. Please ensure backend is running on 127.0.0.1:5000 or localhost:5000.';
    statusDiv.style.color = '#ff6b6b';
    console.error('All backend URLs failed. Last error:', lastError);
    throw new Error(errorMsg);
  } catch (err) {
    console.error('MFCC Extraction Error:', err);
    const errorDetails = err.message || err.toString();
    alert(`MFCC extraction failed!\n\nError: ${errorDetails}\n\nPlease check:\n1. Backend server is running (port 5000)\n2. Audio file is valid\n3. Console for details (F12)`);
  } finally {
    extractMfccBtn.style.display = 'inline-block';
  }
}

if (extractMfccBtn) {
  console.log('Extract MFCC button found, attaching listener');
  extractMfccBtn.addEventListener('click', function(e) {
    console.log('Button clicked, preventing defaults');
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    extractMFCC(e);
    return false;
  }, false);
} else {
  console.error('Extract MFCC button not found!');
}

// Capture-phase safety: ensure button never navigates
document.addEventListener('click', function(e) {
  const target = e.target;
  if (target && target.id === 'extractMFCCBtn') {
    console.log('Capture handler: blocking navigation');
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    extractMFCC(e);
    return false;
  }
}, true);

// --- Display Wake Word Detection Results (Separate Section) ---
function displayWakeWordDetection(result) {
  const wakewordStatus = document.getElementById('wakewordStatus');
  const wakewordKeyword = document.getElementById('wakewordKeyword');
  const wakewordConfidence = document.getElementById('wakewordConfidence');
  const wakewordTimestamp = document.getElementById('wakewordTimestamp');
  
  if (wakewordStatus) {
    if (result.wake_word) {
      wakewordStatus.textContent = '✓ DETECTED';
      wakewordStatus.style.color = '#00ff64';
    } else {
      wakewordStatus.textContent = '✗ NOT DETECTED';
      wakewordStatus.style.color = '#ff6b6b';
    }
  }
  
  if (wakewordKeyword) {
    if (result.wake_word && result.keyword) {
      wakewordKeyword.textContent = result.keyword;
      wakewordKeyword.style.color = '#ffeb3b';
    } else {
      wakewordKeyword.textContent = 'No wake word detected';
      wakewordKeyword.style.color = '#aaa';
    }
  }
  
  if (wakewordConfidence) {
    if (result.wake_word && result.confidence) {
      wakewordConfidence.textContent = `${result.confidence.toFixed(1)}%`;
      wakewordConfidence.style.color = '#00ff64';
    } else {
      wakewordConfidence.textContent = 'N/A';
      wakewordConfidence.style.color = '#aaa';
    }
  }
  
  if (wakewordTimestamp) {
    if (result.wake_word && result.timestamp) {
      wakewordTimestamp.textContent = `${result.timestamp}ms`;
      wakewordTimestamp.style.color = '#00d4ff';
    } else {
      wakewordTimestamp.textContent = 'N/A';
      wakewordTimestamp.style.color = '#aaa';
    }
  }
}

// --- Draw Waveform from Blob ---
function drawWaveformFromBlob(blob) {
  const ctx = waveformCanvas.getContext('2d');
  ctx.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height);
  if (!blob) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.decodeAudioData(ev.target.result, decoded => {
      const data = decoded.getChannelData(0);
      ctx.beginPath();
      for (let i = 0; i < waveformCanvas.width; i++) {
        const idx = Math.floor(i / waveformCanvas.width * data.length);
        const y = (1 - (data[idx] + 1) / 2) * waveformCanvas.height;
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ff0080';
      ctx.shadowBlur = 8;
      ctx.stroke();
    });
  };
  reader.readAsArrayBuffer(blob);
}

// --- Show Stats Function (Updated) ---
function showStats(stats, shape) {
  if (!stats) return;
  let html = `<b>MFCC Statistics</b><br>`;
  if (shape && Array.isArray(shape)) {
    html += `<b style="color:#00ffae">Shape: (${shape.join(' × ')})</b><br><br>`;
  }
  
  // Audio Properties
  html += `<b style="color:#ff00ff">Audio Properties:</b><br>`;
  html += `<span style="color:#00ffae">Duration:</span> ${stats.duration} sec<br>`;
  html += `<span style="color:#00ffae">Energy:</span> ${stats.energy.toFixed(6)}<br><br>`;
  
  // MFCC Coefficients Mean Values
  html += `<b style="color:#ff00ff">MFCC Mean Values:</b><br>`;
  html += `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; font-size: 0.9em;">`;
  for (let i = 0; i < stats.mean.length; i++) {
    html += `<span>C${i+1}: <b style="color:#00ffae">${stats.mean[i]}</b></span>`;
  }
  html += `</div><br>`;
  
  // MFCC Coefficients Std Dev Values
  html += `<b style="color:#ff00ff">MFCC Std Dev:</b><br>`;
  html += `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; font-size: 0.9em;">`;
  for (let i = 0; i < stats.std.length; i++) {
    html += `<span>C${i+1}: <b style="color:#00ffae">${stats.std[i]}</b></span>`;
  }
  html += `</div>`;
  
  statsBox.innerHTML = html;
}

// --- DEPRECATED: showRealtimeOutput (replaced by displayWakeWordDetection) ---
function showRealtimeOutput(mfcc, stats) {
  if (!mfcc) return;
  // This function is no longer used - panels are now shown in correct order
}

function drawWaveformAnalysis(canvas, mfcc, wakeRange, color) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.fillStyle = '#000810';
  ctx.fillRect(0, 0, width, height);
  
  if (!mfcc || mfcc.length === 0) return;
  
  // Draw spectrogram with full color spectrum
  const numFrames = Math.min(mfcc[0].length, 60);
  const numCoeffs = Math.min(mfcc.length, 12);
  const frameWidth = width / numFrames;
  const coeffHeight = height / numCoeffs;
  
  // Use percentile-based normalization for better color spread
  const allValues = [];
  for (let i = 0; i < numFrames; i++) {
    for (let j = 0; j < numCoeffs; j++) {
      allValues.push(Math.abs(mfcc[j][i]));
    }
  }
  allValues.sort((a, b) => a - b);
  const p10 = allValues[Math.floor(allValues.length * 0.1)];
  const p90 = allValues[Math.floor(allValues.length * 0.9)];
  const range = p90 - p10 || 1;
  
  for (let i = 0; i < numFrames; i++) {
    for (let j = 0; j < numCoeffs; j++) {
      const val = Math.abs(mfcc[j][i]);
      let normalized = (val - p10) / range;
      normalized = Math.min(1, Math.max(0, normalized));
      
      // Full spectrum color map: Dark Blue -> Blue -> Purple -> Red -> Orange -> Yellow
      let r = 0, g = 0, b = 0;
      
      if (normalized < 0.1) {
        // Black/Dark blue
        r = 10;
        g = 10;
        b = 50 + normalized * 400;
      } else if (normalized < 0.2) {
        // Dark blue to blue
        const t = (normalized - 0.1) / 0.1;
        r = 10;
        g = 20 + t * 50;
        b = 200 + t * 55;
      } else if (normalized < 0.35) {
        // Blue to purple
        const t = (normalized - 0.2) / 0.15;
        r = 80 + t * 140;
        g = 70 - t * 50;
        b = 255 - t * 100;
      } else if (normalized < 0.5) {
        // Purple to magenta/red
        const t = (normalized - 0.35) / 0.15;
        r = 220 + t * 35;
        g = 20 - t * 20;
        b = 155 - t * 155;
      } else if (normalized < 0.65) {
        // Red
        const t = (normalized - 0.5) / 0.15;
        r = 255;
        g = 0 + t * 80;
        b = 0;
      } else if (normalized < 0.8) {
        // Red to orange
        const t = (normalized - 0.65) / 0.15;
        r = 255;
        g = 80 + t * 120;
        b = 0;
      } else {
        // Orange to yellow
        const t = (normalized - 0.8) / 0.2;
        r = 255;
        g = 200 + t * 55;
        b = 0;
      }
      
      ctx.fillStyle = `rgb(${Math.floor(Math.min(255, r))}, ${Math.floor(Math.min(255, g))}, ${Math.floor(Math.min(255, b))})`;
      ctx.fillRect(i * frameWidth, j * coeffHeight, Math.ceil(frameWidth), Math.ceil(coeffHeight));
    }
  }
  
  // Draw grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= numFrames; i += 10) {
    ctx.beginPath();
    ctx.moveTo((i / numFrames) * width, 0);
    ctx.lineTo((i / numFrames) * width, height);
    ctx.stroke();
  }
  
  // Add DETECTED indicator if wake word found
  if (wakeRange && wakeRange[0] !== undefined) {
    const startX = (wakeRange[0] / numFrames) * width;
    const endX = (wakeRange[1] / numFrames) * width;
    const centerX = (startX + endX) / 2;
    const centerY = height / 2;
    
    // Draw detection oval
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, (endX - startX) / 2 + 15, height / 2.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw DETECTED text
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('DETECTED', centerX, centerY);
  }
}

function drawSilenceWaveform(canvas, mfcc, energy) {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.fillStyle = '#000810';
  ctx.fillRect(0, 0, width, height);
  
  if (!mfcc || mfcc.length === 0) return;
  
  // Draw spectrogram with cyan/green/yellow gradient
  const numFrames = Math.min(mfcc[0].length, 60);
  const numCoeffs = Math.min(mfcc.length, 12);
  const frameWidth = width / numFrames;
  const coeffHeight = height / numCoeffs;
  
  // Use percentile-based normalization
  const allValues = [];
  for (let i = 0; i < numFrames; i++) {
    for (let j = 0; j < numCoeffs; j++) {
      allValues.push(Math.abs(mfcc[j][i]));
    }
  }
  allValues.sort((a, b) => a - b);
  const p10 = allValues[Math.floor(allValues.length * 0.1)];
  const p90 = allValues[Math.floor(allValues.length * 0.9)];
  const range = p90 - p10 || 1;
  
  for (let i = 0; i < numFrames; i++) {
    for (let j = 0; j < numCoeffs; j++) {
      const val = Math.abs(mfcc[j][i]);
      let normalized = (val - p10) / range;
      normalized = Math.min(1, Math.max(0, normalized));
      
      // Cyan/Green/Yellow spectrum
      let r = 0, g = 0, b = 0;
      
      if (normalized < 0.1) {
        // Dark blue
        r = 0;
        g = 30;
        b = 80 + normalized * 300;
      } else if (normalized < 0.25) {
        // Dark blue/cyan
        const t = (normalized - 0.1) / 0.15;
        r = 0;
        g = 30 + t * 170;
        b = 110 + (1 - t) * 90;
      } else if (normalized < 0.45) {
        // Cyan
        const t = (normalized - 0.25) / 0.2;
        r = 0 + t * 80;
        g = 200;
        b = 50 - t * 50;
      } else if (normalized < 0.65) {
        // Cyan to green
        const t = (normalized - 0.45) / 0.2;
        r = 80 + t * 100;
        g = 200 + t * 55;
        b = 0;
      } else if (normalized < 0.8) {
        // Green to lime
        const t = (normalized - 0.65) / 0.15;
        r = 180 + t * 75;
        g = 255;
        b = 0;
      } else {
        // Lime to yellow
        const t = (normalized - 0.8) / 0.2;
        r = 255;
        g = 255;
        b = 0 + t * 100;
      }
      
      ctx.fillStyle = `rgb(${Math.floor(Math.min(255, r))}, ${Math.floor(Math.min(255, g))}, ${Math.floor(Math.min(255, b))})`;
      ctx.fillRect(i * frameWidth, j * coeffHeight, Math.ceil(frameWidth), Math.ceil(coeffHeight));
    }
  }
  
  // Draw grid
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.15)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= numFrames; i += 10) {
    ctx.beginPath();
    ctx.moveTo((i / numFrames) * width, 0);
    ctx.lineTo((i / numFrames) * width, height);
    ctx.stroke();
  }
}

// --- Draw MFCC Heatmap (Plotly.js) ---
function drawMfccHeatmap(mfcc) {
  if (!mfcc || mfcc.length === 0) return;
  
  // Normalize MFCC data for better clarity (min-max normalization per row)
  const normalizedMfcc = mfcc.map(row => {
    const minVal = Math.min(...row);
    const maxVal = Math.max(...row);
    const range = maxVal - minVal || 1;
    
    return row.map(val => {
      // Normalize to 0-100 range for better visibility
      return ((val - minVal) / range) * 100;
    });
  });
  
  // Generate time labels
  const frameCount = mfcc[0].length;
  const duration = frameCount * 0.016; // Approximate (assuming ~16ms per frame)
  
  const data = [{
    z: normalizedMfcc,
    x: Array.from({length: frameCount}, (_, i) => i),
    y: Array.from({length: mfcc.length}, (_, i) => i + 1),
    type: 'heatmap',
    colorscale: [
      [0, '#001a4d'],      // Dark blue
      [0.15, '#0033cc'],   // Blue
      [0.3, '#0066ff'],    // Light blue
      [0.45, '#00ccff'],   // Cyan
      [0.6, '#66ff00'],    // Green
      [0.75, '#ffff00'],   // Yellow
      [0.85, '#ff6600'],   // Orange
      [1, '#ff0000']       // Red
    ],
    showscale: true,
    colorbar: {
      title: 'Magnitude (%)',
      thickness: 20,
      len: 0.7,
      x: 1.02,
      xanchor: 'left',
      yanchor: 'middle',
      tickvals: [0, 25, 50, 75, 100],
      ticktext: ['0%', '25%', '50%', '75%', '100%'],
      titlefont: {color: '#fff', size: 12},
      tickfont: {color: '#fff', size: 11}
    },
    hovertemplate: '<b>Frame: %{x}</b><br>MFCC C%{y}<br>Magnitude: %{z:.1f}%<extra></extra>'
  }];
  
  const layout = {
    title: {
      text: 'MFCC Output (Real-Time)',
      font: {size: 18, color: '#fff', family: 'Arial, sans-serif'},
      x: 0.5,
      xanchor: 'center',
      y: 0.95
    },
    xaxis: {
      title: 'Time (Frames)',
      titlefont: {color: '#fff', size: 13},
      tickfont: {color: '#aaa', size: 11},
      showgrid: true,
      gridwidth: 0.5,
      gridcolor: 'rgba(255,255,255,0.05)',
      zeroline: false
    },
    yaxis: {
      title: 'MFCC Coefficients',
      titlefont: {color: '#fff', size: 13},
      tickfont: {color: '#aaa', size: 11},
      showgrid: true,
      gridwidth: 0.5,
      gridcolor: 'rgba(255,255,255,0.05)',
      zeroline: false,
      autorange: 'reversed'
    },
    width: 800,
    height: 380,
    margin: {t: 70, l: 100, r: 140, b: 60},
    plot_bgcolor: 'rgba(0,0,0,0.5)',
    paper_bgcolor: 'rgba(0,0,0,0)',
    font: {family: 'Arial, sans-serif', color: '#fff'},
    hovermode: 'closest',
    showlegend: false
  };
  
  Plotly.newPlot(mfccHeatmapDiv, data, layout, {
    displayModeBar: false,
    responsive: true
  });
}

// --- Draw MFCC Coefficients Line Chart with Wake Word Detection ---
function drawMfccCoefficientsChart(mfcc, wakeRange) {
  if (!mfcc || mfcc.length === 0) return;
  
  const coefficientsDiv = document.getElementById('mfccCoefficients');
  if (!coefficientsDiv) return;
  
  // Create traces for each MFCC coefficient (different color for each)
  const colors = ['#FF6B9D', '#C44569', '#F8B500', '#FFA500', '#FF6347', 
                  '#00CED1', '#32CD32', '#FF1493', '#00BFFF', '#7FFF00',
                  '#DC143C', '#4169E1', '#FF69B4'];
  
  const frameCount = mfcc[0].length;
  const frames = Array.from({length: frameCount}, (_, i) => i);
  
  const traces = mfcc.map((coefficients, idx) => ({
    x: frames,
    y: coefficients,
    mode: 'lines',
    name: `MFCC C${idx + 1}`,
    line: {
      color: colors[idx % colors.length],
      width: 2
    },
    hovertemplate: `MFCC C${idx + 1}<br>Frame: %{x}<br>Value: %{y:.2f}<extra></extra>`
  }));
  
  // Add yellow highlight region and annotation for wake word detection
  const shapes = [];
  const annotations = [];
  
  if (wakeRange && Array.isArray(wakeRange) && wakeRange.length === 2) {
    const [start, end] = wakeRange;
    
    // Add yellow background highlight
    shapes.push({
      type: 'rect',
      x0: start,
      x1: end,
      y0: -100,
      y1: 150,
      fillcolor: 'rgba(255, 255, 0, 0.3)',
      line: {
        color: 'rgba(255, 255, 0, 0.6)',
        width: 2,
        dash: 'dash'
      },
      layer: 'below'
    });
    
    // Add "Wake Word Detected!" text annotation
    annotations.push({
      x: (start + end) / 2,
      y: 100,
      text: '<b>Wake Word Detected!</b>',
      showarrow: false,
      font: {
        color: '#000000',
        size: 16,
        family: 'Arial Black'
      },
      bgcolor: 'rgba(255, 255, 0, 0.9)',
      bordercolor: '#FFD700',
      borderwidth: 2,
      borderpad: 8
    });
  }
  
  const layout = {
    title: {
      text: 'Real-Time MFCC Coefficients',
      font: {size: 18, color: '#fff'},
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      title: 'Frame Index',
      titlefont: {color: '#fff', size: 14},
      tickfont: {color: '#aaa'},
      showgrid: true,
      gridwidth: 0.5,
      gridcolor: 'rgba(255,255,255,0.1)',
      zeroline: true,
      zerolinewidth: 1,
      zerolinecolor: 'rgba(255,255,255,0.3)'
    },
    yaxis: {
      title: 'MFCC Value',
      titlefont: {color: '#fff', size: 14},
      tickfont: {color: '#aaa'},
      showgrid: true,
      gridwidth: 0.5,
      gridcolor: 'rgba(255,255,255,0.1)',
      zeroline: true,
      zerolinewidth: 1,
      zerolinecolor: 'rgba(255,255,255,0.3)'
    },
    width: 900,
    height: 400,
    margin: {t: 70, l: 70, r: 50, b: 60},
    plot_bgcolor: 'rgba(0,0,0,0.4)',
    paper_bgcolor: 'rgba(0,0,0,0)',
    font: {family: 'Arial, sans-serif', color: '#fff'},
    hovermode: 'x unified',
    showlegend: true,
    legend: {
      x: 1.05,
      y: 1,
      bgcolor: 'rgba(0,0,0,0.5)',
      bordercolor: 'rgba(255,255,255,0.3)',
      borderwidth: 1,
      font: {color: '#fff', size: 10}
    },
    shapes: shapes,
    annotations: annotations
  };
  
  Plotly.newPlot(coefficientsDiv, traces, layout, {
    displayModeBar: false,
    responsive: true
  });
}

// --- Show Stats ---
function showStats(stats, shape) {
  if (!stats) return;
  let html = `<b>MFCC Statistics</b><br>`;
  if (shape && Array.isArray(shape)) {
    html += `<b style="color:#00ffae">Shape: (${shape.join(' × ')})</b><br><br>`;
  }
  
  // Audio Properties
  html += `<b style="color:#ff00ff">Audio Properties:</b><br>`;
  html += `<span style="color:#00ffae">Duration:</span> ${stats.duration} sec<br>`;
  html += `<span style="color:#00ffae">Energy:</span> ${stats.energy.toFixed(6)}<br><br>`;
  
  // MFCC Coefficients Mean Values
  html += `<b style="color:#ff00ff">MFCC Mean Values:</b><br>`;
  html += `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; font-size: 0.9em;">`;
  for (let i = 0; i < stats.mean.length; i++) {
    html += `<span>C${i+1}: <b style="color:#00ffae">${stats.mean[i]}</b></span>`;
  }
  html += `</div><br>`;
  
  // MFCC Coefficients Std Dev Values
  html += `<b style="color:#ff00ff">MFCC Std Dev:</b><br>`;
  html += `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; font-size: 0.9em;">`;
  for (let i = 0; i < stats.std.length; i++) {
    html += `<span>C${i+1}: <b style="color:#00ffae">${stats.std[i]}</b></span>`;
  }
  html += `</div>`;
  
  statsBox.innerHTML = html;
}

// --- Download Buttons ---
if (downloadWavBtn) {
  console.log('Download WAV button found, attaching listener');
  downloadWavBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('⬇️ Download WAV button clicked');
    if (!audioBlob) {
      alert('No audio to download');
      return;
    }
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audio.wav';
    a.click();
    URL.revokeObjectURL(url);
  });
}

if (downloadMfccBtn) {
  console.log('Download MFCC button found, attaching listener');
  downloadMfccBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('⬇️ Download MFCC button clicked');
    if (!mfccData) {
      alert('No MFCC data to download');
      return;
    }
    let csv = mfccData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mfcc.csv';
    a.click();
    URL.revokeObjectURL(url);
  });
}

// --- Run Accelerator ---
if (runAcceleratorBtn) {
  console.log('Run Accelerator button found, attaching listener');
  runAcceleratorBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('⚡ Run Accelerator button clicked');
    if (!mfccData) {
      alert("Please extract MFCC first");
      return;
    }
    statusDiv.textContent = "⚡ Running accelerator...";
    runAcceleratorBtn.disabled = true;
    
    const backendUrls = [
      'http://127.0.0.1:5000/accelerate',
      'http://localhost:5000/accelerate'
    ];
    
    let lastError = null;
    let success = false;
    
    for (const url of backendUrls) {
      try {
        console.log('Trying accelerator URL:', url);
        const formData = new FormData();
        formData.append('mfcc', JSON.stringify(mfccData));
        const resp = await fetch(url, {
          method: 'POST',
          body: formData,
          mode: 'cors'
        });
        
        if (!resp.ok) {
          throw new Error(`Server responded with ${resp.status}`);
        }
        
        const result = await resp.json();
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        // Display detailed results
        let message = result.message || "Done";
        if (result.input_shape) {
          message += ` (${result.input_shape[0]}×${result.input_shape[1]} MFCCs)`;
        }
        if (result.accelerator_status) {
          message += ` - ${result.accelerator_status}`;
        }
        
        statusDiv.textContent = "✅ " + message;
        statusDiv.style.color = '#00ff64';
        console.log('Accelerator result:', result);
        success = true;
        break;
      } catch (err) {
        console.warn(`Failed to connect to ${url}:`, err.message);
        lastError = err;
      }
    }
    
    if (!success) {
      statusDiv.textContent = "⚠️ Accelerator error: " + (lastError?.message || "Backend not reachable");
      statusDiv.style.color = '#ff6b6b';
      console.error('All accelerator URLs failed. Last error:', lastError);
      alert("❌ Cannot connect to backend!\n\nPlease make sure:\n1. Backend server is running (python app.py)\n2. Server is running on port 5000");
    }
    
    runAcceleratorBtn.disabled = false;
  });
} else {
  console.warn('Run Accelerator button not found!');
}

if (downloadGraphBtn) {
  console.log('Download Graph button found, attaching listener');
  downloadGraphBtn.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('📊 Download Graph button clicked');
    if (mfccHeatmapDiv) {
      Plotly.downloadImage(mfccHeatmapDiv, {format: 'png', filename: 'mfcc_heatmap'});
    }
  });
}
}); // End of DOMContentLoaded event listener