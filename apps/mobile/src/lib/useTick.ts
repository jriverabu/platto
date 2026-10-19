import { useEffect, useState } from 'react';

/** Vuelve a pintar cada cierto tiempo, para cuentas regresivas y estados que vencen. */
export function useTick(ms = 30_000) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}
