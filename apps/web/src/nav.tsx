// Navegación en memoria: una pila de pantallas por pestaña, como en la app nativa.
// No toca la URL, así la PWA funciona igual en cualquier dirección donde se publique.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Role } from './data/model';

export type Route =
  // Comensal
  | { name: 'feed' }
  | { name: 'search' }
  | { name: 'myReservations' }
  | { name: 'profile' }
  | { name: 'restaurant'; id: string }
  | { name: 'reserve'; restaurantId: string }
  | { name: 'reservation'; id: string }
  | { name: 'review'; reservationId: string }
  // Restaurante
  | { name: 'r-inbox' }
  | { name: 'r-menu' }
  | { name: 'r-dish'; dishId?: string; categoryId?: string }
  | { name: 'r-reviews' }
  | { name: 'r-account' }
  | { name: 'r-hours' }
  | { name: 'r-plan' }
  // Administrador
  | { name: 'a-videos' }
  | { name: 'a-restaurants' }
  | { name: 'a-reviews' };

export interface Tab {
  id: string;
  label: string;
  icon: string;
  root: Route;
}

export const TABS: Record<Role, Tab[]> = {
  diner: [
    { id: 'feed', label: 'Descubrir', icon: 'play', root: { name: 'feed' } },
    { id: 'search', label: 'Buscar', icon: 'search', root: { name: 'search' } },
    { id: 'reservations', label: 'Reservas', icon: 'calendar', root: { name: 'myReservations' } },
    { id: 'profile', label: 'Perfil', icon: 'user', root: { name: 'profile' } },
  ],
  restaurant: [
    { id: 'inbox', label: 'Reservas', icon: 'inbox', root: { name: 'r-inbox' } },
    { id: 'menu', label: 'Menú', icon: 'menu', root: { name: 'r-menu' } },
    { id: 'reviews', label: 'Reseñas', icon: 'star', root: { name: 'r-reviews' } },
    { id: 'account', label: 'Cuenta', icon: 'account', root: { name: 'r-account' } },
  ],
  admin: [
    { id: 'videos', label: 'Videos', icon: 'play', root: { name: 'a-videos' } },
    { id: 'restaurants', label: 'Restaurantes', icon: 'store', root: { name: 'a-restaurants' } },
    { id: 'moderation', label: 'Reseñas', icon: 'flag', root: { name: 'a-reviews' } },
  ],
};

interface NavValue {
  route: Route;
  tab: string;
  canGoBack: boolean;
  push: (r: Route) => void;
  back: () => void;
  switchTab: (id: string) => void;
  /** Cambia de pestaña y abre una pantalla encima. */
  openIn: (tabId: string, r: Route) => void;
}

const NavContext = createContext<NavValue | null>(null);

export function NavProvider({ role, children }: { role: Role; children: ReactNode }) {
  const tabs = TABS[role];
  const [tab, setTab] = useState(tabs[0]!.id);
  const [stacks, setStacks] = useState<Record<string, Route[]>>(() =>
    Object.fromEntries(tabs.map((t) => [t.id, [t.root]])),
  );

  const stack = stacks[tab] ?? [tabs[0]!.root];
  const route = stack[stack.length - 1]!;

  const push = useCallback((r: Route) => setStacks((s) => ({ ...s, [tab]: [...(s[tab] ?? []), r] })), [tab]);
  const back = useCallback(() => setStacks((s) => ({ ...s, [tab]: (s[tab] ?? []).length > 1 ? s[tab]!.slice(0, -1) : s[tab]! })), [tab]);
  const switchTab = useCallback(
    (id: string) => {
      if (id === tab) {
        // Tocar la pestaña activa vuelve a su pantalla inicial.
        setStacks((s) => ({ ...s, [id]: [s[id]![0]!] }));
      }
      setTab(id);
    },
    [tab],
  );
  const openIn = useCallback((tabId: string, r: Route) => {
    setStacks((s) => {
      const root = s[tabId]?.[0];
      return { ...s, [tabId]: root ? [root, r] : [r] };
    });
    setTab(tabId);
  }, []);

  const value = useMemo(
    () => ({ route, tab, canGoBack: stack.length > 1, push, back, switchTab, openIn }),
    [route, tab, stack.length, push, back, switchTab, openIn],
  );
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavValue {
  const v = useContext(NavContext);
  if (!v) throw new Error('useNav fuera de NavProvider');
  return v;
}
