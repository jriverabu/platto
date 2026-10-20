// Plato a pantalla completa, como en Inicio. Deslizando hacia arriba se pasa al siguiente plato
// del mismo restaurante. Escape o la X cierran.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatCop } from '@platto/core';
import { logView, type DemoState, type DishRow } from '../data/store';
import { DishVideo, isMuted, onMutedChange, setMuted } from './Video';
import { Icon } from './ui';

type Restaurant = DemoState['restaurants'][number];

export function DishViewer({ dishes, startIndex, restaurant, onClose, onReserve }: {
  dishes: DishRow[];
  startIndex: number;
  restaurant: Restaurant;
  onClose: () => void;
  onReserve: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const segs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(startIndex);
  const [muted, setMutedState] = useState(isMuted());
  useEffect(() => onMutedChange(setMutedState), []);

  // Abre en el plato que se tocó.
  useLayoutEffect(() => {
    const root = container.current;
    if (root) root.scrollTop = startIndex * root.clientHeight;
  }, [startIndex]);

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
  }, [dishes.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onProgress = useCallback((f: number) => {
    segs.current.forEach((el, i) => {
      if (el) el.style.transform = `scaleX(${Math.max(0, Math.min(1, f * 10 - i))})`;
    });
  }, []);

  // Se pinta sobre toda la app (no dentro de la pantalla del restaurante, que tiene su propio scroll).
  const host = document.querySelector('.app') ?? document.body;
  return createPortal(
    <div className="dish-viewer" role="dialog" aria-modal="true" aria-label={`Platos de ${restaurant.name}`}>
      <div className="feed" ref={container}>
        {dishes.map((d, i) => (
          <section key={d.id} className="feed-item" data-index={i} aria-label={`${d.name}, ${restaurant.name}`}>
            {Math.abs(i - active) <= 1 && d.video && (
              <DishVideo
                video={d.video}
                active={i === active}
                className="feed-video"
                onProgress={i === active ? onProgress : undefined}
                onWatched={(sec) => logView(d.id, sec)}
                label={`Video de ${d.name}`}
              />
            )}
            <div className="feed-info">
              {d.tags[0] && <span className="badge badge-dark" style={{ alignSelf: 'flex-start' }}>{d.tags[0]}</span>}
              <h2 className="dish">{d.name}</h2>
              <span className="small" style={{ color: 'var(--text-2)', fontWeight: 500 }}>{restaurant.name} · {restaurant.zone}</span>
              <span className="small clamp-2" style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>{d.description}</span>
              <span className="price" style={{ fontSize: 22 }}>{formatCop(d.priceCop)}</span>
              {!d.isAvailable && <span className="badge badge-warn" style={{ alignSelf: 'flex-start' }}>Agotado hoy</span>}
              <button className="btn btn-primary btn-block" style={{ marginTop: 4 }} onClick={onReserve}>
                <Icon name="calendar" size={18} /> Reservar para probarlo
              </button>
            </div>
          </section>
        ))}
      </div>

      <div className="feed-top">
        <div className="segments" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <span key={i}><i ref={(el) => { segs.current[i] = el; }} /></span>
          ))}
        </div>
        <div className="row between">
          <button className="icon-btn glass" aria-label="Cerrar" onClick={onClose}><Icon name="close" /></button>
          <span className="row gap-8">
            {dishes.length > 1 && (
              <span style={{ fontSize: 12, fontWeight: 600, padding: '7px 11px', borderRadius: 999, background: 'rgba(14,14,16,.55)' }}>{active + 1} de {dishes.length}</span>
            )}
            <button className="icon-btn glass" aria-label={muted ? 'Activar sonido' : 'Silenciar'} onClick={() => setMuted(!muted)}>
              <Icon name={muted ? 'muted' : 'sound'} />
            </button>
          </span>
        </div>
      </div>
    </div>,
    host,
  );
}
