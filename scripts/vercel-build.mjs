// Assembles the static site for Vercel: the village at /, the workbench at /lab and Three.js under /vendor.
// The API runs separately as Vercel Functions in api/.
import { cpSync, mkdirSync, renameSync, rmSync } from 'node:fs';

rmSync('site', { recursive: true, force: true });
cpSync('dist', 'site', { recursive: true });
renameSync('site/index.html', 'site/lab.html');
renameSync('site/world.html', 'site/index.html');
mkdirSync('site/vendor');
for (const file of ['three.module.js', 'three.core.js']) cpSync(`node_modules/three/build/${file}`, `site/vendor/${file}`);
console.log('Built site/ for Vercel.');
