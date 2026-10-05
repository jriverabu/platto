import { useEffect, useRef, useState } from 'react';
import { RULES, checkVideo, clampTrimWindow, defaultTrimWindow, formatCop, formatSeconds, type VideoIssue } from '@platto/core';
import { deleteDish, saveDish, uploadDishVideo, useDemo } from '../../data/store';
import { useNav } from '../../nav';
import { DishVideo } from '../../components/Video';
import { Header, Icon, Switch, attempt, toast } from '../../components/ui';
import { VIDEO_STATUS } from './Menu';

const TAGS = ['Vegetariano', 'Sin gluten', 'Picante', 'Para compartir', 'Nuevo'];

export function DishEditor({ dishId, categoryId }: { dishId?: string; categoryId?: string }) {
  const s = useDemo();
  const nav = useNav();
  const rid = s.ownerRestaurantId;
  const [id, setId] = useState(dishId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dish = s.dishes.find((d) => d.id === id);
  const categories = s.categories.filter((c) => c.restaurantId === rid);
  const [form, setForm] = useState(() => ({
    name: dish?.name ?? '',
    description: dish?.description ?? '',
    price: dish ? String(dish.priceCop) : '',
    categoryId: dish?.categoryId ?? categoryId ?? categories[0]?.id ?? '',
    tags: dish?.tags ?? [],
    isAvailable: dish?.isAvailable ?? true,
  }));
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const price = Number(form.price.replace(/\D/g, ''));

  const save = () =>
    attempt(() => {
      const newId = saveDish({ id, restaurantId: rid, categoryId: form.categoryId, name: form.name, description: form.description, priceCop: price, tags: form.tags, isAvailable: form.isAvailable });
      if (!id) {
        setId(newId);
        toast('Plato creado. Ahora sube su video de 10 segundos.');
      } else toast('Cambios guardados');
    });

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column' }}>
      <Header onBack={nav.back} title={id ? 'Editar plato' : 'Nuevo plato'} right={<button className="btn btn-dark btn-sm" onClick={save}>Guardar</button>} />
      <div className="stack gap-20" style={{ padding: '4px 16px 28px', gap: 20 }}>
        {id && dish ? <VideoSection dishId={id} /> : (
          <div className="card row gap-12" style={{ alignItems: 'flex-start' }}>
            <Icon name="play" />
            <span className="small" style={{ lineHeight: 1.45 }}>Guarda el plato primero; después subes su video vertical de máximo 10 segundos.</span>
          </div>
        )}

        <div className="field">
          <label htmlFor="nombre">Nombre del plato</label>
          <input id="nombre" className="input" value={form.name} maxLength={60} onChange={(e) => set('name', e.target.value)} placeholder="Costilla ahumada 12 horas" />
        </div>
        <div className="field">
          <label htmlFor="desc">Descripción</label>
          <textarea id="desc" className="textarea" rows={3} maxLength={240} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Ingredientes y acompañamientos" />
        </div>
        <div className="row gap-10">
          <div className="field grow">
            <label htmlFor="precio">Precio (COP)</label>
            <input id="precio" className="input mono" inputMode="numeric" value={form.price ? formatCop(price) : ''} onChange={(e) => set('price', e.target.value)} placeholder="$46.000" />
          </div>
          <div className="field grow">
            <label htmlFor="cat">Categoría</label>
            <select id="cat" className="select" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="stack gap-8">
          <span className="bold small">Etiquetas</span>
          <div className="row gap-8 wrap">
            {TAGS.map((t) => (
              <button key={t} className="chip" aria-pressed={form.tags.includes(t)} onClick={() => set('tags', form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t])}>{t}</button>
            ))}
          </div>
        </div>
        <div className="card row between">
          <span className="stack gap-4"><span className="bold">Disponible hoy</span><span className="small muted">Apágalo si se acaba</span></span>
          <Switch checked={form.isAvailable} onChange={(v) => set('isAvailable', v)} label="Disponible hoy" />
        </div>
        {id && !confirmDelete && (
          <button className="btn-link small" style={{ color: 'var(--alerta)', alignSelf: 'flex-start' }} onClick={() => setConfirmDelete(true)}>
            Eliminar plato
          </button>
        )}
        {id && confirmDelete && (
          <div className="card stack gap-10">
            <span className="bold">¿Eliminar este plato del menú?</span>
            <span className="small muted">Desaparece del menú y del feed. No se puede deshacer.</span>
            <div className="row gap-8">
              <button className="btn btn-ghost btn-sm grow" onClick={() => setConfirmDelete(false)}>Cancelar</button>
              <button className="btn btn-sm grow" style={{ background: 'var(--alerta)', color: 'var(--hueso)' }} onClick={() => { deleteDish(id); toast('Plato eliminado'); nav.back(); }}>Eliminar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface Picked {
  url: string;
  duration: number;
  width: number;
  height: number;
  frames: string[];
  issues: VideoIssue[];
}

/** Lee duración y tamaño del video y saca 12 cuadros para la tira de recorte. */
async function inspect(file: File): Promise<Picked> {
  const url = URL.createObjectURL(file);
  const el = document.createElement('video');
  el.muted = true;
  el.playsInline = true;
  el.preload = 'auto';
  el.src = url;
  await new Promise<void>((resolve, reject) => {
    el.onloadedmetadata = () => resolve();
    el.onerror = () => reject(new Error('No pudimos leer este video. Prueba con un MP4 o MOV.'));
  });
  const duration = el.duration;
  const width = el.videoWidth;
  const height = el.videoHeight;
  const frames: string[] = [];
  const canvas = document.createElement('canvas');
  canvas.width = 54;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 12 && ctx && Number.isFinite(duration); i++) {
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      el.onseeked = done;
      setTimeout(done, 600);
      el.currentTime = Math.min(duration - 0.05, (duration * (i + 0.5)) / 12);
    });
    try {
      const scale = Math.max(canvas.width / width, canvas.height / height);
      const w = width * scale;
      const h = height * scale;
      ctx.drawImage(el, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      frames.push(canvas.toDataURL('image/jpeg', 0.6));
    } catch {
      break;
    }
  }
  // Un clip largo no es un error: se recorta a 10 s. Lo demás sí se valida.
  const issues = checkVideo({ durationSeconds: duration, width, height }).filter((i) => i.code !== 'TOO_LONG');
  return { url, duration, width, height, frames, issues };
}

function VideoSection({ dishId }: { dishId: string }) {
  const s = useDemo();
  const dish = s.dishes.find((d) => d.id === dishId)!;
  const input = useRef<HTMLInputElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [start, setStart] = useState(0);
  const [busy, setBusy] = useState(false);
  const status = VIDEO_STATUS[dish.videoStatus];

  useEffect(() => () => { if (picked && !dish.candidate?.src.includes(picked.url)) URL.revokeObjectURL(picked.url); }, []); // eslint-disable-line

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const p = await inspect(file);
      setPicked(p);
      setStart(defaultTrimWindow(p.duration).start);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No pudimos leer este video.', 'error');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  const errors = picked?.issues.filter((i) => i.level === 'error') ?? [];
  const warnings = picked?.issues.filter((i) => i.level === 'warning') ?? [];
  const length = picked ? Math.min(RULES.videoMaxSeconds, picked.duration) : 0;

  const upload = () => {
    if (!picked) return;
    attempt(() => uploadDishVideo(dishId, { src: picked.url, poster: picked.frames[Math.floor(picked.frames.length / 2)] ?? null, duration: length, trimStart: start }), 'Video enviado. Platto lo revisa en menos de 24 h.');
    setPicked(null);
  };

  return (
    <section className="stack gap-12">
      <div className="row gap-14" style={{ alignItems: 'flex-start', gap: 14 }}>
        <div style={{ width: 132, height: 234, borderRadius: 16, overflow: 'hidden', flex: 'none', background: 'var(--carbon)', border: '3px solid var(--carbon)', position: 'relative' }}>
          {dish.video ? <DishVideo video={dish.video} active className="fill" label={`Video publicado de ${dish.name}`} /> : (
            <span className="stack center gap-6" style={{ height: '100%', color: 'var(--humo)', textAlign: 'center', padding: 10 }}><Icon name="play" /><span className="tiny">Sin video publicado</span></span>
          )}
        </div>
        <div className="stack gap-8 grow">
          <span className="label">Video del plato</span>
          <span className={`badge ${status.cls}`} style={{ alignSelf: 'flex-start' }}>{status.label}</span>
          {dish.videoStatus === 'in_review' && <span className="small muted" style={{ lineHeight: 1.4 }}>El equipo de Platto lo revisa en menos de 24 horas. {dish.video ? 'Mientras tanto se ve el actual.' : ''}</span>}
          {dish.videoStatus === 'processing' && <span className="small muted">Procesando el video…</span>}
          {dish.videoStatus === 'rejected' && <span className="small" style={{ color: 'var(--alerta)', lineHeight: 1.4 }}>{dish.reviewNote}</span>}
          <ul className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6, color: 'var(--tinta-2)' }}>
            <li>Vertical 9:16</li>
            <li>De {RULES.videoMinSeconds} a {RULES.videoMaxSeconds} segundos</li>
            <li>Sin texto ni logos encima</li>
          </ul>
          <input ref={input} type="file" accept="video/*" capture="environment" className="sr-only" id="video-file" onChange={(e) => onFile(e.target.files?.[0])} />
          <label htmlFor="video-file" className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }} aria-disabled={busy}>
            <Icon name="upload" size={18} /> {busy ? 'Leyendo video…' : dish.video ? 'Cambiar video' : 'Subir video'}
          </label>
        </div>
      </div>

      {picked && (
        <div className="stack gap-12 enter" style={{ background: 'var(--carbon)', color: 'var(--hueso)', borderRadius: 16, padding: 16 }}>
          <div className="row between">
            <span className="bold">{picked.duration > RULES.videoMaxSeconds ? 'Elige tus 10 segundos' : 'Tu video'}</span>
            <span className="mono tiny" style={{ color: 'var(--humo)' }}>CLIP {formatSeconds(picked.duration)} · {picked.width}×{picked.height}</span>
          </div>
          {picked.duration > RULES.videoMaxSeconds && picked.frames.length > 0 && (
            <Trimmer duration={picked.duration} frames={picked.frames} start={start} onChange={setStart} />
          )}
          <div style={{ alignSelf: 'center', width: 150, aspectRatio: '9 / 16', borderRadius: 12, overflow: 'hidden', background: '#000' }}>
            <DishVideo key={`${picked.url}-${start}`} video={{ src: picked.url, poster: null, duration: length, trimStart: start }} active className="fill" label="Vista previa" />
          </div>
          {errors.map((i) => <span key={i.code} className="small" style={{ color: '#ffb79e' }}>✕ {i.message}</span>)}
          {warnings.map((i) => <span key={i.code} className="small" style={{ color: 'var(--humo)' }}>• {i.message}</span>)}
          <div className="row gap-8">
            <button className="btn btn-ghost btn-sm grow" style={{ borderColor: 'var(--carbon-line)', color: 'var(--hueso)' }} onClick={() => setPicked(null)}>Descartar</button>
            <button className="btn btn-primary btn-sm" style={{ flex: 1.5 }} disabled={errors.length > 0} onClick={upload}>
              Enviar {formatSeconds(length)} a revisión
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Trimmer({ duration, frames, start, onChange }: { duration: number; frames: string[]; start: number; onChange: (s: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const widthPct = (RULES.videoMaxSeconds / duration) * 100;
  const leftPct = (start / duration) * 100;
  const end = clampTrimWindow(duration, start).end;

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, start };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !box.current) return;
    const dx = e.clientX - drag.current.x;
    const seconds = (dx / box.current.clientWidth) * duration;
    onChange(clampTrimWindow(duration, drag.current.start + seconds).start);
  };
  const onUp = () => {
    drag.current = null;
  };

  return (
    <div className="stack gap-6">
      <div className="trim" ref={box}>
        <div className="trim-strip">{frames.map((f, i) => <img key={i} src={f} alt="" />)}</div>
        <div
          className="trim-window"
          role="slider"
          tabIndex={0}
          aria-label="Ventana de 10 segundos"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration - RULES.videoMaxSeconds)}
          aria-valuenow={Math.round(start)}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') onChange(clampTrimWindow(duration, start - 0.5).start);
            if (e.key === 'ArrowRight') onChange(clampTrimWindow(duration, start + 0.5).start);
          }}
        />
      </div>
      <div className="row between mono tiny" style={{ color: 'var(--humo)' }}>
        <span>0:00</span>
        <span style={{ color: 'var(--hueso)' }}>{formatSeconds(start)} → {formatSeconds(end)}</span>
        <span>{formatSeconds(duration)}</span>
      </div>
    </div>
  );
}
