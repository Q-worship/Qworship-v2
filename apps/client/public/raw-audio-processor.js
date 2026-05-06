class RawAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // OPTIMIZATION: Reduce buffer size from 4096 to 1024.
    // At 48kHz, 1024 samples = ~21ms. This sends audio to the server much faster.
    this.bufferSize = 1024;
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
