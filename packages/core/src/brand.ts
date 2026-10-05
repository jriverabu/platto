/**
 * Identidad visual de Platto, la misma del prototipo de diseño.
 * Concepto: la comanda de cocina. Fondo carbón para el comensal (noche de salida),
 * papel hueso para el restaurante (modo cocina), un solo acento: brasa.
 */
export const COLORS = {
  carbon: '#13110F', // fondo del comensal, texto sobre papel
  carbonRaised: '#1F1B18', // tarjetas sobre carbón
  carbonLine: '#2B2622', // divisores sobre carbón
  hueso: '#F3EEE6', // papel: tiquetes y fondo del restaurante
  huesoRaised: '#FFFFFF',
  huesoLine: '#E2D9CC',
  humo: '#A39A90', // texto secundario sobre carbón (contraste 6,7:1)
  tinta: '#6B6259', // texto secundario sobre hueso (contraste 5:1)
  brasa: '#FF5B2E', // acento: botones principales, progreso, selección
  brasaTexto: '#B8330D', // brasa legible sobre papel (5,3:1)
  brasaSobreCarbon: '#FF7A52', // precios sobre carbón (7,4:1)
  hoja: '#B9E36A', // confirmado, abierto, activo (sobre carbón)
  hojaTexto: '#2F5A12', // confirmado sobre papel
  alerta: '#8A2A0B', // rechazado, no asistió, vence pronto (sobre papel)
} as const;

export const FONTS = {
  /** Titulares en mayúscula, como un tablero de menú. Google Fonts: Big Shoulders Display 800/900. */
  display: 'BigShouldersDisplay',
  /** Texto de interfaz. Google Fonts: Figtree 400–700. */
  body: 'Figtree',
  /** Precios, horas y etiquetas de tiquete. Google Fonts: DM Mono 400/500. */
  mono: 'DMMono',
} as const;

export const RADII = { chip: 999, card: 16, button: 14, input: 12 } as const;

/** Tamaño mínimo de cualquier elemento que se toca. */
export const TOUCH_TARGET = 44;
