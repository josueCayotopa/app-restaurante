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
