import { useState, useRef, useCallback } from "react";

export const useRawAudioStream = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silentGainRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingActiveRef = useRef(false);

  const startRecording = useCallback(
    async (onAudioData: (pcmBuffer: Int16Array) => void) => {
      try {
        console.info("[HFB Audio][1/5] Requesting microphone permission");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 48000, // Browser's native high quality
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        streamRef.current = stream;
        const audioTrack = stream.getAudioTracks()[0];
        console.info("[HFB Audio][1/5] Microphone acquired", {
          label: audioTrack?.label || "(browser hid device label)",
          enabled: audioTrack?.enabled,
          muted: audioTrack?.muted,
          readyState: audioTrack?.readyState,
          settings: audioTrack?.getSettings?.(),
        });

        const audioContext = new (
          window.AudioContext || (window as any).webkitAudioContext
        )({
          sampleRate: 16000,
        });
        audioContextRef.current = audioContext;
        // Safari can create an AudioContext in the suspended state even when
        // getUserMedia succeeded. A suspended context produces no worklet
        // frames, while the UI still appears connected.
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }
        if (audioContext.state !== "running") {
          throw new Error(`Audio input could not start (${audioContext.state})`);
        }
        console.info("[HFB Audio][2/5] AudioContext running", {
          requestedSampleRate: 16000,
          actualSampleRate: audioContext.sampleRate,
          state: audioContext.state,
        });

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        // --- Volume Analyser Setup ---
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
          if (!analyserRef.current || !recordingActiveRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;

          // Map average (0-255) to a smoother 0-100 percentage for the UI
          const percentage = Math.min(100, Math.max(0, (average / 128) * 100));
          setVolume(percentage);

          animationFrameRef.current = requestAnimationFrame(updateVolume);
        };
        // --- Raw Audio Processor Setup ---
        await audioContext.audioWorklet.addModule("/raw-audio-processor.js");
        const workletNode = new AudioWorkletNode(audioContext, "raw-audio-processor");
        workletNodeRef.current = workletNode;

        let chunkCount = 0;
        workletNode.port.onmessage = (e) => {
          const pcm = e.data as Int16Array;
          chunkCount += 1;
          if (chunkCount === 1 || chunkCount % 25 === 0) {
            let sumSquares = 0;
            let peak = 0;
            for (let i = 0; i < pcm.length; i++) {
              const sample = pcm[i];
              sumSquares += sample * sample;
              peak = Math.max(peak, Math.abs(sample));
            }
            console.info("[HFB Audio][3/5] Worklet PCM", {
              chunk: chunkCount,
              samples: pcm.length,
              bytes: pcm.byteLength,
              rms: Math.round(Math.sqrt(sumSquares / Math.max(1, pcm.length))),
              peak,
            });
          }
          onAudioData(pcm);
        };

        source.connect(workletNode);
        // Some browsers stop processing an unconnected worklet. Keep it in the
        // render graph through a muted gain node without feeding mic audio back
        // through the speakers.
        const silentGain = audioContext.createGain();
        silentGain.gain.value = 0;
        silentGainRef.current = silentGain;
        workletNode.connect(silentGain);
        silentGain.connect(audioContext.destination);

        recordingActiveRef.current = true;
        setIsRecording(true);
        updateVolume();
      } catch (err) {
        console.error("[HFB Audio] Failed to start raw audio stream:", err);
        recordingActiveRef.current = false;
        setIsRecording(false);
        throw err;
      }
    },
    [],
  );

  const stopRecording = useCallback(() => {
    console.info("[HFB Audio] Stopping microphone stream");
    recordingActiveRef.current = false;
    setIsRecording(false);
    setVolume(0);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current.port.onmessage = null;
      workletNodeRef.current = null;
    }

    if (silentGainRef.current) {
      silentGainRef.current.disconnect();
      silentGainRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  return {
    isRecording, volume, startRecording, stopRecording,
  };
};
