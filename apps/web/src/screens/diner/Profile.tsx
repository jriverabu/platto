import { formatCop } from '@platto/core';
import { setRole, useDemo } from '../../data/store';
import { useNav } from '../../nav';
import { Header, Icon } from '../../components/ui';

export function Profile() {
  const s = useDemo();
  const nav = useNav();
  const me = s.people.find((p) => p.id === s.dinerId)!;
  const saved = s.dishes.filter((d) => s.saved.includes(d.id) && d.video);
  const visits = s.reservations.filter((r) => r.dinerId === s.dinerId && r.status === 'completed').length;
  const reviews = s.reviews.filter((r) => r.dinerId === s.dinerId).length;

  return (
    <div className="screen">
      <Header title="Perfil" />
      <div className="stack gap-24" style={{ padding: '4px 16px 28px', gap: 24 }}>
        <div className="row gap-12">
          <span style={{ width: 64, height: 64, borderRadius: 32, background: 'var(--brasa)', color: 'var(--carbon)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontWeight: 900, fontSize: 30 }}>
            {me.name.split(' ').map((p) => p[0]).join('')}
          </span>
          <span className="stack gap-4">
            <span className="display h2">{me.name}</span>
            <span className="small muted">{visits} visitas · {reviews} reseñas verificadas</span>
          </span>
        </div>

        <div className="stack gap-10">
          <span className="label">Guardados</span>
          {saved.length === 0 && <span className="small muted">Toca el marcador en un video para guardar platos aquí.</span>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {saved.map((d) => (
              <button key={d.id} onClick={() => nav.push({ name: 'restaurant', id: d.restaurantId })} style={{ border: 0, padding: 0, background: 'none', color: 'inherit', textAlign: 'left' }} className="stack gap-4">
                <span style={{ height: 150, borderRadius: 12, overflow: 'hidden', display: 'block', background: '#000' }}>
                  {d.video?.poster && <img src={d.video.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </span>
                <span className="small bold ellipsis">{d.name}</span>
                <span className="price tiny">{formatCop(d.priceCop)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card list" style={{ padding: '0 14px' }}>
          {[
            ['bell', 'Notificaciones', 'Confirmaciones, recordatorios y calificaciones'],
            ['shield', 'Privacidad', 'Solo mostramos tu nombre corto en las reseñas'],
          ].map(([icon, title, body]) => (
            <div key={title} className="row gap-12" style={{ padding: '14px 0' }}>
              <Icon name={icon!} />
              <span className="stack gap-4 grow"><span className="bold">{title}</span><span className="small muted">{body}</span></span>
            </div>
          ))}
        </div>

        <div className="paper stack gap-10" style={{ padding: 18 }}>
          <span className="display h3">¿Tienes un restaurante?</span>
          <span className="small" style={{ color: 'var(--tinta-2)', lineHeight: 1.45 }}>Muestra tus platos en video, recibe reservas y conoce qué ven tus clientes antes de llegar.</span>
          <button className="btn btn-dark" onClick={() => setRole('restaurant')}>Ver el modo restaurante</button>
        </div>
      </div>
    </div>
  );
}
