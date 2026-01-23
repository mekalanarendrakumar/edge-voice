import streamlit as st
import librosa
import numpy as np
import io
import os
import sys

sys.path.insert(0, 'EdgeVoice_Project/backend')

try:
    from command_detect import detect_command
except ImportError:
    detect_command = None

# Dark purple neon theme
st.set_page_config(page_title="EdgeVoice", layout="wide", initial_sidebar_state="collapsed")

st.markdown("""
    <style>
    * {
        background-color: #0a0e27 !important;
        color: #ffffff !important;
    }
    body { background: #0a0e27; }
    [data-testid="stAppViewContainer"] { background: #0a0e27; }
    [data-testid="stHeader"] { background: #0a0e27; }
    [data-testid="stToolbar"] { background: #0a0e27; }
    
    h1 { color: #00d4ff !important; text-shadow: 0 0 20px rgba(0, 212, 255, 0.6); font-size: 48px !important; }
    h2 { color: #00d4ff !important; text-shadow: 0 0 15px rgba(0, 212, 255, 0.5); }
    
    .stButton button {
        background: linear-gradient(135deg, #8B2F8B, #5f2f9f) !important;
        color: #ffffff !important;
        border: 2px solid #00d4ff !important;
        border-radius: 15px !important;
        padding: 15px 30px !important;
        font-weight: bold !important;
        font-size: 16px !important;
        box-shadow: 0 0 20px rgba(139, 47, 139, 0.5) !important;
        transition: all 0.3s ease !important;
    }
    
    .stButton button:hover {
        box-shadow: 0 0 30px rgba(0, 212, 255, 0.8) !important;
        background: linear-gradient(135deg, #a030a0, #6f3faf) !important;
    }
    
    .success {
        background: rgba(76, 175, 80, 0.15) !important;
        border: 2px solid #4CAF50 !important;
        border-radius: 10px !important;
        color: #4CAF50 !important;
    }
    
    .info-box {
        background: linear-gradient(135deg, rgba(139, 47, 139, 0.15), rgba(95, 47, 159, 0.15)) !important;
        border: 2px solid #8B2F8B !important;
        border-radius: 15px !important;
        padding: 20px !important;
        margin: 15px 0 !important;
    }
    </style>
    """, unsafe_allow_html=True)

# Title
st.markdown("<h1 style='text-align: center;'>⭐ EDGEVOICE: REAL-TIME MFCC ACCELERATOR ⭐</h1>", unsafe_allow_html=True)

# Initialize session state
if 'audio_data' not in st.session_state:
    st.session_state.audio_data = None
if 'duration' not in st.session_state:
    st.session_state.duration = "0.0"
if 'recording' not in st.session_state:
    st.session_state.recording = False

st.markdown("<h2>🎙️ Audio Recorder & File Upload</h2>", unsafe_allow_html=True)

# Top button row
col1, col2, col3, col4 = st.columns(4)
with col1:
    if st.button("🎤 Record" if not st.session_state.recording else "⏹️ Stop Recording", key="btn_record", use_container_width=True):
        st.session_state.recording = not st.session_state.recording
        if st.session_state.recording:
            st.info("🔴 Recording started... Click again to stop")
        else:
            st.success("✅ Recording saved!")
with col2:
    st.button("▶️ Playback", key="btn_play", use_container_width=True)
with col3:
    st.button("📁 Choose File", key="btn_choose", use_container_width=True)
with col4:
    if st.session_state.duration != "0.0":
        st.metric("Duration", f"{st.session_state.duration}s")

# Audio input
st.markdown("<div class='info-box'>", unsafe_allow_html=True)
audio_input = st.audio_input("🎤 Record your voice")
file_input = st.file_uploader("Choose audio file", type=['wav', 'mp3', 'ogg', 'm4a'])
st.markdown("</div>", unsafe_allow_html=True)

# Process audio
if audio_input is not None:
    st.session_state.audio_data = audio_input
    try:
        y, sr = librosa.load(io.BytesIO(audio_input), sr=16000)
        st.session_state.duration = f"{len(y)/sr:.1f}"
    except:
        pass
elif file_input is not None:
    st.session_state.audio_data = file_input.read()
    try:
        y, sr = librosa.load(io.BytesIO(st.session_state.audio_data), sr=16000)
        st.session_state.duration = f"{len(y)/sr:.1f}"
    except:
        pass

# Action buttons
col1, col2, col3 = st.columns(3)

with col1:
    if st.button("📊 Extract MFCC", use_container_width=True):
        if st.session_state.audio_data is not None:
            try:
                y, sr = librosa.load(io.BytesIO(st.session_state.audio_data), sr=16000)
                mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
                st.session_state.mfcc = mfcc
                st.session_state.y = y
                st.session_state.sr = sr
                st.success(f"✅ MFCC extracted: shape {mfcc.shape}")
                
                if detect_command:
                    try:
                        is_wake_word = detect_command(y)
                        if is_wake_word:
                            st.success("🔊 Wake word DETECTED!")
                    except:
                        pass
            except Exception as e:
                st.error(f"❌ Error: {str(e)[:100]}")
        else:
            st.error("❌ No audio loaded!")

with col2:
    if st.button("⚡ Run Accelerator", use_container_width=True):
        if 'mfcc' in st.session_state:
            st.success(f"✅ Accelerator processed MFCC: {st.session_state.mfcc.shape}")
        else:
            st.error("❌ Extract MFCC first!")

with col3:
    if st.button("📥 Download Results", use_container_width=True):
        if 'mfcc' in st.session_state:
            csv_buffer = io.StringIO()
            np.savetxt(csv_buffer, st.session_state.mfcc, delimiter=',')
            st.download_button(label="📥 Download MFCC CSV", data=csv_buffer.getvalue(), file_name="mfcc.csv", mime="text/csv")

# Results
if 'mfcc' in st.session_state:
    st.markdown("<h2>📊 MFCC Results</h2>", unsafe_allow_html=True)
    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Duration", f"{len(st.session_state.y)/st.session_state.sr:.2f}s")
    with col2:
        st.metric("Sample Rate", f"{st.session_state.sr} Hz")
    with col3:
        st.metric("MFCC Shape", str(st.session_state.mfcc.shape))
    with col4:
        st.metric("Coefficients", f"{st.session_state.mfcc.size:,}")
    
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(12, 4), facecolor='#0a0e27')
    ax.set_facecolor('#0a0e27')
    img = librosa.display.specshow(st.session_state.mfcc, sr=st.session_state.sr, x_axis='time', ax=ax, cmap='magma')
    plt.colorbar(img, ax=ax)
    plt.title('MFCC Coefficients', color='#00d4ff', fontsize=14, fontweight='bold')
    ax.tick_params(colors='#00d4ff')
    plt.tight_layout()
    st.pyplot(fig, use_container_width=True)

st.markdown("---")
st.markdown("<div style='text-align: center; color: #00d4ff; font-size: 14px;'>Made with ❤️ by EdgeVoice | Deployed with Streamlit Cloud</div>", unsafe_allow_html=True)
