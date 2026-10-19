// Piezas de interfaz de Platto en React Native: texto con Poppins, botones, chips, insignias,
// tarjetas, avisos y hojas inferiores. Equivalen a las clases de apps/web/src/styles.css.
import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppError } from '@platto/demo';
import { C, F } from '@/lib/theme';
import { Icon } from './Icon';

export { Icon };

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------
type Weight = keyof typeof F;
const SIZES = { tiny: 11, small: 13, body: 15, lead: 17, h3: 19, h2: 23, h1: 30, display: 40 } as const;

export function T({
  size = 'body',
  weight = 'regular',
  color = C.text,
  style,
  ...rest
}: TextProps & { size?: keyof typeof SIZES; weight?: Weight; color?: string; style?: StyleProp<TextStyle> }) {
  const fontSize = SIZES[size];
  return (
    <Text
      {...rest}
      style={[{ fontFamily: F[weight], fontSize, color, lineHeight: Math.round(fontSize * (size === 'display' || size === 'h1' ? 1.15 : 1.45)) }, style]}
    />
  );
}

// ---------------------------------------------------------------------------
// Botones
// ---------------------------------------------------------------------------
type Variant = 'primary' | 'ghost' | 'dark' | 'quiet';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  small,
  style,
  loading,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: string;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  loading?: boolean;
  accessibilityLabel?: string;
}) {
  const bg = { primary: C.brand, ghost: 'transparent', dark: C.surface3, quiet: C.surface2 }[variant];
  const fg = variant === 'primary' ? C.onBrand : C.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: 1.5, borderColor: C.text },
        variant === 'primary' && !disabled && s.glow,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <T weight="semibold" size={small ? 'small' : 'body'} color={fg}>{title}</T>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, glass, active, size = 44 }: { icon: string; onPress?: () => void; label: string; glass?: boolean; active?: boolean; size?: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: glass ? C.glass : C.surface2, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <Icon name={icon} size={size * 0.48} color={active ? C.brand : C.text} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon, onDark }: { label: string; selected?: boolean; onPress?: () => void; icon?: string; onDark?: boolean }) {
  const fg = selected ? C.onBrand : onDark ? '#fff' : C.text2;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        s.chip,
        selected ? { backgroundColor: C.brand, borderColor: C.brand } : onDark ? { backgroundColor: 'rgba(14,14,16,.5)', borderColor: 'rgba(255,255,255,.22)' } : null,
      ]}
    >
      {icon && <Icon name={icon} size={15} color={fg} />}
      <T size="small" weight={selected ? 'semibold' : 'medium'} color={fg}>{label}</T>
    </Pressable>
  );
}

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: 'ok' | 'warn' | 'bad' | 'neutral' | 'brand' | 'dark'; icon?: string }) {
  const map = {
    ok: [C.okBg, C.ok],
    warn: [C.warnBg, C.warn],
    bad: [C.badBg, C.bad],
    neutral: [C.surface2, C.text2],
    brand: [C.brandSoft, C.brandHi],
    dark: [C.surface3, C.text],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[s.badge, { backgroundColor: bg }]}>
      {icon && <Icon name={icon} size={12} color={fg} stroke={2.4} />}
      <T size="tiny" weight="semibold" color={fg} numberOfLines={1} style={{ flexShrink: 1 }}>{label}</T>
    </View>
  );
}

export function Card({ children, style, onPress, label }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) {
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [s.card, { opacity: pressed ? 0.9 : 1 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

export function Row({ children, gap = 8, style, accessibilityLabel, accessibilityRole }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle>; accessibilityLabel?: string; accessibilityRole?: ViewProps['accessibilityRole'] }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]} accessibilityLabel={accessibilityLabel} accessibilityRole={accessibilityRole}>{children}</View>;
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <Row gap={2} accessibilityLabel={`${value} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => <Icon key={n} name={n <= value ? 'starFill' : 'star'} size={size} color={C.brand} />)}
    </Row>
  );
}

export function Header({ title, kicker, onBack, right }: { title: string; kicker?: string; onBack?: () => void; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      {onBack && <IconButton icon="back" label="Volver" onPress={onBack} />}
      <View style={{ flex: 1 }}>
        {kicker && <T size="tiny" weight="semibold" color={C.text3} style={{ letterSpacing: 1.4, textTransform: 'uppercase' }}>{kicker}</T>}
        <T size="h1" weight="bold">{title}</T>
      </View>
      {right}
    </View>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 36, paddingHorizontal: 12 }}>
      <T size="h3" weight="semibold" style={{ textAlign: 'center' }}>{title}</T>
      {body && <T size="small" color={C.text3} style={{ textAlign: 'center', maxWidth: 280 }}>{body}</T>}
      {action}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Hoja inferior
// ---------------------------------------------------------------------------
export function Sheet({ visible, onClose, children, label }: { visible: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} accessibilityLabel={label}>
      <Pressable style={s.scrim} onPress={onClose} accessibilityLabel="Cerrar" />
      <View style={[s.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={s.grabber} />
        {children}
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Avisos
// ---------------------------------------------------------------------------
type ToastMsg = { id: number; text: string; kind: 'ok' | 'error' };
let push: ((t: ToastMsg) => void) | null = null;
let seq = 0;

export function toast(text: string, kind: 'ok' | 'error' = 'ok') {
  push?.({ id: ++seq, text, kind });
}

/** Ejecuta una acción de la demo y muestra el error del negocio si lo hay. */
export function attempt(fn: () => void, success?: string): boolean {
  try {
    fn();
    if (success) toast(success);
    return true;
  } catch (error) {
    toast(error instanceof AppError ? error.message : 'Algo salió mal. Intenta de nuevo.', 'error');
    if (!(error instanceof AppError)) console.error(error);
    return false;
  }
}

export function ToastHost() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    push = setMsg;
    return () => {
      push = null;
    };
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  return (
    <View pointerEvents="none" style={[s.toast, { top: insets.top + 12 }, msg.kind === 'error' && { backgroundColor: '#3A1712', borderColor: 'rgba(255,128,112,.4)' }]} accessibilityLiveRegion="polite" role="status">
      <Icon name={msg.kind === 'error' ? 'close' : 'check'} size={18} color={msg.kind === 'error' ? C.bad : C.ok} stroke={2.6} />
      <T size="small" weight="medium" style={{ flex: 1 }}>{msg.text}</T>
    </View>
  );
}

export const s = StyleSheet.create({
  btn: { minHeight: 52, borderRadius: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnSmall: { minHeight: 40, paddingHorizontal: 14, borderRadius: 12 },
  glow: { shadowColor: C.brand, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  chip: { minHeight: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start', maxWidth: '100%' },
  card: { backgroundColor: C.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: C.line },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,.55)' },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 10, gap: 14, maxHeight: '88%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.lineStrong, marginBottom: 4 },
  toast: { position: 'absolute', left: 16, right: 16, zIndex: 100, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: C.surface2, borderWidth: 1, borderColor: C.lineStrong },
});
