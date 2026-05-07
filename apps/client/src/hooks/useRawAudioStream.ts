import { useState, useRef, useCallback } from "react";

export const useRawAudioStream = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startRecording = useCallback(
    async (onAudioData: (pcmBuffer: Int16Array) => void) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 48000, // Browser's native high quality
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        streamRef.current = stream;

        const audioContext = new (
          window.AudioContext || (window as any).webkitAudioContext
        )({
          sampleRate: 16000,
        });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        // --- Volume Analyser Setup ---
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVolume = () => {
          if (!analyserRef.current || !isRecording) return;
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
        updateVolume(); // Start the loop

        // --- Raw Audio Processor Setup ---
        await audioContext.audioWorklet.addModule("/raw-audio-processor.js");
        const workletNode = new AudioWorkletNode(audioContext, "raw-audio-processor");
        workletNodeRef.current = workletNode;

        workletNode.port.onmessage = (e) => {
          onAudioData(e.data); // Receives Int16Array from worklet
        };

        source.connect(workletNode);
        workletNode.connect(audioContext.destination); // Required by some browsers to keep the node alive

        setIsRecording(true);
      } catch (err) {
        console.error("Failed to start raw audio stream:", err);
        setIsRecording(false);
        throw err;
      }
    },
    [isRecording],
  );

  const stopRecording = useCallback(() => {
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

  return { isRecording, volume, startRecording, stopRecording };
};
