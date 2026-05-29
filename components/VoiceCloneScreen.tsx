"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import GhostOrb from "./GhostOrb";
import GlowButton from "./GlowButton";
import { useApp } from "@/lib/appState";

interface VoiceCloneScreenProps {
  onComplete: () => void;
}

export default function VoiceCloneScreen({ onComplete }: VoiceCloneScreenProps) {
  const { state, dispatch } = useApp();
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isUploading, setIsUploading] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  }, [recording]);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgba(139, 108, 246, ${Math.max(0.1, barHeight / 255)})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;

      const audioCtx = new window.AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setRecordedBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        if (audioContextRef.current) audioContextRef.current.close();
      };

      mediaRecorder.start();
      setRecording(true);
      setTimeLeft(45);
      drawWaveform();
    } catch (error) {
      console.error("Microphone access denied", error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recording) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recording, stopRecording]);

  const handleUpload = async () => {
    if (!recordedBlob) return;
    setIsUploading(true);

    try {
      let currentUserId = state.user.id;
      if (!currentUserId) {
        const { v4: uuidv4 } = await import("uuid");
        currentUserId = uuidv4();
        dispatch({ type: "SET_USER_ID", id: currentUserId });
      }
      
      const formData = new FormData();
      formData.append("audio", recordedBlob, "voice_sample.webm");
      formData.append("userId", currentUserId);
      formData.append("name", state.user.name || "Ghost User");

      const res = await fetch("/api/elevenlabs/add-voice", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Voice cloning failed");
      
      const data = await res.json();
      if (data.voiceId) {
        dispatch({ type: "SET_VOICE_ID", voiceId: data.voiceId });
      }
      onComplete();
    } catch (e) {
      console.error(e);
      // Even if it fails, we move forward so the user isn't stuck
      onComplete();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 bg-ghost-bg overflow-hidden text-center select-none">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="mb-8"
      >
        <GhostOrb size="hero" animate isThinking={recording} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-light text-ghost-text mb-2 tracking-tight"
      >
        Speak for 30 seconds.
      </motion.h2>
      
      <motion.p
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-[14px] text-ghost-text-secondary font-light max-w-sm mb-10 leading-relaxed"
      >
        What you're building. What scares you. Just talk.
      </motion.p>

      <div className="w-full max-w-sm h-16 mb-8 flex justify-center">
        <canvas ref={canvasRef} width={300} height={64} className="opacity-80" />
      </div>

      <div className="flex flex-col items-center gap-4">
        {!recording && !recordedBlob && (
          <GlowButton onClick={startRecording} size="lg">
            Start Recording
          </GlowButton>
        )}
        
        {recording && (
          <div className="flex flex-col items-center gap-3">
            <span className="text-[11px] font-medium text-ghost-accent tracking-[0.2em] uppercase">{timeLeft}s remaining</span>
            <GlowButton onClick={stopRecording} size="lg">
              Stop Recording
            </GlowButton>
          </div>
        )}

        {recordedBlob && (
          <GlowButton onClick={handleUpload} disabled={isUploading} size="lg">
            {isUploading ? "Cloning Voice..." : "Create My Future Voice"}
          </GlowButton>
        )}

        <button 
          onClick={onComplete}
          className="mt-4 text-[11px] uppercase tracking-[0.1em] text-ghost-muted hover:text-ghost-text transition-colors cursor-pointer"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
