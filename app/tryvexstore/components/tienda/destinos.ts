import type { CategoriaTienda } from '@/lib/tienda'
import type { DestinoMenu } from './cabecera'

/**
 * Menú de la tienda, el mismo en portada, ficha y checkout.
 *
 * Las categorías se transportan dentro de Tienda; el segundo argumento
 * se mantiene por compatibilidad con las rutas existentes.
 */

export function destinosMenu(categorias: CategoriaTienda[], _base: '' | '/' = ''): DestinoMenu[] {
  return [
    { nombre: 'Inicio', href: '/', enlaces: [
      { nombre: 'Todo lo nuevo', href: '/#lo-nuevo' },
      { nombre: 'Producto destacado', href: '/#foco-titulo' },
      { nombre: 'Explora la colección', href: '/#galeria-titulo' },
      { nombre: 'Ofertas por volumen', href: '/#eco-titulo' },
      { nombre: 'Por qué Tryvex', href: '/#beneficios' },
    ] },
    { nombre: 'Tienda', href: '/tienda', categorias: categorias.map((c) => ({ nombre: c.nombre, href: `/tienda?cat=${encodeURIComponent(c.slug)}`, productos: c.productos.map((p) => ({ nombre: p.nombre, href: p.href, imagen: p.imagen, precio: p.precio })) })) },
    { nombre: 'Servicio al cliente', href: '/ayuda', enlaces: [
      { nombre: 'Centro de ayuda', href: '/ayuda' },
      { nombre: 'Preguntas frecuentes', href: '/ayuda/preguntas-frecuentes' },
      { nombre: 'Envíos', href: '/envios' },
      { nombre: 'Cambios y devoluciones', href: '/cambios-y-devoluciones' },
      { nombre: 'Contacto', href: '/contacto' },
    ] },
    { nombre: 'Acerca de nosotros', href: '/nosotros' },
  ]
}
