import { useEffect, useState } from 'react';
import { advanceClock, markNotificationsRead, resetDemo, setRole, setWelcomed, useDemo, now } from './data/store';
import type { Role } from './data/model';
import { NavProvider, TABS, useNav, type Route } from './nav';
import { Icon, Sheet, ToastHost, toast } from './components/ui';
import { formatDateShort, formatTime } from '@platto/core';
import { TZ } from './data/seed';

import { Feed } from './screens/diner/Feed';
import { Search } from './screens/diner/Search';
import { RestaurantScreen } from './screens/diner/Restaurant';
import { Reserve } from './screens/diner/Reserve';
import { MyReservations, ReservationDetail } from './screens/diner/MyReservations';
import { ReviewScreen } from './screens/diner/Review';
import { Profile } from './screens/diner/Profile';
import { Inbox } from './screens/restaurant/Inbox';
import { MenuScreen } from './screens/restaurant/Menu';
import { DishEditor } from './screens/restaurant/DishEditor';
import { RestaurantReviews } from './screens/restaurant/Reviews';
import { Account, Hours, PlanScreen } from './screens/restaurant/Account';
import { AdminVideos, AdminRestaurants, AdminReviews } from './screens/admin/Admin';

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'feed': return <Feed />;
    case 'search': return <Search />;
    case 'restaurant': return <RestaurantScreen id={route.id} />;
    case 'reserve': return <Reserve restaurantId={route.restaurantId} />;
    case 'myReservations': return <MyReservations />;
    case 'reservation': return <ReservationDetail id={route.id} />;
    case 'review': return <ReviewScreen reservationId={route.reservationId} />;
    case 'profile': return <Profile />;
    case 'r-inbox': return <Inbox />;
    case 'r-menu': return <MenuScreen />;
    case 'r-dish': return <DishEditor dishId={route.dishId} categoryId={route.categoryId} />;
    case 'r-reviews': return <RestaurantReviews />;
    case 'r-account': return <Account />;
    case 'r-hours': return <Hours />;
    case 'r-plan': return <PlanScreen />;
    case 'a-videos': return <AdminVideos />;
    case 'a-restaurants': return <AdminRestaurants />;
    case 'a-reviews': return <AdminReviews />;
  }
}

function TabBar({ role }: { role: Role }) {
  const nav = useNav();
  const s = useDemo();
  const badges: Record<string, number> = {
    reservations: s.notifications.filter((n) => n.to === 'diner' && !n.read).length,
    inbox: s.reservations.filter((r) => r.restaurantId === s.ownerRestaurantId && r.status === 'pending' && r.expiresAt > now()).length,
    videos: s.dishes.filter((d) => d.videoStatus === 'in_review').length,
    moderation: s.reviews.filter((r) => r.reported && !r.hidden).length,
  };
  return (
    <nav className="tabbar" aria-label="Secciones">
      {TABS[role].map((t) => (
        <button key={t.id} aria-current={nav.tab === t.id ? 'page' : undefined} onClick={() => nav.switchTab(t.id)}>
          <Icon name={t.icon} size={24} />
          {t.label}
          {badges[t.id] ? <span className="dot">{badges[t.id]}</span> : null}
        </button>
      ))}
    </nav>
  );
}

function Shell({ role }: { role: Role }) {
  const nav = useNav();
  return (
    <>
      <main className="screen-host" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }} key={`${nav.tab}-${nav.route.name}`}>
        <Screen route={nav.route} />
      </main>
      <TabBar role={role} />
    </>
  );
}

const ROLE_INFO: Record<Role, { title: string; body: string }> = {
  diner: { title: 'Comensal', body: 'Camila descubre platos, reserva y califica.' },
  restaurant: { title: 'Restaurante', body: 'Brasa Negra recibe reservas y gestiona su menú en video.' },
  admin: { title: 'Administrador', body: 'Platto aprueba videos, restaurantes y reseñas.' },
};

