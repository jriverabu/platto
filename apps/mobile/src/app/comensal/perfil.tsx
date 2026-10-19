import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { formatCop } from '@platto/core';
import { useDemo } from '@platto/demo';
import { DemoPanel } from '@/components/DemoPanel';
import { Card, Header, Icon, Row, T } from '@/components/ui';
import { posterSource } from '@/lib/videos';
import { C } from '@/lib/theme';

export default function Profile() {
  const s = useDemo();
  const me = s.people.find((p) => p.id === s.dinerId)!;
  const saved = s.dishes.filter((d) => s.saved.includes(d.id) && d.video);
  const visits = s.reservations.filter((r) => r.dinerId === s.dinerId && r.status === 'completed').length;
  const reviews = s.reviews.filter((r) => r.dinerId === s.dinerId).length;

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
      <Header title="Perfil" />
      <View style={{ paddingHorizontal: 16, gap: 24 }}>
        <Row gap={12}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
            <T size="h2" weight="bold" color={C.onBrand}>{me.name.split(' ').map((p) => p[0]).join('')}</T>
          </View>
          <View>
            <T size="h2" weight="bold">{me.name}</T>
            <T size="small" color={C.text3}>{visits} visitas · {reviews} reseñas verificadas</T>
          </View>
        </Row>

        <View style={{ gap: 10 }}>
          <T size="tiny" weight="semibold" color={C.text3} style={{ letterSpacing: 1.4 }}>GUARDADOS</T>
          {saved.length === 0 && <T size="small" color={C.text3}>Toca el marcador en un video para guardar platos aquí.</T>}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {saved.map((d) => {
              const poster = posterSource(d.video?.poster ?? null);
              return (
                <Pressable key={d.id} accessibilityRole="button" accessibilityLabel={d.name} onPress={() => router.push(`/restaurante/${d.restaurantId}`)} style={{ width: '31.8%', gap: 4 }}>
                  <View style={{ height: 150, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' }}>{poster && <Image source={poster} style={{ width: '100%', height: '100%' }} contentFit="cover" />}</View>
                  <T size="small" weight="semibold" numberOfLines={1}>{d.name}</T>
                  <T size="tiny" weight="semibold" color={C.text2}>{formatCop(d.priceCop)}</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Card style={{ paddingVertical: 0 }}>
          {[
            ['bell', 'Notificaciones', 'Confirmaciones, recordatorios y calificaciones'],
            ['shield', 'Privacidad', 'Solo mostramos tu nombre corto en las reseñas'],
          ].map(([icon, title, body], i) => (
            <Row key={title} gap={12} style={{ paddingVertical: 14, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
              <Icon name={icon!} />
              <View style={{ flex: 1 }}><T weight="semibold">{title}</T><T size="small" color={C.text3}>{body}</T></View>
            </Row>
          ))}
        </Card>

        <DemoPanel />
      </View>
    </ScrollView>
  );
}
