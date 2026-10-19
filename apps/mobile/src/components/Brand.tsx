// Logo de Platto: el tenedor y el plato forman un botón de play. Mismos trazos que apps/web/public/icons.
import { SvgXml } from 'react-native-svg';
import { C } from '@/lib/theme';

const mark = (ink: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="56 64 412 388"><path d="M182 114 A170 170 0 1 1 146 365 C 128 345 118 325 118 300 V 250" fill="none" stroke="${ink}" stroke-width="20" stroke-linecap="round"/><path d="M72 184 H165 V194 C165 226 140 236 128 258 H108 C96 236 72 226 72 194 Z" fill="${ink}"/><rect x="72" y="122" width="14" height="72" rx="7" fill="${ink}"/><rect x="98" y="122" width="14" height="72" rx="7" fill="${ink}"/><rect x="125" y="122" width="14" height="72" rx="7" fill="${ink}"/><rect x="151" y="122" width="14" height="72" rx="7" fill="${ink}"/><path d="M258 204 L258 308 L348 256 Z" fill="${C.brand}" stroke="${C.brand}" stroke-width="24" stroke-linejoin="round"/></svg>`;

const word = (ink: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -12 652 124"><g fill="none" stroke="${ink}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"><path d="M9 100 V0 H44 A27 27 0 0 1 44 54 H9"/><path d="M110 0 V100 H165"/><path d="M200 100 L230 10 Q235 -4 240 10 L270 100 M213 68 H257"/><path d="M309 0 H373 M341 0 V100"/><path d="M412 0 H476 M444 0 V100"/><circle cx="574" cy="50" r="50"/></g><path d="M564 34 L564 66 L592 50 Z" fill="${C.brand}" stroke="${C.brand}" stroke-width="10" stroke-linejoin="round"/></svg>`;

export function LogoMark({ size = 96, ink = C.text }: { size?: number; ink?: string }) {
  return <SvgXml xml={mark(ink)} width={size} height={(size * 388) / 412} accessibilityLabel="Platto" />;
}

export function Wordmark({ height = 24, ink = C.text }: { height?: number; ink?: string }) {
  return <SvgXml xml={word(ink)} height={height} width={(height * 652) / 124} accessibilityLabel="Platto" />;
}
