import { useEffect, useRef } from 'react';
import { RULES } from '@platto/core';
import type { VideoFile } from '../data/model';

let globalMuted = true;
const muteListeners = new Set<(m: boolean) => void>();
export function setMuted(m: boolean) {
  globalMuted = m;
  muteListeners.forEach((l) => l(m));
}
export function isMuted() {
  return globalMuted;
}
export function onMutedChange(l: (m: boolean) => void) {
  muteListeners.add(l);
  return () => muteListeners.delete(l);
}

interface Props {
  video: VideoFile;
  /** Solo el video visible se reproduce. */
  active: boolean;
  className?: string;
  /** Avance de 0 a 1 dentro de la ventana de 10 segundos. */
  onProgress?: (fraction: number) => void;
  /** Segundos vistos cuando el video deja de estar activo. */
  onWatched?: (seconds: number) => void;
  label?: string;
}

/**
 * Reproduce un video de plato en bucle, en silencio por defecto, respetando la
 * ventana de 10 s elegida al subirlo (trimStart). Mismo comportamiento que tendrá expo-video.
 */
export function DishVideo({ video, active, className, onProgress, onWatched, label }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const watched = useRef(0);
  const lastTime = useRef<number | null>(null);
  const length = Math.min(RULES.videoMaxSeconds, video.duration || RULES.videoMaxSeconds);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = globalMuted;
    return onMutedChange((m) => {
      el.muted = m;
    });
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (active) {
      if (el.currentTime < video.trimStart || el.currentTime > video.trimStart + length) el.currentTime = video.trimStart;
      el.play().catch(() => {
        // El navegador bloqueó el autoplay con sonido: reintenta en silencio.
        el.muted = true;
        el.play().catch(() => undefined);
      });
    } else {
      el.pause();
      if (watched.current > 0) onWatched?.(Math.min(length, watched.current));
      watched.current = 0;
      lastTime.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, video.src]);

  useEffect(() => {
    if (!active || !onProgress) return;
    let raf = 0;
    const loop = () => {
      const el = ref.current;
      if (el) {
        const t = el.currentTime - video.trimStart;
        onProgress(Math.max(0, Math.min(1, t / length)));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, onProgress, video.trimStart, length]);

  const onTimeUpdate = () => {
    const el = ref.current;
    if (!el) return;
    if (lastTime.current !== null && el.currentTime > lastTime.current) watched.current += el.currentTime - lastTime.current;
    lastTime.current = el.currentTime;
    if (el.currentTime >= video.trimStart + length - 0.05) {
      el.currentTime = video.trimStart;
      lastTime.current = video.trimStart;
    }
  };

  return (
    <video
      ref={ref}
      className={className}
      src={video.src}
      poster={video.poster ?? undefined}
      muted
      playsInline
      loop
      preload={active ? 'auto' : 'metadata'}
      onTimeUpdate={onTimeUpdate}
      aria-label={label}
    />
  );
}
