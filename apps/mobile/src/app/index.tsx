// Bienvenida de la demo, o directo a la app según el rol elegido.
import { View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAGLINE } from '@platto/core';
import { setRole, setWelcomed, useDemo } from '@platto/demo';
import { LogoMark, Wordmark } from '@/components/Brand';
import { Button, T } from '@/components/ui';
import { C } from '@/lib/theme';

export default function Welcome() {
  const s = useDemo();
  const insets = useSafeAreaInsets();
  if (s.welcomed) return <Redirect href={s.role === 'restaurant' ? '/negocio' : '/comensal'} />;

  const go = (role: 'diner' | 'restaurant') => {
    setRole(role);
    setWelcomed();
    router.replace(role === 'restaurant' ? '/negocio' : '/comensal');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 }}>
        <LogoMark size={150} />
        <Wordmark height={34} />
        <T size="lead" weight="medium" color={C.text2}>{TAGLINE}</T>
        <T size="small" color={C.text3} style={{ textAlign: 'center', maxWidth: 300, marginTop: 8 }}>
          Mira cada plato en un video de 10 segundos antes de ir, reserva tu mesa y califica solo si fuiste.
        </T>
      </View>
      <View style={{ gap: 12 }}>
        <Button title="Explorar la demo" onPress={() => go('diner')} />
        <Button title="Ver como restaurante" variant="ghost" onPress={() => go('restaurant')} />
        <T size="tiny" color={C.text3} style={{ textAlign: 'center' }}>Demo con restaurantes de ejemplo en Cúcuta.</T>
      </View>
    </View>
  );
}
