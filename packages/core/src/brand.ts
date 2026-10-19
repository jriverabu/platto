/**
 * Identidad visual de Platto.
 * Logo: el tenedor y el plato forman un botón de play (apps/web/public/icons/*.svg).
 * Lema: «Ve. Elige. Disfruta.»
 * Aspecto: noche (carbón profundo), un solo acento naranja, tipografía geométrica, tarjetas redondeadas.
 */
export const COLORS = {
  bg: '#0E0E10', // fondo de la app
  surface: '#18181B', // tarjetas
  surface2: '#222226', // campos, notas, elementos sobre tarjetas
  surface3: '#2C2C31', // botones secundarios, pistas
  line: '#29292E', // divisores
  lineStrong: '#3A3A41', // bordes de campos y chips
  text: '#F5F5F7',
  text2: '#B4B4BC', // texto secundario
  text3: '#8D8D96', // texto terciario (contraste ≥ 5:1 sobre el fondo)
  brand: '#FF5A1F', // naranja de marca: botón principal, selección, play del logo
  brandHi: '#FF7A45', // naranja para texto sobre fondo oscuro
  onBrand: '#FFFFFF',
  ok: '#6FD08C',
  warn: '#FFC15A',
  bad: '#FF8070',
  ink: '#1A1A1C', // trazo del logo sobre fondo claro
} as const;

export const FONTS = {
  /** Toda la interfaz. Google Fonts: Poppins 400, 500, 600, 700. */
  body: 'Poppins',
} as const;

export const TAGLINE = 'Ve. Elige. Disfruta.';

export const RADII = { chip: 999, card: 18, button: 14, input: 14 } as const;

/** Tamaño mínimo de cualquier elemento que se toca. */
export const TOUCH_TARGET = 44;
