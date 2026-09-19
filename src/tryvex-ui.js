/* ────────────────────────────────────────────────────────────────
   Tryvex — controles de interfaz

   Apple deja en el HTML un montón de controles (flechas de galería,
   pestañas, botones de play) que su bundle conectaba. Sin ese bundle
   quedan visibles pero muertos: el usuario hace clic y no pasa nada,
   que es peor que no tenerlos.

   Regla de esta capa: cada control se conecta o se oculta. Ninguno
   se queda decorando.
   ──────────────────────────────────────────────────────────────── */
(() => {
  'use strict';

  const suave = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  const reporte = { paddles: 0, pestanas: 0, play: 0, ocultos: 0, explorador: 0 };

  const ocultar = (el, motivo) => {
    if (!el || el.dataset.tryvexOculto) return;
    el.hidden = true;
    el.dataset.tryvexOculto = motivo;
    // Un elemento oculto que conserva su rol sigue existiendo para un lector
    // de pantalla: anunciaba "6 de 6" cuando solo hay 5 paneles, y su
    // `aria-controls` apuntaba a un id que ya no existe. Se retira el rol y
    // la referencia rota, no solo el pixel.
    for (const nodo of [el, ...el.querySelectorAll('[role], [aria-controls]')]) {
      if (nodo.getAttribute('role')) nodo.removeAttribute('role');
      const ac = nodo.getAttribute('aria-controls');
      if (ac && !document.getElementById(ac)) {
        nodo.removeAttribute('aria-controls');
        nodo.removeAttribute('aria-selected');
      }
    }
    reporte.ocultos++;
  };

  /* ── 1. Explorador "Míralos en detalle" ──────────────────────────
     Reproduce el componente "all access pass" de Apple, verificado
     contra apple.com/cl/airpods-pro en vivo:

       · media[0] es `pin-center`: el fondo, siempre visible.
       · media[i+1] corresponde al control[i].
       · abrir una pildora = clase `expanded` + alto 56 -> 156px.
       · el medio se enciende por ESTILO EN LINEA, no por clase:
         display:grid; visibility:visible; opacity:1; pointer-events:auto.

     Toda la animacion la hace el CSS de Apple. Aca solo se alterna
     el estado; por eso esto son 40 lineas y no 400. */
  const explorador = () => {
    const seccion = document.querySelector('.section-product-viewer');
    if (!seccion) return;

    const medios = [...seccion.querySelectorAll('.product-viewer-media')];
    const controles = [...seccion.querySelectorAll('.control-item')];
    if (!controles.length || medios.length < controles.length + 1) return;

    const fondo = medios[0];               // pin-center
    const detalles = medios.slice(1);      // uno por control

    const encender = (el, on) => {
      if (on) {
        el.style.cssText =
          'pointer-events:auto;visibility:visible;display:grid;opacity:1;transform:none;';
        // Estos medios viven en un contenedor de area cero mientras la
        // pildora esta cerrada, y un elemento sin area nunca dispara
        // IntersectionObserver: su video no se cargaba jamas y el detalle se
        // abria mostrando solo el poster. Al encenderlo ya tiene tamano, asi
        // que este es el momento de pedir el archivo.
        const v = el.querySelector('video');
        if (v) {
          const comp = v.closest('.inline-media-component-container, .media-block');
          if (comp) comp.classList.remove('fallback', 'media-unloaded', 'static-fallback-only');
          v.muted = true; v.playsInline = true;
          if (v.preload === 'none') v.preload = 'auto';
          if (!v.dataset.tryvexCargado) { v.load(); v.dataset.tryvexCargado = '1'; }
          v.style.display = 'block';
          v.play().catch(() => {});
        }
      } else {
        el.style.cssText = '';
        el.querySelector('video')?.pause();
      }
    };

    // Estado inicial: solo el fondo.
    encender(fondo, true);
    detalles.forEach((m) => encender(m, false));

    const abiertoActual = () => controles.findIndex((li) => li.classList.contains('expanded'));

    /* En pantallas chicas el explorador no es una columna: es un carrusel
       horizontal. Medido en el original a 375px:
         · cerrado, las pildoras van en fila desde x=23 con 12px de hueco,
           cada una con su ancho natural;
         · al abrir una, las seis pasan a 295px (el ancho del viewport menos
           80) con 10px de hueco, y la abierta queda centrada en x=40.
       En desktop no hay ninguna transformacion: las seis en x=90. Por eso
       esto solo corre bajo small-breakpoint, y al salir de ahi limpia. */
    const MOVIL_INICIO = 23, MOVIL_HUECO = 12, MOVIL_HUECO_ABIERTO = 10, MOVIL_MARGEN = 80;

    const esMovil = () => document.documentElement.classList.contains('small-breakpoint');

    const colocar = (abiertoEn) => {
      if (!esMovil()) {
        // En desktop no hay carrusel: solo se retira lo que puso el movil.
        // El ancho de la tarjeta abierta lo fija `abrir()` y no se toca aca,
        // o se borraria justo despues de aplicarlo.
        controles.forEach((li) => {
          li.style.transform = '';
          if (!li.classList.contains('expanded')) li.style.width = '';
        });
        return;
      }
      if (abiertoEn < 0) {
        let x = MOVIL_INICIO;
        controles.forEach((li) => {
          li.style.width = '';
          const w = li.getBoundingClientRect().width;
          li.style.transform = `translate3d(${x}px, 0, 0)`;
          x += w + MOVIL_HUECO;
        });
        return;
      }
      const ancho = Math.max(160, innerWidth - MOVIL_MARGEN);
      const centro = (innerWidth - ancho) / 2;
      controles.forEach((li, k) => {
        li.style.width = ancho + 'px';
        li.style.transform =
          `translate3d(${centro + (k - abiertoEn) * (ancho + MOVIL_HUECO_ABIERTO)}px, 0, 0)`;
      });
    };

    const abrir = (i) => {
      const yaAbierto = controles[i].classList.contains('expanded');
      controles.forEach((li, k) => {
        const activo = !yaAbierto && k === i;
        li.classList.toggle('expanded', activo);
        // Apple fija alto Y ancho en linea al expandir. El ancho sale de
        // `--aap-expanded-width`, que su CSS ya define (423px a 1440) y que
        // nosotros no estabamos aplicando: la tarjeta se quedaba en su ancho
        // de reposo, 365px, y el parrafo se cortaba contra el borde.
        li.style.height = activo ? '156px' : '';
        li.style.width = activo
          ? (getComputedStyle(li).getPropertyValue('--aap-expanded-width').trim() || '423px')
          : '';
        if (detalles[k]) encender(detalles[k], activo);
      });
      colocar(yaAbierto ? -1 : i);
      mostrarControlesVisor(!yaAbierto, yaAbierto ? -1 : i);

      // El widget se abria sin decirlo: `aria-expanded` se quedaba en false
      // para siempre, asi que un lector de pantalla anunciaba una pildora
      // cerrada sobre un detalle abierto. En el original el atributo viaja
      // igual que la clase.
      controles.forEach((li, k) => {
        const b = li.querySelector('.control-item-open') || li;
        b.setAttribute('aria-expanded', String(!yaAbierto && k === i));
      });

      // Y el foco sigue al contenido revelado, como en el original, para que
      // quien navega con teclado no tenga que tabular a ciegas hasta el.
      if (!yaAbierto) {
        const cont = controles[i].querySelector('.control-item-content');
        if (cont) { cont.tabIndex = -1; cont.focus({ preventScroll: true }); }
      }
    };

    controles.forEach((li, i) => {
      li.style.pointerEvents = 'auto';
      const boton = li.querySelector('.control-item-open') || li;
      boton.addEventListener('click', (e) => { e.preventDefault(); abrir(i); });
      boton.setAttribute('aria-expanded', 'false');
    });

    // Las flechas de cada tarjeta mueven al detalle contiguo.
    controles.forEach((li, i) => {
      li.querySelector('.paddlenav-prev')?.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        abrir((i - 1 + controles.length) % controles.length);
      });
      li.querySelector('.paddlenav-next')?.addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        abrir((i + 1) % controles.length);
      });
    });

    // Flechas del visor y boton de cerrar: Apple los muestra solo cuando
    // hay una pildora abierta. Su CSS los deja en display:none esperando
    // al bundle.
    const contFlechas = seccion.querySelector('.paddlenav-container');
    const cerrar = seccion.querySelector('.close-button-wrapper');
    const prev = contFlechas?.querySelector('.paddlenav-prev');
    const next = contFlechas?.querySelector('.paddlenav-next');

    const mostrarControlesVisor = (abierto, i) => {
      // Bajo small-breakpoint el original oculta estas flechas por CSS
      // (`html.small-breakpoint .controls .paddlenav-container{display:none}`).
      // Un display en linea gana a esa regla, asi que en movil se deja vacio
      // y manda el CSS.
      if (contFlechas) contFlechas.style.display = esMovil() ? '' : (abierto ? 'flex' : 'none');
      // No basta con el display: su regla base las deja en `visibility:hidden`
      // y `transform:scale(0)` esperando la clase `visible` que ponia el
      // bundle. Sin ella el contenedor medía 0x0 y las flechas no aparecian.
      if (contFlechas) {
        contFlechas.classList.toggle('visible', abierto);
        contFlechas.style.transform = abierto ? 'scale(1)' : '';
      }
      // Mismo patron que las flechas: la clase `visible` levanta la
      // visibilidad, pero el boton sigue en scale(0) y opacidad 0 hasta que
      // el bundle lo anima. Medido en el original con el detalle abierto:
      // 44x44, escala 1, opacidad 1.
      const botonCerrar = cerrar?.querySelector('.close-button') || cerrar;
      if (botonCerrar) {
        botonCerrar.classList.toggle('visible', abierto);
        botonCerrar.style.transform = abierto ? 'scale(1)' : '';
        botonCerrar.style.opacity = abierto ? '1' : '';
      }
      if (cerrar) cerrar.style.display = abierto ? 'block' : 'none';
      if (prev) prev.disabled = i <= 0;
      if (next) next.disabled = i >= controles.length - 1;
    };
    mostrarControlesVisor(false, -1);
    colocar(-1);
    addEventListener('resize', () => colocar(abiertoActual()), { passive: true });

    prev?.addEventListener('click', (e) => { e.preventDefault(); const i = abiertoActual(); if (i > 0) abrir(i - 1); });
    next?.addEventListener('click', (e) => { e.preventDefault(); const i = abiertoActual(); if (i < controles.length - 1) abrir(i + 1); });
    cerrar?.querySelector('button')?.addEventListener('click', (e) => {
      e.preventDefault();
      const i = abiertoActual();
      if (i >= 0) abrir(i);   // volver a pulsar la misma la cierra
    });
    if (cerrar) { delete cerrar.dataset.tryvexOculto; cerrar.hidden = false; }

    reporte.explorador = controles.length;
    reporte.paddles += seccion.querySelectorAll('.paddlenav-button').length;
  };

  /* ── 2. Flechas de galería ───────────────────────────────────── */
  const conectarPaddles = (scroller) => {
    const seccion = scroller.closest('section') || document;
    const prev = seccion.querySelector('.paddlenav-prev');
    const next = seccion.querySelector('.paddlenav-next');
    if (!prev || !next) return;

    // Apple repite el par de flechas una vez por ítem. Sobra con uno.
    seccion.querySelectorAll('.paddlenav-button').forEach((b) => {
      if (b !== prev && b !== next) ocultar(b.closest('.control-item-nav') || b, 'paddle-duplicado');
    });

    const paso = () => {
      const item = scroller.querySelector('.tv-carrusel-item, .gallery-item, :scope > *');
      return item ? item.getBoundingClientRect().width + 20 : scroller.clientWidth * 0.8;
    };

    const estado = () => {
      const max = scroller.scrollWidth - scroller.clientWidth - 2;
      prev.disabled = scroller.scrollLeft <= 2;
      next.disabled = scroller.scrollLeft >= max;
    };

    prev.addEventListener('click', () => scroller.scrollBy({ left: -paso(), behavior: suave }));
    next.addEventListener('click', () => scroller.scrollBy({ left: paso(), behavior: suave }));
    scroller.addEventListener('scroll', estado, { passive: true });
    addEventListener('resize', estado, { passive: true });
    estado();
    reporte.paddles += 2;
  };

  /* ── 3. Pestañas ─────────────────────────────────────────────── */
  const pestanas = () => {
    for (const lista of document.querySelectorAll('[role="tablist"]')) {
      const tabs = [...lista.querySelectorAll('[role="tab"]')];
      if (tabs.length < 2) continue;

      // Si un panel no existe, la pestaña quedo huerfana: se retira ella,
      // no el grupo entero. Pasa cuando eliminamos una tarjeta cuyo medio
      // no venia en el material (Asistencia Auditiva).
      const vivos = [];
      for (const t of tabs) {
        const panel = document.getElementById(t.getAttribute('aria-controls') || '');
        if (panel) vivos.push({ tab: t, panel });
        else ocultar(t.closest('li') || t, 'pestana-sin-panel');
      }
      if (vivos.length < 2) continue;
      tabs.length = 0;
      tabs.push(...vivos.map((v) => v.tab));
      const paneles = vivos.map((v) => v.panel);

      const activar = (i) => {
        tabs.forEach((t, k) => {
          t.setAttribute('aria-selected', k === i ? 'true' : 'false');
          t.tabIndex = k === i ? 0 : -1;
          // El punto activo del dotnav se pinta con la clase `current`, en el
          // enlace y en su <li>. Sin moverla quedaban dos puntos encendidos:
          // el inicial y el recien pulsado. Medido en el original: la clase
          // viaja, no se acumula.
          t.classList.toggle('current', k === i);
          const li = t.closest('li');
          if (li) li.classList.toggle('current', k === i);
        });
        // Estas galerias no desplazan nada: apilan los paneles en la misma
        // celda del grid y deciden cual se ve con un `z-index` en linea que
        // el bundle del original reescribe en cada cambio. Medido en
        // apple.com: el que entra pasa a 2, el que sale a 1, el resto a 0.
        // Nosotros solo moviamos la clase `current`, asi que el panel viejo
        // seguia encima y pulsar una pestana no cambiaba nada a la vista.
        // Solo se toca a los que ya traen z-index en linea: es la firma de
        // este componente, y asi no se altera la galeria que si desplaza.
        // La pildora oscura que marca la pestana activa no es un fondo del
        // <a>: es un pseudo-elemento del contenedor `.tabnav-pill`, colocado
        // con dos variables en linea que el bundle reescribe. Sin ellas el
        // indicador se quedaba clavado en la primera pestana aunque el panel
        // cambiara. Medido en el original: --tabnav-indicator-width toma el
        // ancho del tab activo y --tabnav-indicator-start su desplazamiento
        // dentro de la lista.
        const pill = lista.closest('.tabnav-pill') || lista.querySelector('.tabnav-pill');
        const activo = tabs[i];
        if (pill && activo) {
          const li = activo.closest('li') || activo;
          pill.style.setProperty('--tabnav-indicator-width', Math.round(li.offsetWidth) + 'px');
          pill.style.setProperty('--tabnav-indicator-start', Math.round(li.offsetLeft) + 'px');
          pill.style.setProperty('--tabnav-scale', '1');
        }
        // El <li> activo tambien se marca con su propia clase, igual que en
        // el original.
        tabs.forEach((t, k) => {
          const li = t.closest('li');
          if (li) li.classList.toggle('tabnav-item-active', k === i);
        });

        // Cada panel trae ademas su propio parrafo, en un `.gallery-caption`
        // aparte que el original enciende y apaga con `display`. Sin
        // conmutarlo, el texto bajo las pestanas se quedaba en el de la
        // primera aunque la imagen ya fuera otra: la pestana parecia no
        // hacer nada. Solo se aplica cuando hay un pie por pestana.
        const contenedor = lista.closest('section') || document;
        const pies = [...contenedor.querySelectorAll('.gallery-caption')];
        // Se marca con `caption-show`, que es lo que su CSS espera
        // (`.fade-gallery .gallery-caption.caption-show{display:block}`).
        // Tocar `display` en linea no sirve: el valor vacio devuelve la
        // regla base, que es `display:none`.
        if (pies.length === tabs.length)
          pies.forEach((pie, k) => pie.classList.toggle('caption-show', k === i));

        const anterior = paneles.findIndex((p) => p.classList.contains('current'));
        paneles.forEach((p, k) => {
          p.classList.toggle('current', k === i);
          if (p.style.zIndex !== '') p.style.zIndex = k === i ? '2' : (k === anterior ? '1' : '0');
        });
        paneles[i].scrollIntoView({ behavior: suave, block: 'nearest', inline: 'center' });
      };

      tabs.forEach((t, i) => {
        t.addEventListener('click', () => activar(i));
        // Flechas para navegar con teclado, como manda el patrón ARIA.
        t.addEventListener('keydown', (e) => {
          const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          const n = (i + d + tabs.length) % tabs.length;
          tabs[n].focus();
          activar(n);
        });
      });

      const inicial = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
      activar(inicial);
      reporte.pestanas += tabs.length;
    }
  };

  /* ── 4. Play / pausa ─────────────────────────────────────────
     Apple pone estos botones en dos sitios: sobre un video suelto
     (.inline-media-ui) y sobre una galeria entera (.all-access-pass).
     En el segundo caso controlan TODOS los videos del bloque. */
  const play = () => {
    const botones = document.querySelectorAll(
      '.inline-media-ui-button, .play-pause-button, .inline-media-ui button'
    );

    for (const boton of botones) {
      // Ambito: el contenedor propio, o la seccion si gobierna la galeria.
      const ambito =
        boton.closest('.inline-media-component-container, .video-wrapper, figure') ||
        boton.closest('section');
      const videos = ambito ? [...ambito.querySelectorAll('video')] : [];

      if (!videos.length) { ocultar(boton, 'sin-video'); continue; }

      // El CSS de Apple no muestra este boton por si solo. Exige dos cosas
      // que su bundle hacia y el mirror congelo:
      //   1. que el contenedor NO lleve `fallback` / `media-unloaded`
      //      (con cualquiera de las dos, `.inline-media-ui` va a display:none),
      //   2. que la UI lleve el estado del ciclo: sin `loaded` el boton se
      //      queda en opacity:0 y pointer-events:none.
      // Medido: en nuestro dist el boton salia 0x0 con opacidad 0; en el
      // original, 36x36 con opacidad 1.
      // Dos familias de contenedor con reglas propias: el generico y el
      // `.media-block` de las galerias, que ademas se apaga entero con
      // `static-fallback-only` / `animation-static-end`. El mirror congelo
      // esa clase con el video ya cargado y descartable: medido, el boton
      // salia 0x0 solo por ella.
      const contenedor = boton.closest('.inline-media-component-container, .media-block');
      const ui = boton.closest('.inline-media-ui-button, .inline-media-ui, .inline-media-ui-text');

      const pintar = () => {
        const pausado = videos.every((v) => v.paused);
        const terminado = videos.length > 0 && videos.every((v) => v.ended);
        const listo = videos.some((v) => v.readyState >= 2);

        boton.setAttribute('aria-pressed', String(!pausado));
        boton.classList.toggle('paused', pausado);

        if (contenedor && listo)
          contenedor.classList.remove('fallback', 'media-unloaded', 'hide-ui',
                                      'static-fallback-only', 'animation-static-end');
        if (contenedor) {
          contenedor.classList.toggle('loaded', listo);
          contenedor.classList.toggle('playing', listo && !pausado);
          contenedor.classList.toggle('paused', listo && pausado && !terminado);
          contenedor.classList.toggle('ended', listo && terminado);
        }
        if (!ui) return;
        // `loading-empty` es el estado inicial de Apple: aun no hay nada que
        // controlar. Se sale de el en cuanto el primer video tiene datos.
        ui.classList.toggle('loading-empty', !listo);
        ui.classList.toggle('loading', false);
        ui.classList.toggle('loaded', listo);
        ui.classList.toggle('playing', listo && !pausado);
        ui.classList.toggle('paused', listo && pausado && !terminado);
        ui.classList.toggle('ended', listo && terminado);
        // El mirror tambien congelo esta clase en la UI misma.
        ui.classList.remove('fallback');
      };

      boton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pausado = videos.every((v) => v.paused);
        videos.forEach((v) => { if (pausado) v.play().catch(() => {}); else v.pause(); });
      });

      videos.forEach((v) => {
        for (const ev of ['play', 'pause', 'ended', 'loadeddata', 'canplay', 'emptied'])
          v.addEventListener(ev, pintar);
      });
      pintar();
      reporte.play++;
    }
  };

  /* ── 4b. Flechas de galería dentro del relato ────────────────
     Verificado en apple.com: NO hacen scroll. Mueven la clase `current`
     entre los .gallery-item (medido: del indice 2 al 5 de 17). Y no se
     ocultan al llegar al extremo: se deshabilitan, con opacidad .42.
     Una flecha gris dice "hay galeria y estas al inicio"; una flecha
     ausente no dice nada. */
  const flechasGaleria = () => {
    const grupos = new Map();
    for (const flecha of document.querySelectorAll('.paddlenav-arrow')) {
      const seccion = flecha.closest('section');
      if (!seccion) continue;
      if (!grupos.has(seccion)) grupos.set(seccion, []);
      grupos.get(seccion).push(flecha);
    }

    for (const [seccion, flechas] of grupos) {
      const items = [...seccion.querySelectorAll('.gallery-item')];
      if (items.length < 2) { flechas.forEach((f) => ocultar(f, 'galeria-sin-items')); continue; }

      const indice = () => {
        const i = items.findIndex((el) => el.classList.contains('current'));
        return i < 0 ? 0 : i;
      };

      const ir = (n) => {
        const destino = Math.max(0, Math.min(items.length - 1, n));
        items.forEach((el, k) => el.classList.toggle('current', k === destino));
        items[destino].scrollIntoView({ behavior: suave, block: 'nearest', inline: 'center' });
        pintar();
      };

      const pintar = () => {
        const i = indice();
        for (const f of flechas) {
          const atras = !!f.closest('.left-item') ||
                        /anterior|previous/i.test(f.getAttribute('aria-label') || '');
          f.disabled = atras ? i <= 0 : i >= items.length - 1;
        }
      };

      for (const f of flechas) {
        const atras = !!f.closest('.left-item') ||
                      /anterior|previous/i.test(f.getAttribute('aria-label') || '');
        f.addEventListener('click', (e) => { e.preventDefault(); ir(indice() + (atras ? -1 : 1)); });
        reporte.paddles++;
      }
      // El mirror congelo `current` en el elemento que estaba a la vista al
      // capturar: en la galeria de salud auditiva quedo en el segundo, con
      // las dos flechas habilitadas. Medido en el original: siempre arranca
      // en el primero, con la flecha izquierda deshabilitada.
      items.forEach((el, k) => el.classList.toggle('current', k === 0));
      pintar();
    }
  };

  /* ── 4c. Flechas de pestañas ─────────────────────────────────
     No desplazan nada: cambian la pestaña activa. */
  const flechasPestanas = () => {
    for (const flecha of document.querySelectorAll('.tabnav-paddle')) {
      const contenedor = flecha.closest('section') || document;
      const tabs = [...contenedor.querySelectorAll('[role="tab"]')];
      if (tabs.length < 2) { ocultar(flecha, 'sin-pestanas'); continue; }

      const haciaAtras = /anterior|previous/i.test(flecha.getAttribute('aria-label') || '');

      flecha.addEventListener('click', (e) => {
        e.preventDefault();
        const i = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
        const n = (i + (haciaAtras ? -1 : 1) + tabs.length) % tabs.length;
        tabs[n].click();
      });
      reporte.paddles++;
    }
  };

  /* ── 5. Lo que quedó sin destino ─────────────────────────────── */
  const limpiar = () => {
    // "Ver el video": el film vive en el CDN de Apple, no lo tenemos.
    document.querySelectorAll('[data-films-modal-link]').forEach((a) =>
      ocultar(a.closest('li, p, div') || a, 'film-no-disponible')
    );
    // Enlaces que dejamos en # durante la limpieza.
    document.querySelectorAll('a[data-enlace-pendiente]').forEach((a) => ocultar(a, 'enlace-muerto'));


  };

  const iniciar = () => {
    try { explorador(); } catch (e) { console.warn('[tryvex] explorador', e); }
    try { pestanas(); } catch (e) { console.warn('[tryvex] pestañas', e); }
    try { play(); } catch (e) { console.warn('[tryvex] play', e); }
    try { flechasGaleria(); } catch (e) { console.warn('[tryvex] flechas galería', e); }
    try { flechasPestanas(); } catch (e) { console.warn('[tryvex] flechas pestañas', e); }
    try { limpiar(); } catch (e) { console.warn('[tryvex] limpieza', e); }
    window.__tryvexUI = reporte;
  };

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
