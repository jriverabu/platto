import { useState } from 'react';
import { RATING_LABELS, REVIEW_TAGS, RULES, formatDateShort, formatTime } from '@platto/core';
import { submitReview, useDemo } from '../../data/store';
import { useNav } from '../../nav';
import { Header, Icon, attempt } from '../../components/ui';

const HEIGHTS = [52, 64, 76, 88, 100];

export function ReviewScreen({ reservationId }: { reservationId: string }) {
  const s = useDemo();
  const nav = useNav();
  const r = s.reservations.find((x) => x.id === reservationId);
  const [score, setScore] = useState(5);
  const [dishIds, setDishIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [done, setDone] = useState(false);
  if (!r) return null;
  const rest = s.restaurants.find((x) => x.id === r.restaurantId)!;
  const dishes = s.dishes.filter((d) => d.restaurantId === rest.id && d.video);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  if (done) {
    return (
      <div className="screen">
        <div className="stack gap-16" style={{ padding: '60px 20px' }}>
          <span className="display" style={{ fontSize: 120, color: 'var(--brasa)' }}>{score}</span>
          <h1 className="display h1">Gracias por contarlo</h1>
          <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>Tu calificación ya cuenta en el promedio de {rest.name} y ayuda a que otros elijan mejor.</p>
          <button className="btn btn-light btn-block" onClick={() => nav.switchTab('feed')}>Volver a descubrir</button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <Header onBack={nav.back} right={<span className="stamp" style={{ color: 'var(--hoja)' }}>VISITA VERIFICADA</span>} />
      <div className="stack gap-24" style={{ padding: '0 16px 24px', gap: 24, flex: 1 }}>
        <div className="stack gap-8">
          <span className="label">{formatDateShort(new Date(r.startsAt), rest.timezone)} · mesa para {r.partySize} · {formatTime(new Date(r.startsAt), rest.timezone)}</span>
          <h1 className="display h1">¿Cómo estuvo {rest.name}?</h1>
        </div>

        <div className="card stack gap-16">
          <div className="row gap-12" style={{ alignItems: 'baseline' }}>
            <span className="display" style={{ fontSize: 64, color: 'var(--brasa)', lineHeight: 0.8 }}>{score}</span>
            <span className="bold" style={{ fontSize: 18 }}>{RATING_LABELS[score]}</span>
          </div>
          <div className="score-tiles" role="radiogroup" aria-label="Calificación de 1 a 5">
            {[1, 2, 3, 4, 5].map((n, i) => (
              <button key={n} role="radio" aria-checked={score === n} aria-label={`${n} de 5, ${RATING_LABELS[n]}`} className={n <= score ? 'lit' : ''} style={{ height: HEIGHTS[i] }} onClick={() => setScore(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="stack gap-10">
          <span className="bold">¿Qué platos pediste?</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            {dishes.map((d) => {
              const on = dishIds.includes(d.id);
              return (
                <button key={d.id} aria-pressed={on} onClick={() => setDishIds(toggle(dishIds, d.id))} style={{ border: 0, padding: 0, background: 'none', color: 'inherit', textAlign: 'left' }} className="stack gap-6">
                  <span style={{ position: 'relative', height: 130, borderRadius: 12, overflow: 'hidden', display: 'block', outline: on ? '3px solid var(--brasa)' : 'none', outlineOffset: -3 }}>
                    {d.video?.poster && <img src={d.video.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    {on && <span style={{ position: 'absolute', right: 6, top: 6, width: 26, height: 26, borderRadius: 13, background: 'var(--brasa)', color: 'var(--carbon)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={14} stroke={3} /></span>}
                  </span>
                  <span className="small bold" style={{ lineHeight: 1.25 }}>{d.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="stack gap-10">
          <span className="bold">Lo mejor fue…</span>
          <div className="row gap-8 wrap">
            {REVIEW_TAGS.map((t) => (
              <button key={t} className="chip" aria-pressed={tags.includes(t)} onClick={() => setTags(toggle(tags, t))}>{t}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="comentario">Cuéntale a otros <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
          <textarea id="comentario" className="textarea" rows={3} maxLength={RULES.reviewCommentMax} placeholder="¿Qué deberían pedir? ¿Qué cambiarías?" value={comment} onChange={(e) => setComment(e.target.value)} />
          <span className="mono tiny muted" style={{ alignSelf: 'flex-end' }}>{comment.length} / {RULES.reviewCommentMax}</span>
        </div>
        <span className="tiny muted" style={{ lineHeight: 1.45, textAlign: 'center' }}>
          Tu reseña se publica con tu nombre corto y la fecha de tu visita. {rest.name} puede responderla, pero no borrarla.
        </span>
      </div>
      <div className="sticky-cta">
        <button className="btn btn-primary btn-block" onClick={() => attempt(() => { submitReview({ reservationId, rating: score, comment, tags, dishIds }); setDone(true); })}>
          Publicar calificación
        </button>
      </div>
    </div>
  );
}
