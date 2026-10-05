/**
 * Validación del video de un plato antes de subirlo.
 * El servidor repite la validación de duración (Cloudflare Stream rechaza más de 10 s
 * y el webhook revisa la duración real); aquí se avisa al restaurante sin gastar datos.
 */
import { RULES } from './rules';

export interface VideoMeta {
  durationSeconds: number;
  width: number;
  height: number;
}

export type VideoIssueLevel = 'error' | 'warning';

export interface VideoIssue {
  code: 'TOO_LONG' | 'TOO_SHORT' | 'NOT_VERTICAL' | 'LOW_RESOLUTION';
  level: VideoIssueLevel;
  message: string;
}

export function checkVideo(meta: VideoMeta): VideoIssue[] {
  const issues: VideoIssue[] = [];
  const seconds = Math.round(meta.durationSeconds * 10) / 10;
  if (seconds > RULES.videoMaxSeconds) {
    issues.push({
      code: 'TOO_LONG',
      level: 'error',
      message: `Dura ${formatSeconds(seconds)}. Elige ${RULES.videoMaxSeconds} segundos o menos.`,
    });
  }
  if (seconds < RULES.videoMinSeconds) {
    issues.push({
      code: 'TOO_SHORT',
      level: 'error',
      message: `Dura ${formatSeconds(seconds)}. El mínimo es ${RULES.videoMinSeconds} segundos.`,
    });
  }
  if (meta.width > 0 && meta.height / meta.width < RULES.videoMinAspect) {
    issues.push({ code: 'NOT_VERTICAL', level: 'error', message: 'Graba en vertical (9:16).' });
  }
  if (meta.width > 0 && meta.width < RULES.videoRecommendedWidth) {
    issues.push({
      code: 'LOW_RESOLUTION',
      level: 'warning',
      message: `Resolución ${meta.width} × ${meta.height}. Se recomienda 1080 × 1920.`,
    });
  }
  return issues;
}

export function isVideoAcceptable(meta: VideoMeta): boolean {
  return checkVideo(meta).every((issue) => issue.level !== 'error');
}

/**
 * Ventana de recorte por defecto para un clip más largo que 10 s:
 * centrada, porque el plato suele estar mejor encuadrado en el medio de la toma.
 */
export function defaultTrimWindow(durationSeconds: number): { start: number; end: number } {
  if (durationSeconds <= RULES.videoMaxSeconds) return { start: 0, end: durationSeconds };
  const start = Math.round(((durationSeconds - RULES.videoMaxSeconds) / 2) * 10) / 10;
  return { start, end: start + RULES.videoMaxSeconds };
}

/** Ajusta una ventana arrastrada por el usuario para que quepa en el clip y dure máximo 10 s. */
export function clampTrimWindow(durationSeconds: number, start: number): { start: number; end: number } {
  const length = Math.min(RULES.videoMaxSeconds, durationSeconds);
  const safeStart = Math.min(Math.max(0, start), Math.max(0, durationSeconds - length));
  const rounded = Math.round(safeStart * 10) / 10;
  return { start: rounded, end: Math.round((rounded + length) * 10) / 10 };
}

export function formatSeconds(seconds: number): string {
  return `${String(Math.round(seconds * 10) / 10).replace('.', ',')} s`;
}
