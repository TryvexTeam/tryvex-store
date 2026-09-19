/* ────────────────────────────────────────────────────────────────
   Tryvex — motion
   Reemplaza los plugins de Apple (AnimPlay / ViewportSourceOnce /
   PictureToggleSource) que venian en un bundle que no tenemos.
   Sin dependencias. ~3 KB.
   ──────────────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const sinMovimiento = matchMedia('(prefers-reduced-motion: reduce)');

  /* ── 1. Videos: cargar y reproducir al entrar en viewport ────────
     Apple los deja con preload="none" y su plugin los arranca. Sin el
     plugin quedan en negro. Cargamos tarde y reproducimos una vez. */
  const observarVideos = () => {
    const videos = [...document.querySelectorAll('video[data-inline-media]')];
    if (!videos.length) return 0;

    // OJO: observamos el CONTENEDOR, no el <video>. Apple deja el video en
    // display:none tras el fallback, y un elemento de area cero NUNCA dispara
    // IntersectionObserver: se muerde la cola y no arranca nunca.
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        const v = e.target.matches('video') ? e.target
                : e.target.querySelector('video[data-inline-media]');
        if (!v) continue;
        if (!e.isIntersecting) { if (!v.paused) v.pause(); continue; }

        if (v.preload === 'none') v.preload = 'auto';
        if (!v.dataset.tryvexCargado) { v.load(); v.dataset.tryvexCargado = '1'; }

        if (sinMovimiento.matches) continue;   // se queda el fallback estatico

        // Apple no reproduce video en pantallas chicas: deja la imagen
        // estatica. Verificado a 375px en apple.com/cl/airpods-pro, donde
        // el <video> queda en display:none. Forzarlo mete dos elementos en
        // el mismo grid y la imagen sale cortada. Ademas ahorra datos moviles.
        if (innerWidth < 735) continue;

        // PictureToggleSource: Apple mantiene el <video> oculto tras un
        // <picture class="fallback-frame"> y los intercambia cuando puede
        // pintar. Sin su bundle el video nunca aparece.
        const mostrarVideo = () => {
          // El mirror congelo el estado de carga del componente de Apple.
          // Mientras el contenedor lleve `fallback` o `media-unloaded`, su
          // propio CSS deja el <video> en display:none y apaga la UI: se ve
          // el poster estatico para siempre. Su bundle retira esas clases al
          // tener el primer fotograma; aca se hace en el mismo momento.
          const comp = v.closest('.inline-media-component-container, .media-block');
          if (comp) comp.classList.remove('fallback', 'media-unloaded', 'hide-ui',
                                          'static-fallback-only', 'animation-static-end');
          const ui = comp?.querySelector('.inline-media-ui, .inline-media-ui-button');
          if (ui) { ui.classList.remove('fallback', 'loading-empty'); ui.classList.add('loaded'); }
          v.style.display = 'block';
          // Apple le pone height:768px al video contando con que su bundle
          // lo dimensione. Al mostrarlo tal cual desborda el contenedor:
          // en movil parte la imagen por la mitad. Se contiene.
          v.style.maxHeight = '100%';
          v.style.maxWidth = '100%';
          v.style.height = 'auto';
          v.style.objectFit = 'contain';
          v.removeAttribute('aria-hidden');
          const fb = (v.closest('.video-wrapper') || v.parentElement)
            ?.querySelector('picture.fallback-frame');
          // opacity:0 deja el elemento ocupando su celda; hay que sacarlo
          // del flujo o suma su alto al del video.
          if (fb) { fb.style.opacity = '0'; fb.style.transition = 'opacity .45s ease';
                    setTimeout(() => { if (v.style.display === 'block') fb.style.display = 'none'; }, 460); }
        };
        if (v.readyState >= 2) mostrarVideo();
        else v.addEventListener('loadeddata', mostrarVideo, { once: true });

        const pr = v.play();
        if (pr && pr.catch) pr.catch(() => {   // autoplay bloqueado: volver al fallback
          v.style.display = '';
          const fb = (v.closest('.video-wrapper') || v.parentElement)
            ?.querySelector('picture.fallback-frame');
          if (fb) { fb.style.display = ''; fb.style.opacity = '1'; }
        });
      }
    }, { rootMargin: '200px 0px', threshold: 0.01 });

    // Buscar el primer ancestro que REALMENTE ocupe espacio. No basta con
    // .video-wrapper: varios miden 0x0 (estan dentro de galerias) y un
    // elemento de area cero nunca dispara IntersectionObserver.
    const cajaObservable = (v) => {
      let n = v.closest('.video-wrapper') || v.parentElement;
      for (let i = 0; i < 6 && n; i++) {
        const r = n.getBoundingClientRect();
        if (r.height > 0 && r.width > 0) return n;
        n = n.parentElement;
      }
      return v.closest('section') || v.parentElement;   // ultimo recurso
    };

    let observados = 0;
    videos.forEach((v) => {
      v.muted = true; v.playsInline = true;
      const caja = cajaObservable(v);
      if (caja) { caja.dataset.tryvexCaja = '1'; io.observe(caja); observados++; }
    });
    return observados;
  };

  /* ── 2. Handoff start-frame / end-frame ─────────────────────────
     Apple deja un poster inicial y otro final para que nunca se vea
     un hueco mientras decodifica. Los alternamos segun el estado. */
  const conectarFrames = () => {
    let n = 0;
    for (const v of document.querySelectorAll('video[data-inline-media]')) {
      const cont = v.closest('.video-wrapper') || v.parentElement;
      if (!cont) continue;
      const inicio = cont.querySelector('.start-frame');
      const fin = cont.querySelector('.end-frame');
      if (!inicio && !fin) continue;

      const mostrar = (el) => { if (el) el.style.opacity = '1'; };
      const ocultar = (el) => { if (el) el.style.opacity = '0'; };

      mostrar(inicio); ocultar(fin);
      v.addEventListener('playing', () => ocultar(inicio), { once: false });
      v.addEventListener('ended', () => { mostrar(fin); });
      n++;
    }
    return n;
  };

  /* ── 3. Reveals ─────────────────────────────────────────────────
     Si el navegador soporta animation-timeline, el CSS se encarga
     solo y esto no corre. Si no, IntersectionObserver de respaldo. */
  const revelar = () => {
    const soporta = CSS.supports('animation-timeline: view()');
    const objetivos = document.querySelectorAll('.tryvex-reveal');
    if (soporta || sinMovimiento.matches) {
      // el CSS lo maneja; o no hay que animar nada
      if (sinMovimiento.matches) objetivos.forEach((el) => el.classList.add('visible'));
      return { soporta, n: objetivos.length };
    }
    const io = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -12% 0px' });
    objetivos.forEach((el) => io.observe(el));
    return { soporta, n: objetivos.length };
  };

  /* ── 4. Secuencia scrubbeada sobre canvas ───────────────────────
     La firma de Apple. Frames extraidos del mp4 a webp. */
  const scrub = (seccion) => {
    const canvas = seccion.querySelector('.scrub-canvas');
    const total = +seccion.dataset.frames || 0;
    const base = seccion.dataset.seq;
    if (!canvas || !total || !base) return false;

    const ctx = canvas.getContext('2d', { alpha: false });
    const frames = new Array(total);
    let pedido = null, actual = -1;

    const url = (i) => `${base}/${String(i + 1).padStart(3, '0')}.webp`;

    const cargar = (i) => {
      if (i < 0 || i >= total || frames[i]) return Promise.resolve();
      const img = new Image();
      img.src = url(i);
      // decode() fuera del hilo principal: dibujar sin decodificar es lo que trabaja
      return img.decode().then(() => { frames[i] = img; }).catch(() => {});
    };

    const pintar = (i) => {
      const img = frames[i];
      if (!img || i === actual) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      actual = i;
      canvas.style.opacity = '1';
    };

    cargar(0).then(() => pintar(0));

    const alScrollear = () => {
      const r = seccion.getBoundingClientRect();
      const rango = r.height - window.innerHeight;
      if (rango <= 0) return;
      const p = Math.min(1, Math.max(0, -r.top / rango));
      const i = Math.min(total - 1, Math.round(p * (total - 1)));
      if (pedido !== null) return;
      pedido = requestAnimationFrame(() => {
        pedido = null;
        pintar(i);
        for (let k = i; k < Math.min(total, i + 8); k++) cargar(k);   // prefetch
      });
    };

    if (sinMovimiento.matches) { cargar(0).then(() => pintar(0)); return true; }
    addEventListener('scroll', alScrollear, { passive: true });
    addEventListener('resize', alScrollear, { passive: true });
    alScrollear();
    return true;
  };

  /* ── arranque ───────────────────────────────────────────────── */
  const iniciar = () => {
    const nVideos = observarVideos();
    const nFrames = conectarFrames();
    const rev = revelar();
    let nScrub = 0;
    document.querySelectorAll('.tryvex-scrub').forEach((s) => { if (scrub(s)) nScrub++; });

    window.__tryvexMotion = {
      videos: nVideos, framesConectados: nFrames,
      reveals: rev.n, revealsPorCSS: rev.soporta,
      scrubs: nScrub, reducido: sinMovimiento.matches,
    };
  };

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
