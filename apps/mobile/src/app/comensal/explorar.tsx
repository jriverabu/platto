// Explorar: búsqueda, categorías con íconos, zonas, promociones y «Cerca de mí» en lista o mapa.
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { CITY, distanceKm, formatPriceLevel } from '@platto/core';
import { featured, isRestaurantListed, livePromotions, ratingOf, useDemo, type DemoState } from '@platto/demo';
import { Chip, Empty, Header, Icon, IconButton, T, toast } from '@/components/ui';
import { RestaurantCard } from '@/components/RestaurantCard';
import { RestaurantMap } from '@/components/RestaurantMap';
import { requestLocation, useLocation } from '@/lib/location';
import { initials } from '@/lib/format';
import { C, F } from '@/lib/theme';

const CUISINE_ICON: Record<string, string> = { Parrilla: 'flame', Típica: 'bowl', Colombiana: 'bowl', Mariscos: 'fish', Vegetariana: 'leaf' };
type Restaurant = DemoState['restaurants'][number];

export default function Explore() {
  const s = useDemo();
  const loc = useLocation();
  const [query, setQuery] = useState('');
  const [zone, setZone] = useState<string | null>(null);
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [promoOnly, setPromoOnly] = useState(false);
  const [near, setNear] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selected, setSelected] = useState<string | null>(null);
  const [recenter, setRecenter] = useState(0);

  const listed = useMemo(() => s.restaurants.filter((r) => isRestaurantListed(s, r.id)), [s]);
  const zones = useMemo(() => [...new Set(listed.map((r) => r.zone))].sort(), [listed]);
  const cuisines = useMemo(() => [...new Set(listed.map((r) => r.cuisine))].sort(), [listed]);
  const distance = (r: Restaurant) => distanceKm(loc.point, r);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listed
      .filter((r) => !zone || r.zone === zone)
      .filter((r) => !cuisine || r.cuisine === cuisine)
      .filter((r) => !maxPrice || r.priceLevel <= maxPrice)
      .filter((r) => !promoOnly || livePromotions(s, r.id).length > 0)
      .filter((r) => {
        if (!q) return true;
        const dishes = s.dishes.filter((d) => d.restaurantId === r.id).map((d) => d.name.toLowerCase());
        return r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q) || dishes.some((d) => d.includes(q));
      })
      .sort((a, b) =>
        near ? distance(a) - distance(b) : Number(featured(s, b.id)) - Number(featured(s, a.id)) || (ratingOf(s, b.id).average ?? 0) - (ratingOf(s, a.id).average ?? 0),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s, listed, query, zone, cuisine, maxPrice, promoOnly, near, loc.point]);

  const points = useMemo(
    () => results.map((r) => ({ id: r.id, lat: r.lat, lng: r.lng, label: initials(r.name), title: r.name, hot: livePromotions(s, r.id).length > 0 })),
    [results, s],
  );
  const current = results.find((r) => r.id === selected) ?? results[0] ?? null;
  const showDistance = near || view === 'map';
  const open = (id: string) => router.push(`/restaurante/${id}`);

  const nearMe = async () => {
    setNear(true);
    const status = await requestLocation();
    if (status === 'denied') toast('Sin permiso de ubicación: medimos desde el centro de Cúcuta.');
    else if (status === 'unavailable') toast('No pudimos ubicarte: medimos desde el centro de Cúcuta.');
    setRecenter((n) => n + 1);
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
      <Header
        title="Explorar"
        right={
          <View style={{ flexDirection: 'row', padding: 3, borderRadius: 999, backgroundColor: C.surface2 }}>
            {(['list', 'map'] as const).map((v) => (
              <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: view === v }} onPress={() => setView(v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: 12, borderRadius: 999, backgroundColor: view === v ? C.surface3 : 'transparent' }}>
                <Icon name={v} size={16} color={view === v ? C.text : C.text3} />
                <T size="small" weight={view === v ? 'semibold' : 'medium'} color={view === v ? C.text : C.text3}>{v === 'list' ? 'Lista' : 'Mapa'}</T>
              </Pressable>
            ))}
          </View>
        }
      />
      <View style={{ paddingHorizontal: 16, gap: 16 }}>
        <T size="small" color={C.text3} style={{ marginTop: -10 }}>¿Qué se te antoja hoy?</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface2, borderRadius: 999, paddingHorizontal: 16, minHeight: 50 }}>
          <Icon name="search" size={20} color={C.text3} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar platos, restaurantes…"
            placeholderTextColor={C.text3}
            style={{ flex: 1, color: C.text, fontFamily: F.regular, fontSize: 15, minHeight: 48 }}
            accessibilityLabel="Buscar"
            returnKeyType="search"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
          {[null, ...cuisines].map((c) => {
            const on = cuisine === c;
            return (
              <Pressable key={c ?? 'todos'} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={c ?? 'Todos'} onPress={() => setCuisine(on && c ? null : c)} style={{ minWidth: 72, alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: on ? C.brand : C.lineStrong, backgroundColor: on ? C.brand : C.surface }}>
                <Icon name={c ? CUISINE_ICON[c] ?? 'bowl' : 'grid'} size={22} color={on ? C.onBrand : C.text} />
                <T size="tiny" weight="medium" color={on ? C.onBrand : C.text2}>{c ?? 'Todos'}</T>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ gap: 10 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            <Chip label="Cerca de mí" icon="locate" selected={near} onPress={() => (near ? setNear(false) : nearMe())} />
            <Chip label="Toda Cúcuta" selected={zone === null} onPress={() => setZone(null)} />
            {zones.map((z) => <Chip key={z} label={z} icon="pin" selected={zone === z} onPress={() => setZone(zone === z ? null : z)} />)}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
            <Chip label="Con promoción" icon="tag" selected={promoOnly} onPress={() => setPromoOnly(!promoOnly)} />
            {[2, 3].map((p) => <Chip key={p} label={`Hasta ${formatPriceLevel(p)}`} selected={maxPrice === p} onPress={() => setMaxPrice(maxPrice === p ? null : p)} />)}
          </ScrollView>
          {showDistance && (
            <T size="tiny" color={C.text3} accessibilityLiveRegion="polite">
              {loc.status === 'asking' ? 'Buscando tu ubicación…' : loc.fromUser ? 'Distancias desde donde estás.' : `Distancias desde el centro de ${CITY.name}.`}
            </T>
          )}
        </View>

        {results.length === 0 && <Empty title="Sin resultados" body="Prueba con otra zona o quita algún filtro." />}

        {view === 'map' && results.length > 0 && (
          <View style={{ gap: 12 }}>
            <View>
              <RestaurantMap points={points} center={loc.point} user={loc.fromUser ? loc.point : null} selectedId={current?.id ?? null} onSelect={setSelected} recenter={recenter} />
              <View style={{ position: 'absolute', left: 12, top: 12 }}>
                <IconButton icon="locate" label="Centrar en mi ubicación" onPress={nearMe} />
              </View>
            </View>
            {current && <RestaurantCard s={s} r={current} km={distance(current)} onPress={() => open(current.id)} />}
          </View>
        )}

        {view === 'list' && (
          <View style={{ gap: 12 }}>
            {results.map((r) => <RestaurantCard key={r.id} s={s} r={r} km={showDistance ? distance(r) : null} onPress={() => open(r.id)} />)}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
