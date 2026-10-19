// Editar o crear un plato y subir su video vertical de máximo 10 s.
// En iOS el selector deja recortar a 10 s; en Android se rechaza el video más largo con el aviso.
import { useState } from 'react';
import { Alert, Platform, ScrollView, Switch, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { RULES, checkVideo, formatCop } from '@platto/core';
import { deleteDish, saveDish, uploadDishVideo, useDemo } from '@platto/demo';
import { DishVideo } from '@/components/DishVideo';
import { Badge, Button, Card, Chip, Header, Icon, Row, T, attempt, toast } from '@/components/ui';
import { VIDEO_STATUS } from '@/lib/videoStatus';
import { posterSource } from '@/lib/videos';
import { C, F } from '@/lib/theme';

const TAGS = ['Vegetariano', 'Sin gluten', 'Picante', 'Para compartir', 'Nuevo'];

export default function DishEditor() {
  const params = useLocalSearchParams<{ id: string; categoria?: string }>();
  const s = useDemo();
  const rid = s.ownerRestaurantId;
  const [id, setId] = useState(params.id === 'nuevo' ? undefined : params.id);
  const dish = s.dishes.find((d) => d.id === id);
  const categories = s.categories.filter((c) => c.restaurantId === rid);
  const [form, setForm] = useState(() => ({
    name: dish?.name ?? '',
    description: dish?.description ?? '',
    price: dish ? String(dish.priceCop) : '',
    categoryId: dish?.categoryId ?? params.categoria ?? categories[0]?.id ?? '',
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

  const pick = async (camera: boolean) => {
    if (!id) return;
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['videos'],
      allowsEditing: true, // iOS: recortar en el selector
      videoMaxDuration: RULES.videoMaxSeconds,
      quality: 1,
    };
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast('Sin permiso para usar tus videos.', 'error');
      return;
    }
    const res = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    const asset = res.canceled ? null : res.assets[0];
    if (!asset) return;
    const seconds = (asset.duration ?? 0) / 1000;
    const issues = checkVideo({ durationSeconds: seconds, width: asset.width ?? 0, height: asset.height ?? 0 });
    const blocking = issues.filter((x) => x.level === 'error');
    if (blocking.length) {
      Alert.alert('Este video no sirve todavía', blocking.map((x) => x.message).join('\n') + (Platform.OS === 'android' ? '\n\nRecórtalo en la galería y vuelve a elegirlo.' : ''));
      return;
    }
    issues.filter((x) => x.level === 'warning').forEach((x) => toast(x.message));
    attempt(() => uploadDishVideo(id, { src: asset.uri, poster: null, duration: seconds, trimStart: 0 }), 'Video enviado a revisión. Platto lo revisa antes de publicarlo.');
  };

  const status = dish ? VIDEO_STATUS[dish.videoStatus] : null;
  const preview = dish?.candidate ?? dish?.video;

  return (
    <View style={{ flex: 1 }}>
      <Header title={id ? 'Editar plato' : 'Nuevo plato'} onBack={() => router.back()} right={<Button title="Guardar" small onPress={save} />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, gap: 20 }} keyboardShouldPersistTaps="handled">
        {id && dish ? (
          <Card style={{ gap: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T weight="semibold">Video del plato</T>
              {status && <Badge tone={status.tone} label={status.label} />}
            </Row>
            {preview ? (
              <View style={{ alignSelf: 'center', height: 300, aspectRatio: 9 / 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' }}>
                {preview.poster && <Image source={posterSource(preview.poster)} style={{ width: '100%', height: '100%' }} contentFit="cover" />}
                <DishVideo video={preview} active />
              </View>
            ) : (
              <T size="small" color={C.text3}>Sin video todavía. Los platos con video aparecen en Inicio.</T>
            )}
            {dish.videoStatus === 'rejected' && dish.reviewNote && <T size="small" color={C.bad}>Platto pidió cambios: {dish.reviewNote}</T>}
            {dish.candidate && dish.video && dish.videoStatus !== 'approved' && <T size="tiny" color={C.text3}>El video actual sigue visible hasta que se apruebe el nuevo.</T>}
            <T size="tiny" color={C.text3}>Vertical, entre {RULES.videoMinSeconds} y {RULES.videoMaxSeconds} segundos, el plato servido y con buena luz.</T>
            <Row gap={8}>
              <Button title="Grabar" icon="play" variant="dark" small style={{ flex: 1 }} onPress={() => pick(true)} />
              <Button title="Elegir video" icon="upload" small style={{ flex: 1 }} onPress={() => pick(false)} />
            </Row>
          </Card>
        ) : (
          <Card style={{ flexDirection: 'row', gap: 12 }}>
            <Icon name="play" />
            <T size="small" style={{ flex: 1 }}>Guarda el plato primero; después subes su video vertical de máximo 10 segundos.</T>
          </Card>
        )}

        <Field label="Nombre del plato">
          <TextInput value={form.name} maxLength={60} onChangeText={(v) => set('name', v)} placeholder="Costilla ahumada 12 horas" placeholderTextColor={C.text3} style={input} accessibilityLabel="Nombre del plato" />
        </Field>
        <Field label="Descripción">
          <TextInput value={form.description} maxLength={240} multiline onChangeText={(v) => set('description', v)} placeholder="Ingredientes y acompañamientos" placeholderTextColor={C.text3} style={[input, { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' }]} accessibilityLabel="Descripción" />
        </Field>
        <Field label="Precio (COP)">
          <TextInput value={form.price ? formatCop(price) : ''} keyboardType="number-pad" onChangeText={(v) => set('price', v)} placeholder="$46.000" placeholderTextColor={C.text3} style={input} accessibilityLabel="Precio" />
        </Field>
        <Field label="Categoría">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {categories.map((c) => <Chip key={c.id} label={c.name} selected={form.categoryId === c.id} onPress={() => set('categoryId', c.id)} />)}
          </View>
        </Field>
        <Field label="Etiquetas">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TAGS.map((t) => <Chip key={t} label={t} selected={form.tags.includes(t)} onPress={() => set('tags', form.tags.includes(t) ? form.tags.filter((x) => x !== t) : [...form.tags, t])} />)}
          </View>
        </Field>
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View><T weight="semibold">Disponible hoy</T><T size="small" color={C.text3}>Apágalo si se acaba</T></View>
          <Switch value={form.isAvailable} onValueChange={(v) => set('isAvailable', v)} trackColor={{ true: C.brand, false: C.surface3 }} thumbColor="#fff" accessibilityLabel="Disponible hoy" />
        </Card>
        {id && (
          <Button
            title="Borrar plato"
            icon="trash"
            variant="quiet"
            onPress={() =>
              Alert.alert('¿Borrar este plato?', 'Se quita del menú y de Inicio.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Borrar', style: 'destructive', onPress: () => { if (attempt(() => deleteDish(id), 'Plato borrado')) router.back(); } },
              ])
            }
          />
        )}
      </ScrollView>
    </View>
  );
}

const input = { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface, paddingHorizontal: 14, color: C.text, fontFamily: F.regular, fontSize: 15 } as const;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <T size="small" weight="semibold">{label}</T>
      {children}
    </View>
  );
}
