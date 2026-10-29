// public/tts-worker.js
import { KokoroTTS } from 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm';

let tts = null;

self.onmessage = async (event) => {
  const { text } = event.data;

  try {
    if (!tts) {
      self.postMessage({ type: 'status', message: 'Downloading AI Voice (80MB)...' });
      tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
        dtype: "q8",
        device: "wasm", // Force WASM to avoid WebGL context limits in workers
      });
    }

    self.postMessage({ type: 'status', message: 'Generating Audio...' });
    const audio = await tts.generate(text, { voice: "af_bella" });
    
    // Convert to WAV array buffer to send back to main thread
    const blob = audio.toWav();
    const arrayBuffer = await blob.arrayBuffer();
    
    self.postMessage({ type: 'audio', buffer: arrayBuffer }, [arrayBuffer]);
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
};