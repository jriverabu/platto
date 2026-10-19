// Metro para el monorepo: la app usa packages/core y packages/demo del repositorio
// y los videos de demostración de apps/web/public/videos, sin copiarlos.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  path.join(repoRoot, 'packages'),
  path.join(repoRoot, 'apps/web/public/videos'),
];

config.resolver.extraNodeModules = {
  '@platto/core': path.join(repoRoot, 'packages/core/src'),
  '@platto/demo': path.join(repoRoot, 'packages/demo/src'),
};

// Lo que importen packages/* (por ejemplo React) se resuelve como si lo importara esta app,
// para no mezclarlo con el React de la web que vive en la raíz del repositorio.
const appEntry = path.join(projectRoot, 'package.json');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromOutside = !context.originModulePath.startsWith(projectRoot + path.sep);
  const isPackage = !moduleName.startsWith('.') && !path.isAbsolute(moduleName);
  if (fromOutside && isPackage && !moduleName.startsWith('@platto/')) {
    return context.resolveRequest({ ...context, originModulePath: appEntry }, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
