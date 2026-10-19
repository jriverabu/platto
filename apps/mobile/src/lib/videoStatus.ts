import type { VideoStatus } from '@platto/core';

export const VIDEO_STATUS: Record<VideoStatus, { label: string; tone: 'neutral' | 'warn' | 'ok' | 'bad' }> = {
  none: { label: 'Sin video', tone: 'neutral' },
  processing: { label: 'Procesando', tone: 'warn' },
  in_review: { label: 'En revisión', tone: 'warn' },
  approved: { label: 'Publicado', tone: 'ok' },
  rejected: { label: 'Necesita cambios', tone: 'bad' },
};
