// Los videos de la demo viven en apps/web/public/videos; aquí se empaquetan con la app.
// En producción vienen de Cloudflare Stream (HLS) y esto deja de usarse.
const FILES: Record<string, { video: number; poster: number }> = {
  'chorizo-santarrosano': { video: require('../../../web/public/videos/chorizo-santarrosano.mp4'), poster: require('../../../web/public/videos/chorizo-santarrosano.jpg') },
  'costilla-ahumada': { video: require('../../../web/public/videos/costilla-ahumada.mp4'), poster: require('../../../web/public/videos/costilla-ahumada.jpg') },
  'picana-al-carbon': { video: require('../../../web/public/videos/picana-al-carbon.mp4'), poster: require('../../../web/public/videos/picana-al-carbon.jpg') },
  'mute-cucuteno': { video: require('../../../web/public/videos/mute-cucuteno.mp4'), poster: require('../../../web/public/videos/mute-cucuteno.jpg') },
  'sobrebarriga-criolla': { video: require('../../../web/public/videos/sobrebarriga-criolla.mp4'), poster: require('../../../web/public/videos/sobrebarriga-criolla.jpg') },
  'arepa-choclo': { video: require('../../../web/public/videos/arepa-choclo.mp4'), poster: require('../../../web/public/videos/arepa-choclo.jpg') },
  'ceviche-pesca': { video: require('../../../web/public/videos/ceviche-pesca.mp4'), poster: require('../../../web/public/videos/ceviche-pesca.jpg') },
  'arroz-mariscos': { video: require('../../../web/public/videos/arroz-mariscos.mp4'), poster: require('../../../web/public/videos/arroz-mariscos.jpg') },
  'bowl-quinua': { video: require('../../../web/public/videos/bowl-quinua.mp4'), poster: require('../../../web/public/videos/bowl-quinua.jpg') },
};

function slugOf(src: string) {
  return src.replace(/^.*\//, '').replace(/\.(mp4|jpg)$/, '');
}

/** 'videos/mute-cucuteno.mp4' → recurso empaquetado; una URI de archivo (video subido) pasa tal cual. */
export function videoSource(src: string): number | string {
  return FILES[slugOf(src)]?.video ?? src;
}

export function posterSource(src: string | null): number | { uri: string } | null {
  if (!src) return null;
  const f = FILES[slugOf(src)];
  return f ? f.poster : { uri: src };
}
