// Logo de Platto en vector: el tenedor y el plato forman un botón de play.
// Mismos trazos que public/icons/*.svg; si cambias uno, cambia el otro.

const ORANGE = 'var(--brand)';

/** Isotipo: tenedor + plato + play. `ink` es el color del trazo (blanco sobre oscuro). */
export function LogoMark({ size = 96, ink = 'currentColor', title = 'Platto' }: { size?: number; ink?: string; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="56 64 412 388" role="img" aria-label={title}>
      <path d="M182 114 A170 170 0 1 1 146 365 C 128 345 118 325 118 300 V 250" fill="none" stroke={ink} strokeWidth="20" strokeLinecap="round" />
      <path d="M72 184 H165 V194 C165 226 140 236 128 258 H108 C96 236 72 226 72 194 Z" fill={ink} />
      <rect x="72" y="122" width="14" height="72" rx="7" fill={ink} />
      <rect x="98" y="122" width="14" height="72" rx="7" fill={ink} />
      <rect x="125" y="122" width="14" height="72" rx="7" fill={ink} />
      <rect x="151" y="122" width="14" height="72" rx="7" fill={ink} />
      <path d="M258 204 L258 308 L348 256 Z" fill={ORANGE} stroke={ORANGE} strokeWidth="24" strokeLinejoin="round" />
    </svg>
  );
}

/** Palabra PLATTO con la O de play. */
export function Wordmark({ height = 28, ink = 'currentColor' }: { height?: number; ink?: string }) {
  return (
    <svg height={height} viewBox="-6 -12 652 124" role="img" aria-label="Platto" style={{ display: 'block' }}>
      <g fill="none" stroke={ink} strokeWidth="20" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 100 V0 H44 A27 27 0 0 1 44 54 H9" />
        <path d="M110 0 V100 H165" />
        <path d="M200 100 L230 10 Q235 -4 240 10 L270 100 M213 68 H257" />
        <path d="M309 0 H373 M341 0 V100" />
        <path d="M412 0 H476 M444 0 V100" />
        <circle cx="574" cy="50" r="50" />
      </g>
      <path d="M564 34 L564 66 L592 50 Z" fill={ORANGE} stroke={ORANGE} strokeWidth="10" strokeLinejoin="round" />
    </svg>
  );
}

export const TAGLINE = 'Ve. Elige. Disfruta.';

export function Tagline({ size = 12 }: { size?: number }) {
  return (
    <span style={{ color: 'var(--brand)', fontSize: size, fontWeight: 600, letterSpacing: size * 0.32, textTransform: 'uppercase' }}>
      {TAGLINE}
    </span>
  );
}
