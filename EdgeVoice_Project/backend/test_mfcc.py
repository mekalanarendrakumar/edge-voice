import librosa
import numpy as np
import sys

print("Testing MFCC extraction...")
print(f"Librosa version: {librosa.__version__}")
print(f"NumPy version: {np.__version__}")

# Create a simple test audio signal
duration = 1.0  # seconds
sr = 16000  # sample rate
t = np.linspace(0, duration, int(sr * duration))
# Simple sine wave at 440 Hz
y = 0.5 * np.sin(2 * np.pi * 440 * t)

print(f"\nGenerated test signal: {len(y)} samples at {sr} Hz")

try:
    # Try to extract MFCC
    print("\nExtracting MFCC...")
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    print(f"✓ MFCC extraction successful!")
    print(f"MFCC shape: {mfcc.shape}")
    
    # Test statistics
    stats = {
        'mean': np.mean(mfcc, axis=1).round(3).tolist(),
        'std': np.std(mfcc, axis=1).round(3).tolist(),
        'energy': float(np.sum(y ** 2) / len(y)),
        'duration': round(len(y) / sr, 2)
    }
    print(f"Stats calculated successfully!")
    print(f"Energy: {stats['energy']}")
    print(f"Duration: {stats['duration']} sec")
    
except Exception as e:
    print(f"✗ MFCC extraction failed!")
    print(f"Error: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n✓ All tests passed!")
