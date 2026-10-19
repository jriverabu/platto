// Íconos de trazo (24 × 24), los mismos de la web. `currentColor` toma el color del prop.
import type { ColorValue } from 'react-native';
import { SvgXml } from 'react-native-svg';

const PATHS: Record<string, string> = {
  back: `<path d="M15 5l-7 7 7 7" />`,
  close: `<path d="M6 6l12 12" /><path d="M18 6L6 18" />`,
  search: `<circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" />`,
  play: `<rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10.5 9.5v5l4-2.5z" fill="currentColor" />`,
  calendar: `<rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 3v4" /><path d="M16 3v4" />`,
  user: `<circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />`,
  bookmark: `<path d="M6 3h12v18l-6-4-6 4z" />`,
  bookmarkFill: `<path d="M6 3h12v18l-6-4-6 4z" fill="currentColor" />`,
  share: `<path d="M4 12v8h16v-8" /><path d="M12 3v12" /><path d="M7 8l5-5 5 5" />`,
  muted: `<path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9l5 6" /><path d="M22 9l-5 6" />`,
  sound: `<path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 8.5a5 5 0 0 1 0 7" /><path d="M19.5 6a8.5 8.5 0 0 1 0 12" />`,
  star: `<path d="M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.7 6.4 20l1.5-6.3L3 9.5 9.4 9z" />`,
  starFill: `<path d="M12 3l2.6 6 6.4.5-4.9 4.2 1.5 6.3L12 16.7 6.4 20l1.5-6.3L3 9.5 9.4 9z" fill="currentColor" />`,
  check: `<path d="M5 12l5 5 9-10" />`,
  clock: `<circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2" /><path d="M9 2h6" />`,
  pin: `<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" />`,
  inbox: `<rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18" /><path d="M8 3v4" /><path d="M16 3v4" />`,
  menu: `<rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10.5 9.5v5l4-2.5z" fill="currentColor" />`,
  account: `<path d="M4 7h16v12H4z" /><path d="M4 11h16" /><path d="M8 3h8" />`,
  minus: `<path d="M5 12h14" />`,
  plus: `<path d="M12 5v14" /><path d="M5 12h14" />`,
  upload: `<path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" />`,
  shield: `<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" /><path d="M9 12l2 2 4-4" />`,
  flag: `<path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" />`,
  store: `<path d="M3 9l2-5h14l2 5" /><path d="M4 9v11h16V9" /><path d="M9 20v-6h6v6" />`,
  bell: `<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" />`,
  chevron: `<path d="M9 5l7 7-7 7" />`,
  trash: `<path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" />`,
  edit: `<path d="M4 20h4L20 8l-4-4L4 16z" />`,
  fast: `<path d="M4 6l7 6-7 6z" /><path d="M13 6l7 6-7 6z" />`,
  reset: `<path d="M4 4v6h6" /><path d="M5 15a8 8 0 1 0 2-8.5L4 10" />`,
  home: `<path d="M4 11l8-7 8 7" /><path d="M6 9.5V20h12V9.5" /><path d="M10 20v-5h4v5" />`,
  verified: `<path d="M12 2.5l2.4 1.8 3-.2.9 2.9 2.4 1.8-1 2.8 1 2.8-2.4 1.8-.9 2.9-3-.2L12 21.5l-2.4-1.8-3 .2-.9-2.9L3.3 15.2l1-2.8-1-2.8 2.4-1.8.9-2.9 3 .2z" fill="currentColor" stroke="none" /><path d="M8.5 12.2l2.4 2.4 4.6-4.8" stroke="#0E0E10" stroke-width="2.2" />`,
  info: `<circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><path d="M12 7.5v.5" />`,
  grid: `<rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" />`,
  flame: `<path d="M12 3c1 3 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.2-4.8C9.5 10 10.5 11 11 12c.6-3 1-6 1-9z" />`,
  bowl: `<path d="M3 11h18a9 9 0 0 1-18 0z" /><path d="M8 7c0-1.5 1.5-1.5 1.5-3" /><path d="M12.5 7c0-1.5 1.5-1.5 1.5-3" />`,
  fish: `<path d="M3 12c3-4.5 9-6 14-2l4-3v10l-4-3c-5 4-11 2.5-14-2z" /><circle cx="14.5" cy="11" r=".8" fill="currentColor" />`,
  locate: `<circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2.5" fill="currentColor" /><path d="M12 2v3" /><path d="M12 19v3" /><path d="M2 12h3" /><path d="M19 12h3" />`,
  tag: `<path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" fill="currentColor" />`,
  map: `<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /><path d="M9 4v14" /><path d="M15 6v14" />`,
  list: `<path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" /><circle cx="4.5" cy="6" r="1" fill="currentColor" /><circle cx="4.5" cy="12" r="1" fill="currentColor" /><circle cx="4.5" cy="18" r="1" fill="currentColor" />`,
  leaf: `<path d="M5 19C5 10 10 5 20 4c-.5 9-5 15-13 15z" /><path d="M5 19l8-8" />`,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, color = '#F5F5F7', stroke = 2 }: { name: string; size?: number; color?: ColorValue; stroke?: number }) {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] ?? ''}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} color={color} />;
}
