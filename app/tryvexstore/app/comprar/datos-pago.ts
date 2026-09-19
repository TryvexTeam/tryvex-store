/**
 * Datos de transferencia visibles para el comprador.
 *
 * Va en su propio módulo porque un archivo 'use server' solo puede exportar
 * funciones async; exportar un objeto desde ahí rompe el build de Next.
 */
export const DATOS_PAGO = {
  banco: 'Banco Estado',
  tipo: 'Cuenta Corriente',
  numero: '—',
  rut: '—',
  titular: 'Tryvex SpA',
  email: 'pagos@tryvexstore.cl',
  whatsapp: '56900000000',
}
