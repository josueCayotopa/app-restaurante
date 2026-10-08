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
export const MODALIDADES: Record<Modalidad, { label: string; kds: string; cargo: number; cargoLabel: string; emoji: string }> = {
  local:    { label: 'Comer aquí',  kds: 'COMER AQUÍ',  cargo: 0, cargoLabel: '',            emoji: '🍽' },
  llevar:   { label: 'Para llevar', kds: 'PARA LLEVAR', cargo: 1, cargoLabel: 'Descartable', emoji: '🛍' },
  delivery: { label: 'Delivery',    kds: 'DELIVERY',    cargo: 3, cargoLabel: 'Delivery',    emoji: '🛵' },
}
// Los pedidos antiguos solo traen paraLlevar
export function modalidadDe(c: Partial<Pick<Comanda, 'modalidad' | 'paraLlevar'>>): Modalidad {
  if (c.modalidad === 'delivery' || c.modalidad === 'llevar') return c.modalidad
  if (c.modalidad === 'local') return 'local'
  return c.paraLlevar ? 'llevar' : 'local'
}
