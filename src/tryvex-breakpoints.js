/* ────────────────────────────────────────────────────────────────
   Tryvex — clases de entorno en <html>

   El mirror congeló las clases que el bundle de Apple mantiene vivas
   en el elemento raíz. Quedaron con los valores del momento de la
   captura: `small-breakpoint` y `no-enhanced` a cualquier ancho.

   Consecuencia medida contra apple.com/cl/airpods-pro:
     · `small-breakpoint` tiene 11 reglas y casi todas gobiernan el
       explorador "Míralos en detalle": oculta `.paddlenav-container`,
       fuerza opacidad 1 en los medios y anula el `clip-path`. Nuestra
       página se veía siempre en su variante móvil.
     · `no-enhanced` apaga 58 reglas de animación.

   Umbrales medidos por bisección sobre el original, no supuestos.
   ──────────────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const raiz = document.documentElement;

  // Anchos: los cuatro rangos de Apple.
  const ANCHO = { small: '(max-width: 734px)', medium: '(min-width: 735px) and (max-width: 1068px)',
                  large: '(min-width: 1069px) and (max-width: 1440px)', xlarge: '(min-width: 1441px)' };

  // clase -> media query. Alturas medidas contra el original por bisección.
  const REGLAS = {
    'small-breakpoint':    ANCHO.small,
    'mq-portrait':         '(orientation: portrait)',
    'mq-small-shortest':   `${ANCHO.small} and (max-height: 547px)`,
    'mq-small-shorter':    `${ANCHO.small} and (max-height: 620px)`,
    'mq-small-short':      `${ANCHO.small} and (max-height: 650px)`,
    'mq-medium-shorter':   `${ANCHO.medium} and (max-height: 465px)`,
    'mq-medium-short':     `${ANCHO.medium} and (max-height: 750px)`,
    'mq-large-short':      `${ANCHO.large} and (max-height: 540px)`,
    'mq-large-up-shorter': '(min-width: 1069px) and (max-height: 850px)',
    'mq-xlarge-short':     `${ANCHO.xlarge} and (max-height: 640px)`,
  };

  // Apple emite la clase y su negación; hay CSS que consulta las dos.
  const aplicar = (clase, activa) => {
    raiz.classList.toggle(clase, activa);
    raiz.classList.toggle('no-' + clase, !activa);
  };

  for (const [clase, consulta] of Object.entries(REGLAS)) {
    const mq = matchMedia(consulta);
    aplicar(clase, mq.matches);
    mq.addEventListener('change', (e) => aplicar(clase, e.matches));
  }

  /* Dos valores mas que el mirror dejo clavados en el elemento raiz.

     `--global-scrollbar-width: 15px` estaba escrito en el atributo style del
     <html>. El original lo recalcula en runtime y en un navegador con barra
     superpuesta vale 0. Los quince pixeles se propagan por toda la grilla:
     `--ric-column-min-width-12` y `--shared-media-gallery-width-single` los
     restan, y cada tarjeta de galeria salia 15px mas angosta que la del
     original, en los tres breakpoints medidos.

     `touch` / `desktop` describen el dispositivo, no el ancho: el mirror se
     capturo en un equipo de escritorio y quedo `no-touch desktop` incluso en
     un telefono. */
  const barra = innerWidth - document.documentElement.clientWidth;
  raiz.style.setProperty('--global-scrollbar-width', Math.max(0, barra) + 'px');
  addEventListener('resize', () => {
    const b = innerWidth - document.documentElement.clientWidth;
    raiz.style.setProperty('--global-scrollbar-width', Math.max(0, b) + 'px');
  }, { passive: true });

  const hayTactil = matchMedia('(hover: none) and (pointer: coarse)').matches;
  aplicar('touch', hayTactil);
  aplicar('desktop', !hayTactil);

  // `enhanced` es constante en el original: se enciende cuando su bundle
  // arranca y no vuelve a cambiar, tampoco al redimensionar.
  aplicar('enhanced', true);

  // Las 4 reglas que `enhanced` deja en opacity:0 esperan un ancestro
  // `.activated`. El HTML ya lo trae en los tres nodos que corresponden;
  // si alguna limpieza futura lo borra, se repone acá.
  for (const sel of ['.all-access-pass', '.controls', '.control-item-open'])
    document.querySelectorAll(sel).forEach((el) => el.classList.add('activated'));

  window.__tryvexBreakpoints = { enhanced: true, small: matchMedia(ANCHO.small).matches };
})();
