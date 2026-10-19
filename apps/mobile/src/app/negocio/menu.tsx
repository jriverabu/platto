// Modo restaurante · Menú: categorías, platos, precio, estado del video y disponible / agotado.
import { useState } from 'react';
import { Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { formatCop } from '@platto/core';
import { VIDEO_STATUS } from '@/lib/videoStatus';
import { addCategory, saveDish, useDemo } from '@platto/demo';
import { Badge, Button, Card, Header, Icon, Row, T, attempt } from '@/components/ui';
import { posterSource } from '@/lib/videos';
import { C, F } from '@/lib/theme';


export default function Menu() {
  const s = useDemo();
  const rid = s.ownerRestaurantId;
  const categories = s.categories.filter((c) => c.restaurantId === rid).sort((a, b) => a.position - b.position);
  const sub = s.subscriptions.find((x) => x.restaurantId === rid);
  const total = s.dishes.filter((d) => d.restaurantId === rid).length;
  const [newCat, setNewCat] = useState('');

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
      <Header kicker={`${total} platos · plan ${sub?.plan === 'pro' ? 'Pro (ilimitados)' : 'Esencial (hasta 30)'}`} title="Menú" />
      <View style={{ paddingHorizontal: 16, gap: 24 }}>
        {categories.map((c) => {
          const dishes = s.dishes.filter((d) => d.categoryId === c.id).sort((a, b) => a.position - b.position);
          return (
            <View key={c.id} style={{ gap: 10 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T size="h3" weight="bold">{c.name}</T>
                <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/plato/[id]', params: { id: 'nuevo', categoria: c.id } })} hitSlop={8}>
                  <T size="small" weight="semibold" color={C.brandHi}>+ Plato</T>
                </Pressable>
              </Row>
              <Card style={{ paddingVertical: 0, paddingHorizontal: 12 }}>
                {dishes.length === 0 && <T size="small" color={C.text3} style={{ paddingVertical: 14 }}>Sin platos todavía.</T>}
                {dishes.map((d, i) => {
                  const status = VIDEO_STATUS[d.videoStatus];
                  const poster = posterSource(d.video?.poster ?? null);
                  return (
                    <Row key={d.id} gap={12} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Editar ${d.name}`} onPress={() => router.push(`/plato/${d.id}`)} style={{ flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center', minWidth: 0 }}>
                        <View style={{ width: 52, height: 72, borderRadius: 10, overflow: 'hidden', backgroundColor: C.surface3, alignItems: 'center', justifyContent: 'center' }}>
                          {poster ? <Image source={poster} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Icon name="upload" size={18} color={C.text2} />}
                        </View>
                        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                          <T weight="semibold" numberOfLines={1}>{d.name}</T>
                          <T size="small" weight="semibold" color={C.text2}>{formatCop(d.priceCop)}</T>
                          <Badge tone={status.tone} label={status.label} />
                        </View>
                      </Pressable>
                      <View style={{ alignItems: 'center', gap: 2 }}>
                        <Switch
                          value={d.isAvailable}
                          onValueChange={(v) => { attempt(() => saveDish({ ...d, isAvailable: v }), v ? `${d.name} disponible` : `${d.name} marcado como agotado`); }}
                          trackColor={{ true: C.brand, false: C.surface3 }}
                          thumbColor="#fff"
                          accessibilityLabel={`Disponible: ${d.name}`}
                        />
                        <T size="tiny" color={C.text3}>{d.isAvailable ? 'Hay' : 'Agotado'}</T>
                      </View>
                    </Row>
                  );
                })}
              </Card>
            </View>
          );
        })}

        <Row gap={8}>
          <TextInput
            value={newCat}
            onChangeText={setNewCat}
            placeholder="Nueva categoría (ej. Postres)"
            placeholderTextColor={C.text3}
            accessibilityLabel="Nueva categoría"
            style={{ flex: 1, minWidth: 0, minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface, paddingHorizontal: 14, color: C.text, fontFamily: F.regular, fontSize: 15 }}
          />
          <Button title="Crear" variant="dark" disabled={!newCat.trim()} onPress={() => { if (attempt(() => addCategory(rid, newCat), 'Categoría creada')) setNewCat(''); }} />
        </Row>
      </View>
    </ScrollView>
  );
}
