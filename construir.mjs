/* Pipeline completo de la landing. Un solo comando: node construir.mjs
   Olvidar el paso de WebP costaba 22 MB, asi que va encadenado. */
import { execFileSync } from 'node:child_process';

const paso = (titulo, archivo) => {
  console.log(`\n── ${titulo} ─────────────────────────────`);
  execFileSync('node', [archivo], { stdio: 'inherit' });
};

paso('Limpieza y rebranding', 'build.mjs');
paso('Imagenes a WebP', '_tools_webp.mjs');
console.log('\nListo. Servir con:  cd dist && python -m http.server 4173');
