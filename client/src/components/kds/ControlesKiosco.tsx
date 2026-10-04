import { useEffect, useState } from 'react'
import { Maximize, Minimize } from 'lucide-react'

// Para las pantallas táctiles fijas de Cocina y Bar:
//  - botón de pantalla completa (oculta barras del navegador)
//  - mantiene la pantalla encendida mientras esta vista está abierta (Wake Lock)
//    — el navegador solo lo permite en https/localhost; en http simplemente no hace nada.
export default function ControlesKiosco() {
  const [completa, setCompleta] = useState(!!document.fullscreenElement)

  useEffect(() => {
    const onCambio = () => setCompleta(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onCambio)
    return () => document.removeEventListener('fullscreenchange', onCambio)
  }, [])

  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const pedir = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') {
          lock = await navigator.wakeLock.request('screen')
        }
      } catch { /* no soportado o sin https */ }
    }
    // El navegador suelta el bloqueo al cambiar de pestaña: se vuelve a pedir al regresar
    const onVisible = () => { if (document.visibilityState === 'visible') pedir() }
    pedir()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [])

  const alternar = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else document.documentElement.requestFullscreen().catch(() => {})
  }

  return (
    <button
      onClick={alternar}
      title={completa ? 'Salir de pantalla completa' : 'Pantalla completa'}
      className="flex items-center gap-2 px-3 min-h-11 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-semibold"
    >
      {completa ? <Minimize size={18} /> : <Maximize size={18} />}
      <span className="hidden md:inline">{completa ? 'Salir' : 'Pantalla completa'}</span>
    </button>
  )
}
