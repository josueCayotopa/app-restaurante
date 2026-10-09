import type { Comanda } from '../types'

type ComandaEtiqueta = Pick<Comanda, 'numeroMesa'> & Partial<Pick<Comanda, 'tipo' | 'numero' | 'clienteNombre' | 'mesasUnidas'>>

export const esPedido = (c: Partial<Pick<Comanda, 'tipo'>>) => c.tipo === 'pedido'

// "Mesa 4 + 5" o "Pedido #12 · Juan"
export function etiquetaComanda(c: ComandaEtiqueta) {
  if (esPedido(c)) return `Pedido #${c.numero ?? ''}${c.clienteNombre ? ` · ${c.clienteNombre}` : ''}`
  return `Mesa ${c.numeroMesa}${c.mesasUnidas?.length ? ' + ' + c.mesasUnidas.join(' + ') : ''}`
}

// Lo que va en el círculo grande de las tarjetas: nº de mesa o 🛍 en pedidos
export const insigniaComanda = (c: ComandaEtiqueta) => (esPedido(c) ? '🛍' : String(c.numeroMesa))

// Pedidos por teléfono: cómo se entrega y cuánto se cobra aparte (igual que el servidor)
export type Modalidad = 'local' | 'llevar' | 'delivery'
// Descartables: S/ 1 c/u (por defecto uno por plato de cocina). Delivery: + S/ 3 de envío.
export const PRECIO_DESCARTABLE = 1
export const COSTO_DELIVERY = 3
export const MODALIDADES: Record<Modalidad, { label: string; kds: string; descartables: boolean; envio: number; emoji: string }> = {
  local:    { label: 'Comer aquí',  kds: 'COMER AQUÍ',  descartables: false, envio: 0,              emoji: '🍽' },
  llevar:   { label: 'Para llevar', kds: 'PARA LLEVAR', descartables: true,  envio: 0,              emoji: '🛍' },
  delivery: { label: 'Delivery',    kds: 'DELIVERY',    descartables: true,  envio: COSTO_DELIVERY, emoji: '🛵' },
}
export const cargoPedido = (m: Modalidad, descartables: number) =>
  (MODALIDADES[m].descartables ? Math.max(0, descartables) * PRECIO_DESCARTABLE : 0) + MODALIDADES[m].envio
// Los pedidos antiguos solo traen paraLlevar
export function modalidadDe(c: Partial<Pick<Comanda, 'modalidad' | 'paraLlevar'>>): Modalidad {
  if (c.modalidad === 'delivery' || c.modalidad === 'llevar') return c.modalidad
  if (c.modalidad === 'local') return 'local'
  return c.paraLlevar ? 'llevar' : 'local'
}
