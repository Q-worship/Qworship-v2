class RawAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    
    // In an AudioWorklet, process() is called with 128 frames at a time.
    // We accumulate them until we reach our target buffer size.
    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];
      
      if (this.bufferIndex >= this.bufferSize) {
        this.flush();
      }
    }

    return true;
  }

  flush() {
    // We have `sampleRate` available globally in the AudioWorkletProcessor
    const inputSampleRate = sampleRate;
    const targetSampleRate = 24000;
    const ratio = Math.floor(inputSampleRate / targetSampleRate);
    const step = ratio > 0 ? ratio : 1;

    const pcm16 = new Int16Array(Math.floor(this.bufferSize / step));
    let outIndex = 0;
    
    for (let i = 0; i < this.bufferSize; i += step) {
      let s = Math.max(-1, Math.min(1, this.buffer[i]));
      // Convert Float32 to Int16 PCM
      pcm16[outIndex++] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Post the PCM16 buffer to the main thread
    this.port.postMessage(pcm16);
    this.bufferIndex = 0;
  }
}

registerProcessor('raw-audio-processor', RawAudioProcessor);
