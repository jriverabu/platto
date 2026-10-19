// Completa app.json con valores que no van en el repositorio.
// GOOGLE_MAPS_ANDROID_KEY: llave gratuita de "Maps SDK for Android" (Google Cloud). Solo hace falta
// para compilar la app de Android que va a la tienda; en Expo Go el mapa funciona sin ella.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: { googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_KEY ?? '' } },
  },
});
