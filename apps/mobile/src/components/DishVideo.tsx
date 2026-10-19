// Video de un plato (máximo 10 s, en bucle y en silencio por defecto) con expo-video.
// Solo reproduce cuando `active`; reporta el progreso y los segundos vistos para las estadísticas.
import { useEffect, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { RULES } from '@platto/core';
import type { VideoFile } from '@platto/demo';
import { videoSource } from '@/lib/videos';

interface Props {
  video: VideoFile;
  active: boolean;
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
  onProgress?: (fraction: number) => void;
  onWatched?: (seconds: number) => void;
}

export function DishVideo({ video, active, muted = true, style, onProgress, onWatched }: Props) {
  const length = Math.min(RULES.videoMaxSeconds, video.duration || RULES.videoMaxSeconds);
  const player = useVideoPlayer(videoSource(video.src), (p) => {
    p.loop = true;
    p.muted = true;
    p.timeUpdateEventInterval = 0.25;
  });
  const watched = useRef(0);

  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  useEffect(() => {
    if (active) {
      player.currentTime = video.trimStart;
      player.play();
      watched.current = 0;
      return () => {
        player.pause();
        if (watched.current > 0) onWatched?.(Math.min(length, watched.current));
      };
    }
    player.pause();
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, player]);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const t = Math.max(0, currentTime - video.trimStart);
    // El recorte de 10 s: si el archivo es más largo, vuelve al inicio de la ventana.
    if (t > length) player.currentTime = video.trimStart;
    watched.current = Math.max(watched.current, Math.min(length, t));
    onProgress?.(Math.min(1, t / length));
  });

  return <VideoView player={player} style={[StyleSheet.absoluteFill, style]} contentFit="cover" nativeControls={false} allowsPictureInPicture={false} />;
}
