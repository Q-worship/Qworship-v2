class RawAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    // 320 samples at 16kHz = 20ms, Deepgram's lowest recommended streaming
    // chunk size. This minimizes capture buffering without excessive frames.
    this.bufferSize = 320;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.resamplePhase = 0;
    this.resampleSum = 0;
    this.resampleCount = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];
    
    for (let i = 0; i < channelData.length; i++) {
      const sample = channelData[i];
      if (sampleRate === this.targetSampleRate) {
        this.pushSample(sample);
        continue;
      }

      // Browsers may ignore the requested AudioContext rate and run at
      // 44.1/48kHz. Downsample to the exact 16kHz declared to Deepgram so audio
      // never arrives faster than real time and builds a transcription backlog.
      this.resampleSum += sample;
      this.resampleCount += 1;
      this.resamplePhase += this.targetSampleRate;
      if (this.resamplePhase >= sampleRate) {
        this.pushSample(this.resampleSum / this.resampleCount);
        this.resamplePhase -= sampleRate;
        this.resampleSum = 0;
        this.resampleCount = 0;
      }
    }

    return true;
  }

  pushSample(sample) {
    this.buffer[this.bufferIndex++] = sample;
    if (this.bufferIndex >= this.bufferSize) this.flush();
  }

  flush() {
    // Convert Float32 to Int16 PCM
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
