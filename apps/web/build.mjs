// Compila la PWA a dist/: un index.html, app.js, app.css y los archivos de public/.
// Uso: node build.mjs            (producción)
//      node build.mjs --watch    (desarrollo, sirve en http://localhost:5173)
// Variables opcionales: PLATTO_BASE (ruta donde se publica, por defecto "./").
import { build, context } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, 'dist');
const watch = process.argv.includes('--watch');
const version = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12);

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(resolve(here, 'public'), dist, { recursive: true });

// Variante para publicar como Artifact de Claude: sin <html>/<head> (el visor pone el esqueleto).
writeFileSync(
  resolve(dist, 'artifact.html'),
  [
    '<title>Platto</title>',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Figtree:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap">',
    '<link rel="stylesheet" href="app.css">',
    '<div id="root"></div>',
    '<script type="module" src="app.js"></script>',
    '',
  ].join('\n'),
);

// La versión invalida la caché del service worker en cada compilación.
const sw = readFileSync(resolve(here, 'public/sw.js'), 'utf8').replace('__PLATTO_VERSION__', version);
writeFileSync(resolve(dist, 'sw.js'), sw);

const options = {
  entryPoints: { app: resolve(here, 'src/main.tsx') },
  bundle: true,
  outdir: dist,
  format: 'esm',
  target: ['es2020', 'safari15'],
  jsx: 'automatic',
  minify: !watch,
  sourcemap: watch,
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production') },
  alias: { '@platto/core': resolve(here, '../../packages/core/src/index.ts') },
  // Permite compilar con React instalado fuera del proyecto (NODE_PATH).
  nodePaths: (process.env.NODE_PATH ?? '').split(':').filter(Boolean),
  loader: { '.svg': 'text' },
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  const { host, port } = await ctx.serve({ servedir: dist, port: 5173 });
  console.log(`Platto en http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
} else {
  await build(options);
  console.log(`✓ dist/ listo (versión ${version})`);
}