function DemoSheet({ onClose }: { onClose: () => void }) {
  const s = useDemo();
  const notes = s.notifications.filter((n) => n.to === (s.role === 'diner' ? 'diner' : s.role === 'admin' ? 'admin' : s.ownerRestaurantId)).slice(0, 4);
  return (
    <Sheet onClose={onClose} label="Controles de la demo">
      <div className="stack gap-4">
        <span className="label">Demo de Platto</span>
        <span className="display h2">Mira cada lado</span>
        <span className="small" style={{ color: 'var(--tinta)', lineHeight: 1.45 }}>
          Los tres usan los mismos datos: lo que reserves como comensal llega al restaurante al instante.
        </span>
      </div>
      <div className="stack gap-8">
        {(Object.keys(ROLE_INFO) as Role[]).map((r) => (
          <button
            key={r}
            className="role-option"
            aria-pressed={s.role === r}
            onClick={() => {
              setRole(r);
              onClose();
            }}
          >
            <span className="icon-btn" style={{ background: s.role === r ? 'var(--brasa)' : 'var(--hueso-3)', color: 'var(--carbon)' }}>
              <Icon name={r === 'diner' ? 'user' : r === 'restaurant' ? 'store' : 'shield'} />
            </span>
            <span className="stack gap-4 grow">
              <span className="bold">{ROLE_INFO[r].title}</span>
              <span className="small" style={{ color: 'var(--tinta)' }}>{ROLE_INFO[r].body}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="stack gap-8">
        <span className="field-label bold small">Reloj de la demo</span>
        <span className="small" style={{ color: 'var(--tinta)' }}>
          Ahora: {formatDateShort(new Date(now()), TZ)} · {formatTime(new Date(now()), TZ)}
          {s.clockOffsetMin > 0 ? ` (adelantado ${Math.round(s.clockOffsetMin / 60)} h)` : ''}
        </span>
        <div className="row gap-8">
          <button className="btn btn-ghost btn-sm grow" onClick={() => { advanceClock(120); toast('Reloj adelantado 2 horas'); }}>
            <Icon name="fast" size={18} /> +2 horas
          </button>
          <button className="btn btn-ghost btn-sm grow" onClick={() => { advanceClock(24 * 60); toast('Reloj adelantado 1 día'); }}>
            <Icon name="fast" size={18} /> +1 día
          </button>
        </div>
      </div>
      {notes.length > 0 && (
        <div className="stack">
          <span className="field-label bold small">Notificaciones de este rol</span>
          {notes.map((n) => (
            <div className="notif" key={n.id}>
              {!n.read ? <span className="pip" /> : <span style={{ width: 8 }} />}
              <span className="stack gap-4 grow">
                <span className="bold small">{n.title}</span>
                <span className="small" style={{ color: 'var(--tinta)' }}>{n.body}</span>
              </span>
            </div>
          ))}
        </div>
      )}
      <button className="btn-link small" style={{ alignSelf: 'flex-start' }} onClick={() => { resetDemo(); onClose(); toast('Demo reiniciada'); }}>
        Reiniciar la demo
      </button>
    </Sheet>
  );
}

function Welcome() {
  return (
    <Sheet onClose={setWelcomed} label="Bienvenida">
      <div className="stack gap-12">
        <span className="logo" style={{ color: 'var(--carbon)' }}>platto<span>.</span></span>
        <span className="display h1">Cada plato en 10 segundos</span>
        <span style={{ lineHeight: 1.5, color: 'var(--tinta-2)' }}>
          Descubre restaurantes por sus platos en video, reserva mesa en dos toques y califica solo si fuiste.
        </span>
        <span className="small" style={{ lineHeight: 1.5, color: 'var(--tinta)' }}>
          Esta es una demo con restaurantes y videos de ejemplo. Con el botón <b>Demo</b> de arriba cambias entre comensal, restaurante y administrador.
        </span>
      </div>
      <button className="btn btn-dark btn-block" onClick={setWelcomed}>Empezar</button>
    </Sheet>
  );
}

export function App() {
  const s = useDemo();
  const [demoOpen, setDemoOpen] = useState(false);
  const theme = s.role === 'diner' ? 'theme-night' : 'theme-paper';

  useEffect(() => {
    if (demoOpen) markNotificationsRead(s.role === 'diner' ? 'diner' : s.role === 'admin' ? 'admin' : s.ownerRestaurantId);
  }, [demoOpen, s.role, s.ownerRestaurantId]);

  return (
    <>
      <aside className="side">
        <h1>platto<span>.</span></h1>
        <p>Descubre restaurantes por sus platos en video de 10 segundos, reserva en dos toques y califica solo si fuiste.</p>
        <p>Demo funcional: cambia de rol con el botón <b style={{ color: 'var(--brasa)' }}>Demo</b> para ver al comensal, al restaurante y al administrador trabajando sobre los mismos datos.</p>
        <p className="small">En el teléfono, ábrela en el navegador y elige «Agregar a pantalla de inicio» para instalarla.</p>
      </aside>
      <div className={`app ${theme}`}>
        <div className="row between" style={{ flex: 'none', background: 'var(--brasa)', color: 'var(--carbon)', padding: 'calc(4px + var(--safe-top)) 12px 4px', minHeight: 32 }}>
          <span className="mono" style={{ fontSize: 11, letterSpacing: 1, fontWeight: 500 }}>DEMO · {ROLE_INFO[s.role].title.toUpperCase()}</span>
          <button onClick={() => setDemoOpen(true)} style={{ border: 0, background: 'var(--carbon)', color: 'var(--hueso)', borderRadius: 999, minHeight: 28, padding: '0 12px', fontWeight: 700, fontSize: 12 }} aria-label="Abrir controles de la demo">
            Cambiar rol
          </button>
        </div>
        <NavProvider role={s.role} key={s.role}>
          <Shell role={s.role} />
        </NavProvider>
        {demoOpen && <DemoSheet onClose={() => setDemoOpen(false)} />}
        {!s.welcomed && <Welcome />}
        <ToastHost />
      </div>
    </>
  );
}
