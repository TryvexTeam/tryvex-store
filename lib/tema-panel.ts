/** Tema del panel. Módulo neutro: lo usan el servidor (layout) y el cliente (TemaPanel). */
export type Tema = 'claro' | 'oscuro'

export const COOKIE_TEMA_PANEL = 'panel-tema'

export const leerTema = (valor: string | undefined): Tema => (valor === 'oscuro' ? 'oscuro' : 'claro')
