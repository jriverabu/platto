import { View } from 'react-native';
import { formatDateShort, formatPromoDays, type Promotion } from '@platto/core';
import { Icon, T } from './ui';
import { C } from '@/lib/theme';

/** Fecha local YYYY-MM-DD → "vie 9 oct". */
export function dayLabel(day: string, timeZone: string) {
  return formatDateShort(new Date(`${day}T17:00:00Z`), timeZone);
}

export function PromoCard({ p, timeZone }: { p: Promotion; timeZone: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,90,31,.1)', borderWidth: 1, borderColor: 'rgba(255,90,31,.38)' }}>
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.brand, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="tag" size={18} color={C.onBrand} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <T size="tiny" weight="semibold" color={C.brandHi} style={{ letterSpacing: 1.4 }}>PROMOCIÓN</T>
        <T weight="semibold">{p.title}</T>
        {p.detail && <T size="small" color={C.text2}>{p.detail}</T>}
        <T size="tiny" color={C.text3}>{formatPromoDays(p.weekdays)} · hasta el {dayLabel(p.endsOn, timeZone)}</T>
      </View>
    </View>
  );
}
