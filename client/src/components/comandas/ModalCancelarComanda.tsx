import { useState } from 'react'
import { useComandasStore } from '../../store/comandasStore'
import { useToastStore } from '../../store/toastStore'
import { ApiError } from '../../lib/api'
import { METODO_LABEL } from '../../lib/impresion'
import { etiquetaComanda, esPedido } from '../../lib/etiqueta'
import { soles } from '../caja/ModalCobro'
import type { Comanda } from '../../types'
import { Loader2, X } from 'lucide-react'

// Cancelar una comanda entera (mesa o pedido por teléfono). Pide motivo: queda registrado.
// Lo que la cocina/bar aún no entregó se anula y les llega el aviso "NO PREPARAR".
export default function ModalCancelarComanda({ comanda, onCerrar, onCancelada }: {
  comanda: Comanda; onCerrar: () => void; onCancelada?: () => void
}) {
  const cancelarComanda = useComandasStore((s) => s.cancelarComanda)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const pedido = esPedido(comanda)
  const pagado = !!comanda.cobradaEn
  const enCocina = comanda.items.filter((i) => i.estado === 'en_preparacion' || i.estado === 'listo')
  const servidos = comanda.items.filter((i) => i.estado === 'servido')

  const confirmar = async () => {
    if (!motivo.trim() || enviando) return
    setEnviando(true); setError('')
    try {
      const r = await cancelarComanda(comanda.id, motivo.trim())
      useToastStore.getState().agregar({
        tipo: 'info',
        titulo: `${etiquetaComanda(comanda)} cancelada`,
        mensaje: r.reembolso > 0
          ? `Devuelve ${soles(r.reembolso)} al cliente (${METODO_LABEL[comanda.metodoPago ?? ''] ?? 'pago'})`
          : pedido ? 'No se había cobrado nada' : 'La mesa quedó libre',
        duracion: 9000,
      })
      onCancelada?.()
      onCerrar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sin conexión con el servidor: intenta de nuevo')
    } finally {
      setEnviando(false)
    }
  }

  const motivosRapidos = pedido
    ? ['El cliente canceló', 'No vino a recoger', 'Error al registrar', 'Sin stock']
    : ['El cliente se retiró', 'El cliente canceló', 'Mesa equivocada', 'Devolvieron todo']

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-gray-800">Cancelar {pedido ? 'pedido' : 'comanda'} · {etiquetaComanda(comanda)}</h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>
        {pagado && (
          <p className="text-sm bg-rojo-50 border border-rojo-200 text-rojo-700 rounded-lg px-3 py-2">
            Ya se cobró: al cancelar hay que <b>devolver {soles(comanda.totalCobrado ?? 0)}</b> al cliente
            y deja de contar en las ventas y en el arqueo de caja.
          </p>
        )}
        {enCocina.length > 0 && (
          <p className="text-sm bg-gold-50 border border-gold-200 text-gray-700 rounded-lg px-3 py-2">
            {enCocina.length} plato(s) ya se están preparando o están listos: se avisará a Cocina/Bar que <b>no los preparen</b>.
          </p>
        )}
        {servidos.length > 0 && (
          <p className="text-sm bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-3 py-2">
            {servidos.length} plato(s) ya se sirvieron y <b>no se cobrarán</b>.
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {motivosRapidos.map((m) => (
            <button key={m} onClick={() => setMotivo(m)}
              className={`px-2.5 py-1.5 rounded-full text-xs font-semibold ${motivo === m ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {m}
            </button>
          ))}
        </div>
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo de la cancelación *" autoFocus
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onCerrar} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Volver</button>
          <button onClick={confirmar} disabled={!motivo.trim() || enviando}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rojo-500 text-white rounded-xl text-sm font-bold hover:bg-rojo-600 disabled:opacity-50">
            {enviando && <Loader2 size={15} className="animate-spin" />} Cancelar {pedido ? 'pedido' : 'comanda'}
          </button>
        </div>
      </div>
    </div>
  )
}
