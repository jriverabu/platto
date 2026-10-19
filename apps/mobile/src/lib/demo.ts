// Arranque de la demo en el teléfono: guarda el estado con el almacenamiento clave-valor de Expo,
// así una reserva hecha hoy sigue ahí al volver a abrir la app.
import Storage from 'expo-sqlite/kv-store';
import { setDemoPersistence } from '@platto/demo';

let ready = false;

export function initDemo() {
  if (ready) return;
  ready = true;
  try {
    setDemoPersistence({
      load: (key) => Storage.getItemSync(key),
      save: (key, value) => Storage.setItemSync(key, value),
    });
  } catch {
    // Sin almacenamiento: la demo funciona igual, solo que empieza limpia cada vez.
  }
}
