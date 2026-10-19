// Planes: en la app real se paga con Mercado Pago (función subscription-checkout); aquí se simula.
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { PLANS, type Plan } from '@platto/core';
import { changePlan, useDemo } from '@platto/demo';
import { Badge, Button, Card, Header, Icon, Row, Sheet, T, attempt, toast } from '@/components/ui';
import { C } from '@/lib/theme';

export default function Plans() {
  const s = useDemo();
  const rid = s.ownerRestaurantId;
  const sub = s.subscriptions.find((x) => x.restaurantId === rid)!;
  const [checkout, setCheckout] = useState<Plan | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Planes" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28, gap: 16 }}>
        {(Object.keys(PLANS) as Plan[]).map((id) => {
          const p = PLANS[id];
          const current = sub.plan === id;
          return (
            <Card key={id} style={[{ gap: 10 }, current && { borderColor: C.brand, borderWidth: 2 }]}>
              <Row style={{ justifyContent: 'space-between' }}><T size="h2" weight="bold">{p.name}</T>{current && <Badge tone="ok" label="Tu plan" />}</Row>
              <T weight="semibold" color={C.text2}>[PRECIO] COP / mes</T>
              {p.features.map((f) => <Row key={f} gap={8}><Icon name="check" size={16} stroke={3} color={C.brand} /><T size="small">{f}</T></Row>)}
              {!current && <Button title={`Cambiar a ${p.name}`} onPress={() => setCheckout(id)} />}
            </Card>
          );
        })}
        <T size="tiny" color={C.text3}>El pago se hace con Mercado Pago (tarjeta, PSE o Nequi) y se renueva cada mes. Cancelas cuando quieras; tu menú y tus videos no se borran.</T>
      </ScrollView>
      <Sheet visible={!!checkout} onClose={() => setCheckout(null)} label="Pago">
        {checkout && (
          <>
            <T size="tiny" weight="semibold" color={C.text3} style={{ letterSpacing: 1.4 }}>MERCADO PAGO · DEMO</T>
            <T size="h2" weight="bold">Platto {PLANS[checkout].name}</T>
            <T size="small" color={C.text2}>En la app real aquí se abre el pago de Mercado Pago y la suscripción se activa cuando el pago se confirma.</T>
            <Button title="Simular pago aprobado" onPress={() => { attempt(() => changePlan(rid, checkout)); toast('Pago aprobado. Plan actualizado.'); setCheckout(null); router.back(); }} />
          </>
        )}
      </Sheet>
    </View>
  );
}
