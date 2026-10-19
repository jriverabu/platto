import { StyleSheet } from 'react-native';
import { C } from '@/lib/theme';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  title: string;
  hot: boolean;
}

export const st = StyleSheet.create({
  box: { height: 420, borderRadius: 20, overflow: 'hidden', backgroundColor: '#131316', borderWidth: 1, borderColor: C.line },
  pin: { minWidth: 38, height: 38, paddingHorizontal: 8, borderRadius: 19, borderBottomLeftRadius: 4, borderWidth: 2, borderColor: C.bg, backgroundColor: C.surface3, alignItems: 'center', justifyContent: 'center' },
  hot: { backgroundColor: C.brandHi },
  on: { backgroundColor: C.brand },
});
