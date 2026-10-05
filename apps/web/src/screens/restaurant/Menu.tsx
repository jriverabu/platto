import { useState } from 'react';
import { formatCop, type VideoStatus } from '@platto/core';
import { addCategory, saveDish, useDemo } from '../../data/store';
import { useNav } from '../../nav';
import { Header, Icon, Switch, attempt } from '../../components/ui';

export const VIDEO_STATUS: Record<VideoStatus, { label: string; cls: string }> = {
  none: { label: 'Sin video', cls: 'badge-neutral' },
  processing: { label: 'Procesando', cls: 'badge-warn' },
  in_review: { label: 'En revisión', cls: 'badge-warn' },
  approved: { label: 'Publicado', cls: 'badge-ok' },
  rejected: { label: 'Necesita cambios', cls: 'badge-bad' },
};

export function MenuScreen() {
  const s = useDemo();
  const nav = useNav();
  const rid = s.ownerRestaurantId;
  const categories = s.categories.filter((c) => c.restaurantId === rid).sort((a, b) => a.position - b.position);
  const sub = s.subscriptions.find((x) => x.restaurantId === rid);
  const total = s.dishes.filter((d) => d.restaurantId === rid).length;
  const [newCat, setNewCat] = useState('');

  return (
    <div className="screen">
      <Header kicker={`${total} platos · plan ${sub?.plan === 'pro' ? 'Pro (ilimitados)' : 'Esencial (hasta 30)'}`} title="Menú" />
      <div className="stack gap-24" style={{ padding: '4px 16px 28px', gap: 24 }}>
        {categories.map((c) => {
          const dishes = s.dishes.filter((d) => d.categoryId === c.id).sort((a, b) => a.position - b.position);
          return (
            <section key={c.id} className="stack gap-10">
              <div className="row between">
                <h2 className="display h3">{c.name}</h2>
                <button className="btn-link small" onClick={() => nav.push({ name: 'r-dish', categoryId: c.id })}>+ Plato</button>
              </div>
              <div className="card list" style={{ padding: '0 12px' }}>
                {dishes.length === 0 && <span className="small muted" style={{ padding: '14px 0' }}>Sin platos todavía.</span>}
                {dishes.map((d) => {
                  const status = VIDEO_STATUS[d.videoStatus];
                  return (
                    <div key={d.id} className="row gap-12" style={{ padding: '10px 0' }}>
                      <button onClick={() => nav.push({ name: 'r-dish', dishId: d.id })} className="row gap-12 grow" style={{ border: 0, background: 'none', padding: 0, color: 'inherit', textAlign: 'left', minWidth: 0 }}>
                        <span style={{ width: 52, height: 72, borderRadius: 10, overflow: 'hidden', flex: 'none', background: 'var(--hueso-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tinta)' }}>
                          {d.video?.poster ? <img src={d.video.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="upload" size={18} />}
                        </span>
                        <span className="stack gap-4 grow" style={{ minWidth: 0 }}>
                          <span className="bold ellipsis">{d.name}</span>
                          <span className="price small">{formatCop(d.priceCop)}</span>
                          <span className="row gap-6"><span className={`badge ${status.cls}`}>{status.label}</span>{d.candidate && d.video && d.videoStatus !== 'approved' && <span className="tiny muted">el actual sigue visible</span>}</span>
                        </span>
                      </button>
                      <span className="stack center gap-4">
                        <Switch checked={d.isAvailable} onChange={(v) => attempt(() => saveDish({ ...d, isAvailable: v }), v ? `${d.name} disponible` : `${d.name} marcado como agotado`)} label={`Disponible: ${d.name}`} />
                        <span className="tiny muted">{d.isAvailable ? 'Hay' : 'Agotado'}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <form className="row gap-8" onSubmit={(e) => { e.preventDefault(); if (attempt(() => addCategory(rid, newCat), 'Categoría creada')) setNewCat(''); }}>
          <input className="input grow" placeholder="Nueva categoría (ej. Postres)" value={newCat} onChange={(e) => setNewCat(e.target.value)} aria-label="Nueva categoría" />
          <button className="btn btn-dark" type="submit" disabled={!newCat.trim()}>Crear</button>
        </form>
      </div>
    </div>
  );
}
