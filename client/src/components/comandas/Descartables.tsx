import { Minus, Plus } from 'lucide-react'
import { PRECIO_DESCARTABLE, COSTO_DELIVERY, modalidadDe, MODALIDADES } from '../../lib/etiqueta'
import type { Comanda } from '../../types'

const soles = (n: number) => `S/ ${n.toFixed(2)}`

// Contador − n + de descartables (S/ 1 c/u)
export function ContadorDescartables({ valor, onCambiar, deshabilitado, auto }: {
  valor: number; onCambiar: (n: number) => void; deshabilitado?: boolean; auto?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onCambiar(Math.max(0, valor - 1))} disabled={deshabilitado || valor <= 0}
        title="Un descartable menos"
        className="w-7 h-7 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-40">
        <Minus size={13} />
      </button>
      <span className="w-6 text-center text-sm font-bold text-gray-800">{valor}</span>
      <button type="button" onClick={() => onCambiar(valor + 1)} disabled={deshabilitado}
        title="Un descartable más"
        className="w-7 h-7 rounded-full border border-steel-200 bg-steel-50 flex items-center justify-center text-steel-600 hover:bg-steel-500 hover:text-white disabled:opacity-40">
        <Plus size={13} />
      </button>
      {auto && <span className="text-[10px] text-gray-400 leading-tight">1 por plato</span>}
    </div>
  )
}

// Desglose de cargos extra de un pedido (descartables y envío del delivery)
export function cargosDe(c: Pick<Comanda, 'descartable' | 'descartables' | 'modalidad' | 'paraLlevar'>) {
  const m = modalidadDe(c)
  const total = c.descartable ?? 0
  const envio = m === 'delivery' ? COSTO_DELIVERY : 0
  // Pedidos anteriores al contador: se deduce de lo cobrado
  const n = MODALIDADES[m].descartables ? (c.descartables || Math.round(Math.max(0, total - envio) / PRECIO_DESCARTABLE)) : 0
  return { n, montoDescartables: Math.max(0, total - envio), envio, total }
}
export { soles as solesCargo }
