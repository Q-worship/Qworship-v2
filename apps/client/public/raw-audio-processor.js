class RawAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // The AudioContext runs at 16kHz. 640 samples is a 40ms chunk: frequent
    // enough for fast interim transcription without excessive WebSocket frames.
    this.bufferSize = 640;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    
    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];
      
      if (this.bufferIndex >= this.bufferSize) {
        this.flush();
      }
    }

    return true;
  }

  flush() {
    // Convert Float32 to Int16 PCM
    // We assume the AudioContext is already at the target sample rate (e.g. 24kHz)
    // to avoid expensive interpolation in the worklet thread.
    const pcm16 = new Int16Array(this.bufferSize);
    
    for (let i = 0; i < this.bufferSize; i++) {
      let s = Math.max(-1, Math.min(1, this.buffer[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this.port.postMessage(pcm16);
    this.bufferIndex = 0;
  }
}

registerProcessor('raw-audio-processor', RawAudioProcessor);
