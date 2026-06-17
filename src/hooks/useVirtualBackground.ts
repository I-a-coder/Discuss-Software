"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { renderVirtualFrame, type BgPresetId } from "@/lib/background-presets";

export type BackgroundEffect = BgPresetId;

export function getRecorderMimeType(): string | undefined {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "audio/webm;codecs=opus",
    "audio/webm",
  ];
  for (const t of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return undefined;
}

export function buildRecordingStream(
  videoStream: MediaStream | null,
  audioStream: MediaStream | null
): MediaStream | null {
  const tracks: MediaStreamTrack[] = [];
  if (videoStream) {
    videoStream.getVideoTracks().forEach((t) => tracks.push(t.clone()));
  }
  const audioSource = audioStream || videoStream;
  if (audioSource) {
    audioSource.getAudioTracks().forEach((t) => tracks.push(t.clone()));
  }
  if (tracks.length === 0) return null;
  return new MediaStream(tracks);
}

export function useVirtualBackground(
  rawStream: MediaStream | null,
  effect: BackgroundEffect,
  active: boolean,
  customBackgroundSrc?: string | null
) {
  const [processedStream, setProcessedStream] = useState<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setProcessedStream(null);
  }, []);

  useEffect(() => {
    stop();
    if (!rawStream || !active || effect === "none") {
      setProcessedStream(null);
      return;
    }

    const video = document.createElement("video");
    video.srcObject = rawStream;
    video.muted = true;
    video.playsInline = true;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: false });
    const maskCanvas = document.createElement("canvas");
    if (!ctx) return;
    const customImage = new Image();
    let customReady = false;
    if (customBackgroundSrc) {
      customImage.src = customBackgroundSrc;
      customImage.onload = () => {
        customReady = true;
      };
    }

    let running = true;
    let streamSet = false;

    const draw = () => {
      if (!running) return;
      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const w = video.videoWidth || 640;
      const h = video.videoHeight || 480;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      renderVirtualFrame(
        ctx,
        video,
        w,
        h,
        effect,
        maskCanvas,
        customReady ? customImage : null
      );

      if (!streamSet) {
        streamSet = true;
        const out = canvas.captureStream(24);
        rawStream.getAudioTracks().forEach((t) => out.addTrack(t));
        setProcessedStream(out);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    video.onloadeddata = () => {
      video.play().catch(() => {});
      draw();
    };

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      video.srcObject = null;
      setProcessedStream(null);
    };
  }, [rawStream, effect, active, customBackgroundSrc, stop]);

  const displayStream =
    active && effect !== "none" && processedStream ? processedStream : rawStream;

  return { displayStream, stop };
}
