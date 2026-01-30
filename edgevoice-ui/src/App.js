import React, { useRef, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import './App.css';

function App() {
  const fileInputRef = useRef(null);
  const [audioFile, setAudioFile] = useState(null);
  const [waveform, setWaveform] = useState([]);
  const [mfcc, setMfcc] = useState([]);
  const [stats, setStats] = useState(null);
  const [mfccShape, setMfccShape] = useState('');
  const [wakeword, setWakeword] = useState(false);
  const [wakewordInfo, setWakewordInfo] = useState(null);
  const [status, setStatus] = useState('');
  const [activeBackend, setActiveBackend] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [micChunks, setMicChunks] = useState([]);
  const [showExtractBtn, setShowExtractBtn] = useState(false);

  const handleMicRecord = async () => {
    if (!isRecording) {
      if (!navigator.mediaDevices) {
        setStatus('Microphone not supported.');
        return;
      }
      setStatus('Recording...');
      const newChunks = [];
      setMicChunks([]);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);
      recorder.ondataavailable = e => {
        newChunks.push(e.data);
        setMicChunks(prev => [...prev, e.data]);
      };
      recorder.onstop = () => {
        const blob = new Blob(newChunks, { type: 'audio/wav' });
        setAudioFile(blob);
        drawWaveform(blob);
        setStatus('Recording stopped. Ready to extract MFCC.');
        setShowExtractBtn(true);
      };
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } else {
      if (mediaRecorder) mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const drawWaveform = (file) => {
    const reader = new window.FileReader();
    reader.onload = function (ev) {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.decodeAudioData(ev.target.result, (decoded) => {
        const data = decoded.getChannelData(0);
        const downsample = Math.max(1, Math.floor(data.length / 400));
        const sampled = Array.from({ length: Math.floor(data.length / downsample) }, (_, i) => data[i * downsample]);
        setWaveform(sampled);
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleChooseFile = (e) => {
    console.log('File input change event triggered');
    console.log('Files:', e.target.files);
    if (e.target.files && e.target.files[0]) {
      console.log('File selected:', e.target.files[0].name);
      setShowExtractBtn(true);
      console.log('showExtractBtn set to true');
      setAudioFile(e.target.files[0]);
      setStatus(`Selected: ${e.target.files[0].name}`);
      drawWaveform(e.target.files[0]);
      // Clear previous results
      setMfcc([]);
      setStats(null);
      setWakeword(false);
      setWakewordInfo(null);
      setMfccShape('');
    } else {
      console.log('No file selected');
    }
  };

  const handleExtractMfcc = async () => {
    if (!audioFile) {
      setStatus('Please choose an audio file first.');
      return;
    }
    const formData = new FormData();
    formData.append('audio', audioFile);
    const backendUrls = [
      'https://edge-voice.onrender.com/upload',
      'http://127.0.0.1:5000/upload',
      'http://localhost:5000/upload'
    ];
    let lastErr = null;

    for (const url of backendUrls) {
      try {
        setStatus(`Extracting MFCC from ${url} ...`);
        const resp = await fetch(url, { method: 'POST', body: formData });
        if (!resp.ok) throw new Error(`Server responded ${resp.status}`);
        const result = await resp.json();
        setActiveBackend(url);
        setMfcc(result.mfcc || []);
        setStats(result.stats || null);
        setMfccShape(result.shape ? `MFCC Shape: (${result.shape.join(', ')})` : '');
        if (result.wake_word) {
          setWakeword(true);
          setWakewordInfo({
            keyword: result.keyword,
            confidence: result.confidence,
            timestamp: result.timestamp,
          });
        } else {
          setWakeword(false);
          setWakewordInfo(null);
        }
        setStatus('MFCC extracted successfully');
        return;
      } catch (err) {
        lastErr = err;
        setStatus(`Error contacting ${url}: ${err.message}`);
      }
    }

    setStatus(`Error extracting MFCC. Backend unreachable. Last error: ${lastErr ? lastErr.message : 'unknown'}`);
  };

  return (
    <div className="edgevoice-page">
      <div className="edgevoice-bg-anim" />
      <div className="edgevoice-container">
        <div className="edgevoice-header neon-glow">EdgeVoice: Real-Time MFCC Accelerator</div>
        <div className="edgevoice-top-controls">
          <input type="file" accept="audio/*" className="hidden" ref={fileInputRef} onChange={handleChooseFile} />
          <button
            className="edgevoice-btn btn-animated neon-glow"
            onClick={handleMicRecord}
            style={{
              background: isRecording ? 'linear-gradient(90deg,#00cfff 0%,#ff0080 100%)' : undefined,
              boxShadow: isRecording ? '0 0 32px #00fff0,0 0 64px #fff' : undefined,
            }}
          >
            {isRecording ? 'Stop Recording' : 'Record Voice'}
          </button>
          <button
            className="edgevoice-btn btn-animated neon-glow"
            onClick={() => {
              console.log('Select File button clicked');
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
          >
            Select File
          </button>
          {showExtractBtn && (
            <button className="edgevoice-btn btn-animated neon-glow selected" onClick={handleExtractMfcc}>
              Extract MFCC
            </button>
          )}
        </div>

        <div className="edgevoice-status">{status}</div>
        {activeBackend && (
          <div className="edgevoice-shape">Connected to backend: {activeBackend}</div>
        )}
        <div className="edgevoice-shape">{mfccShape}</div>

        {/* MFCC Results Panel */}
        {mfcc.length > 0 && (
          <>
            <div className="ev-results-title">MFCC extracted successfully</div>
            
            {/* Raw Audio Waveform */}
            <div className="ev-waveform-panel neon-glow">
              <div className="ev-panel-title">Raw Audio Waveform</div>
              <div className="ev-waveform-plot">
                {waveform.length > 0 && (
                  <Plot
                    data={[
                      {
                        y: waveform,
                        type: 'scatter',
                        mode: 'lines',
                        line: { color: '#fff', width: 2 },
                        fill: 'tozeroy',
                        fillcolor: 'rgba(255,255,255,0.3)',
                      },
                    ]}
                    layout={{
                      paper_bgcolor: 'rgba(0,0,0,0.3)',
                      plot_bgcolor: 'transparent',
                      height: 150,
                      margin: { t: 10, b: 30, l: 40, r: 10 },
                      xaxis: { color: '#fff', tickfont: { color: '#fff' }, gridcolor: 'rgba(255,255,255,0.1)' },
                      yaxis: { color: '#fff', tickfont: { color: '#fff' }, gridcolor: 'rgba(255,255,255,0.1)' },
                    }}
                    config={{ displayModeBar: false }}
                  />
                )}
              </div>
            </div>

            {/* MFCC Feature Heatmap */}
            <div className="ev-heatmap-panel neon-glow-cyan">
              <div className="ev-heatmap-title">MFCC Feature Heatmap</div>
              <div className="ev-heatmap-plot">
                <Plot
                  data={[{ z: mfcc, type: 'heatmap', colorscale: 'Jet' }]}
                  layout={{
                    paper_bgcolor: 'rgba(0,0,0,0.3)',
                    plot_bgcolor: 'transparent',
                    height: 300,
                    margin: { t: 10, b: 40, l: 50, r: 80 },
                    xaxis: { title: 'Time Frames', color: '#fff', tickfont: { color: '#fff' } },
                    yaxis: { title: 'MFCC Coefficients', color: '#fff', tickfont: { color: '#fff' } },
                  }}
                  config={{ displayModeBar: false }}
                />
              </div>
            </div>

            {/* MFCC Statistics */}
            {stats && (
              <div className="ev-stats-panel neon-glow">
                <div className="ev-panel-title">MFCC Statistics</div>
                <div className="ev-stats-content">
                  <div><strong>MFCC Mean (first 5):</strong> {stats.mean?.slice(0, 5).map(x => x.toFixed(3)).join(', ')}</div>
                  <div><strong>MFCC Std (first 5):</strong> {stats.std?.slice(0, 5).map(x => x.toFixed(3)).join(', ')}</div>
                  <div><strong>Energy:</strong> {stats.energy?.toFixed(4) || 0}</div>
                  <div><strong>Duration:</strong> {stats.duration?.toFixed(2) || 0} sec</div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Live Microphone Streaming */}
        <div className="ev-mic-panel neon-glow">
          <div className="ev-mic-title">Live Microphone Streaming</div>
          <div className="ev-mic-waveform">
            {waveform.length > 0 && !mfcc.length && (
              <Plot
                data={[
                  {
                    y: waveform,
                    type: 'scatter',
                    mode: 'lines',
                    line: { color: '#fff', width: 3 },
                    fill: 'tozeroy',
                    fillcolor: 'rgba(255,0,128,0.3)',
                  },
                ]}
                layout={{
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  height: 80,
                  margin: { t: 10, b: 10, l: 10, r: 10 },
                  xaxis: { visible: false },
                  yaxis: { visible: false },
                }}
                config={{ displayModeBar: false }}
              />
            )}
          </div>
        </div>

        {mfcc.length > 0 && (
          <div className="ev-heatmap-panel neon-glow-cyan">
            <div className="ev-heatmap-title">Real-Time MFCC Heatmap</div>
            <div className="ev-heatmap-plot">
              <Plot
                data={[{ z: mfcc, type: 'heatmap', colorscale: 'Viridis' }]}
                layout={{
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  height: 220,
                  margin: { t: 10, b: 30, l: 50, r: 10 },
                  xaxis: { title: 'Time Frames', color: '#fff', tickfont: { color: '#fff' } },
                  yaxis: { title: 'MFCC Coefficients', color: '#fff', tickfont: { color: '#fff' } },
                }}
                config={{ displayModeBar: false }}
              />
              {wakeword && wakewordInfo && (
                <div className="ev-heatmap-ww-box">
                  <span className="ev-ww-label">Wake Word Detected!</span>
                  <span className="ev-ww-green">✔️</span>
                  <br />
                  Keyword Detected: <span className="ev-ww-key">⚡ {wakewordInfo.keyword || 'Hey Voice!'}</span>
                  <br />
                  Confidence: <span className="ev-ww-green">{wakewordInfo.confidence || '--'}%</span>
                  <br />
                  Timestamp: <span className="ev-ww-yellow">{wakewordInfo.timestamp || '--'}ms</span>
                </div>
              )}
            </div>
          </div>
        )}

        {wakeword && wakewordInfo && (
          <div className="ev-ww-panel neon-glow-green">
            <div className="ev-ww-label">WAKE WORD DETECTED!</div>
            <div>
              Keyword Detected: <span className="ev-ww-key">⚡ {wakewordInfo.keyword || 'Hey Voice!'}</span>
              <br />
              Confidence: <span className="ev-ww-green">{wakewordInfo.confidence || '--'}%</span>
              <br />
              Timestamp: <span className="ev-ww-yellow">{wakewordInfo.timestamp || '--'}ms</span>
            </div>
            <div className="ev-ww-icon">
              <img src="https://raw.githubusercontent.com/mekalaban/edgevoice-assets/main/speaker-neon.png" alt="Speaker" />
            </div>
          </div>
        )}

        {stats && (
          <div className="ev-stats-panel neon-glow">
            <div className="ev-stats-list">
              <div style={{ color: '#ffb6ff', fontWeight: 700, fontSize: '1.3rem', marginBottom: '0.7em' }}>
                MFCC Statistics
              </div>
              {stats.mean && stats.std && stats.mean.map((mean, i) => (
                <div key={i}>{`C${i + 1}: min=${(mean - (stats.std[i] || 0)).toFixed(2)}, max=${(mean + (stats.std[i] || 0)).toFixed(2)}, mean=${mean}`}</div>
              ))}
            </div>
            <div className="ev-stats-downloads">
              <button
                className="ev-stats-download-btn btn-animated neon-glow-cyan"
                onClick={() => {
                  if (!mfcc) return;
                  const csv = mfcc.map(row => row.join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'mfcc.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download MFCC (CSV)
              </button>
              <button
                className="ev-stats-download-btn btn-animated neon-glow-cyan"
                onClick={() => {
                  const plotDiv = document.querySelector('.ev-heatmap-plot .js-plotly-plot');
                  if (plotDiv && window.Plotly) {
                    window.Plotly.downloadImage(plotDiv, { format: 'png', filename: 'mfcc_heatmap' });
                  }
                }}
              >
                Download Graph (PNG)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
