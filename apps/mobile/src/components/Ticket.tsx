// Tarjeta tipo comprobante para reservas, con su línea de corte.
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { STATUS_LABEL, type ReservationStatus } from '@platto/core';
import { Badge } from './ui';
import { C } from '@/lib/theme';

export function Ticket({ children }: { children: ReactNode }) {
  return <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 18, gap: 10, borderWidth: 1, borderColor: C.line }}>{children}</View>;
}

export function Perforation() {
  return <View style={{ height: 1, backgroundColor: C.line, marginVertical: 4 }} />;
}

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const tone = status === 'confirmed' || status === 'completed' ? 'ok' : status === 'pending' ? 'warn' : 'bad';
  return <Badge tone={tone} label={STATUS_LABEL[status]} />;
}
