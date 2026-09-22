import { Bell, Clock } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

interface HeaderProps {
  titulo: string
  subtitulo?: string
  acciones?: ReactNode
}

export default function Header({ titulo, subtitulo, acciones }: HeaderProps) {
  const [hora, setHora] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setHora(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="bg-white sticky top-0 z-30 border-b border-gray-200">
      {/* Franja de color superior: dorado → rojo → dorado */}
      <div className="h-1 bg-gradient-to-r from-gold-500 via-rojo-500 to-gold-500" />

      <div className="h-13 flex items-center justify-between px-4 md:px-6 py-2">
        {/* Izquierda: logo en móvil + título */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo solo en móvil (sidebar oculto) */}
          <img
            src="/logo.jpeg"
            alt="CADE"
            className="lg:hidden h-9 w-auto object-contain shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-sm md:text-base font-semibold text-gray-800 truncate leading-tight">
              {titulo}
            </h1>
            {subtitulo && (
              <p className="text-xs text-gray-400 truncate hidden sm:block leading-tight">
                {subtitulo}
              </p>
            )}
          </div>
        </div>

        {/* Derecha: acciones + reloj + campana */}
        <div className="flex items-center gap-3 shrink-0">
          {acciones}
          {/* Nombre restaurante en desktop */}
          <span className="hidden xl:block text-xs font-semibold text-gold-600 tracking-wide uppercase">
            Chicharronería CADE
          </span>
          <div className="hidden sm:flex items-center gap-1.5 text-gray-500 text-sm">
            <Clock size={14} />
            <span className="font-mono tabular-nums">
              {hora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
          <button className="relative p-1.5 text-gray-500 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-colors">
            <Bell size={18} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-rojo-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  )
}
