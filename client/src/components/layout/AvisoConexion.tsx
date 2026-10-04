import { WifiOff, RefreshCw } from 'lucide-react'
import { useConexionStore } from '../../store/conexionStore'
import { useComandasStore } from '../../store/comandasStore'

// Franja superior: sin conexión con el servidor, o enviando lo que quedó en cola.
// En pantallas de Cocina/Bar es clave: sin este aviso parecería que "no llegan pedidos".
export default function AvisoConexion() {
  const conectado  = useConexionStore((s) => s.conectado)
  const pendientes = useComandasStore((s) => s.cola.length)
  const procesar   = useComandasStore((s) => s.procesarCola)

  if (conectado && pendientes === 0) return null

  if (!conectado) {
    return (
      <div className="bg-red-600 text-white px-4 py-2 flex items-center gap-2 text-sm font-semibold shrink-0">
        <WifiOff size={16} className="shrink-0" />
        <span className="flex-1">
          Sin conexión con el servidor — reconectando…
          {pendientes > 0 && ` ${pendientes} cambio${pendientes > 1 ? 's' : ''} guardado${pendientes > 1 ? 's' : ''} en este equipo, se enviarán solos.`}
        </span>
      </div>
    )
  }

  return (
    <div className="bg-gold-500 text-gray-900 px-4 py-2 flex items-center gap-2 text-sm font-semibold shrink-0">
      <RefreshCw size={16} className="shrink-0 animate-spin" />
      <span className="flex-1">Enviando {pendientes} cambio{pendientes > 1 ? 's' : ''} pendiente{pendientes > 1 ? 's' : ''}…</span>
      <button onClick={() => procesar()} className="px-3 py-1 rounded-lg bg-black/15 hover:bg-black/25 text-xs">
        Reintentar
      </button>
    </div>
  )
}
