import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { formatCop, formatRating } from '@platto/core';
import { logView, ratingOf, selectFeed, toggleSaved, useDemo, type FeedItem } from '../../data/store';
import { useNav } from '../../nav';
import { DishVideo, isMuted, onMutedChange, setMuted } from '../../components/Video';
import { Icon, toast } from '../../components/ui';
import { Wordmark } from '../../components/Brand';


export function Feed() {
  const s = useDemo();
  const [zone, setZone] = useState<string | null>(null);
  const items = useMemo(() => selectFeed(s, zone), [s, zone]);
  const zones = useMemo(() => [null, ...[...new Set(s.restaurants.map((r) => r.zone))].sort()], [s.restaurants]);
  const [active, setActive] = useState(0);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio > 0.6) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { root, threshold: [0.6] },
    );
    root.querySelectorAll('[data-index]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items.length, zone]);

  useEffect(() => {
    container.current?.scrollTo({ top: 0 });
    setActive(0);
  }, [zone]);

  return (
    <div className="feed" ref={container} aria-label="Platos en video">
      {items.length === 0 && (
        <div className="feed-empty">
          <span className="display h2">Nada por aquí todavía</span>
          <span className="muted">No hay platos con video en esta zona.</span>
          <button className="btn btn-light" onClick={() => setZone(null)}>Ver todo</button>
        </div>
      )}
      {items.map((item, i) => (
        <FeedCard
          key={item.dish.id}
          item={item}
          index={i}
          active={i === active}
          zone={zone}
          zones={zones}
          onZone={setZone}
          saved={s.saved.includes(item.dish.id)}
          rating={ratingOf(s, item.restaurant.id)}
        />
      ))}
    </div>
  );
}

function FeedCard({
  item, index, active, zone, zones, onZone, saved, rating,
}: {
  item: FeedItem;
  index: number;
  active: boolean;
  zone: string | null;
  zones: (string | null)[];
  onZone: (z: string | null) => void;
  saved: boolean;
  rating: ReturnType<typeof ratingOf>;
}) {
  const nav = useNav();
  const segs = useRef<(HTMLElement | null)[]>([]);
  const [muted, setMutedState] = useState(isMuted());
  useEffect(() => onMutedChange(setMutedState), []);

  const onProgress = useCallback((f: number) => {
    segs.current.forEach((el, i) => {
      if (el) el.style.transform = `scaleX(${Math.max(0, Math.min(1, f * 10 - i))})`;
    });
  }, []);

  const share = async () => {
    const text = `${item.dish.name} en ${item.restaurant.name} · Platto`;
    try {
      if (!navigator.share) throw new Error('sin share');
      await navigator.share({ title: 'Platto', text });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return; // el usuario canceló
    }
    try {
      await navigator.clipboard.writeText(text);
      toast('Copiado para compartir');
    } catch {
      toast(text);
    }
  };

  return (
    <section className="feed-item" data-index={index} aria-label={`${item.dish.name}, ${item.restaurant.name}`}>
      <DishVideo
        video={item.dish.video!}
        active={active}
        className="feed-video"
        onProgress={onProgress}
        onWatched={(sec) => logView(item.dish.id, sec)}
        label={`Video de ${item.dish.name}`}
      />

      <div className="feed-top">
        <div className="segments" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i}><i ref={(el) => { segs.current[i] = el; }} /></span>
          ))}
        </div>
        <div className="row between">
          <Wordmark height={22} ink="#fff" />
          <span className="row gap-8">
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, padding: '6px 10px', borderRadius: 999, background: 'rgba(14,14,16,.55)' }}>10 S</span>
            <button className="icon-btn glass" aria-label="Buscar restaurantes" onClick={() => nav.switchTab('search')}>
              <Icon name="search" size={20} />
            </button>
          </span>
        </div>
        <div className="chips" style={{ margin: 0, padding: 0 }}>
          {zones.map((z) => (
            <button
              key={z ?? 'all'}
              className="chip"
              aria-pressed={zone === z}
              onClick={() => onZone(z)}
              style={zone === z ? undefined : { background: 'rgba(14,14,16,.5)', borderColor: 'rgba(255,255,255,.22)', color: '#fff' }}
            >
              {z ?? 'Para ti'}
            </button>
          ))}
        </div>
      </div>

      <div className="feed-rail">
        <button className="icon-btn glass" aria-label={saved ? 'Quitar de guardados' : 'Guardar plato'} aria-pressed={saved} onClick={() => { toggleSaved(item.dish.id); toast(saved ? 'Quitado de guardados' : 'Guardado en tu perfil'); }} style={saved ? { color: 'var(--brand)' } : undefined}>
          <Icon name={saved ? 'bookmarkFill' : 'bookmark'} />
        </button>
        <button className="icon-btn glass" aria-label="Compartir" onClick={share}>
          <Icon name="share" />
        </button>
        <button className="icon-btn glass" aria-label={muted ? 'Activar sonido' : 'Silenciar'} onClick={() => setMuted(!muted)}>
          <Icon name={muted ? 'muted' : 'sound'} />
        </button>
      </div>

      <div className="feed-info">
        <h2 className="dish">{item.dish.name}</h2>
        <div className="row gap-8">
          <span className="avatar" aria-hidden="true">{initials(item.restaurant.name)}</span>
          <span className="small ellipsis" style={{ fontWeight: 500 }}>{item.restaurant.name}</span>
          <span style={{ color: 'var(--brand)', display: 'flex' }}><Icon name="verified" size={15} /></span>
          <span className="small muted" style={{ flex: 'none' }}>· {item.restaurant.zone}</span>
        </div>
        <span className="small clamp-2" style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>{item.dish.description}</span>
        <div className="row between">
          <span className="price" style={{ fontSize: 22 }}>{formatCop(item.dish.priceCop)}</span>
          <span className="row gap-4 small" style={{ fontWeight: 600 }}>
            <span style={{ color: 'var(--brand)', display: 'flex' }}><Icon name="starFill" size={15} /></span>
            {rating.average !== null ? `${formatRating(rating.average)} (${rating.count})` : `Nuevo · ${rating.count}`}
          </span>
        </div>
        <div className="row gap-10" style={{ marginTop: 4 }}>
          <button className="btn btn-ghost grow" onClick={() => nav.push({ name: 'restaurant', id: item.restaurant.id })}>
            Ver menú
          </button>
          <button className="btn btn-primary" style={{ flex: 1.4 }} onClick={() => nav.push({ name: 'reserve', restaurantId: item.restaurant.id })}>
            <Icon name="calendar" size={18} /> Reservar mesa
          </button>
        </div>
      </div>
    </section>
  );
}

export function initials(name: string): string {
  return name.split(/\s+/).filter((w) => w.length > 2 || /^[A-ZÁÉÍÓÚ]/.test(w)).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}
