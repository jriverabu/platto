// Controles de la demo (la app real no los trae): cambiar de lado y adelantar el reloj
// para ver flujos que toman horas, como calificar 2 h después de la visita.
import { View } from 'react-native';
import { router } from 'expo-router';
import { advanceClock, resetDemo, setRole, useDemo } from '@platto/demo';
import { Button, Card, T, toast } from './ui';
import { C } from '@/lib/theme';

export function DemoPanel() {
  const s = useDemo();
  const restaurant = s.restaurants.find((r) => r.id === s.ownerRestaurantId)!;
  const isDiner = s.role !== 'restaurant';
  return (
    <Card style={{ gap: 10, borderColor: 'rgba(255,90,31,.35)' }}>
      <T size="tiny" weight="semibold" color={C.brandHi} style={{ letterSpacing: 1.4 }}>CONTROLES DE LA DEMO</T>
      <T size="small" color={C.text2}>
        {isDiner ? `Cambia al lado de ${restaurant.name} para aceptar tus propias reservas.` : 'Vuelve al lado del comensal para reservar y calificar.'}
      </T>
      <Button
        title={isDiner ? `Ver como ${restaurant.name}` : 'Ver como comensal'}
        icon={isDiner ? 'store' : 'user'}
        onPress={() => {
          setRole(isDiner ? 'restaurant' : 'diner');
          router.replace(isDiner ? '/negocio' : '/comensal');
        }}
      />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Adelantar 2 h" icon="fast" variant="dark" small style={{ flex: 1 }} onPress={() => { advanceClock(120); toast('Reloj de la demo +2 horas'); }} />
        <Button title="Reiniciar" icon="reset" variant="dark" small style={{ flex: 1 }} onPress={() => { resetDemo(); toast('Demo reiniciada'); }} />
      </View>
    </Card>
  );
}
