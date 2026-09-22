import { useState } from 'react'
import Header from '../../components/layout/Header'
import NuevaComanda from '../../components/comandas/NuevaComanda'
import { useComandasStore } from '../../store/comandasStore'
import { useTurnoStore } from '../../store/turnoStore'
import type { Comanda, EstadoComanda, TipoDescuento } from '../../types'
import {
  Clock, ClipboardList, CheckCircle, ChefHat, XCircle, CreditCard,
  Plus, PlayCircle, StopCircle, Users, Tag,
} from 'lucide-react'

// ── Config estados ───────────────────────────────────────────────────────────

// KPIs arriba usan `bg`/`color` (tono suave); la tarjeta de comanda usa
// `badgeBg`/`badgeColor` (fondo SÓLIDO, más notorio).
const ESTADO_COMANDA: Record<EstadoComanda, { label: string; color: string; bg: string; badgeBg: string; badgeColor: string; icon: React.ElementType }> = {
  abierta:        { label: 'Abierta',    color: 'text-gray-600',  bg: 'bg-gray-100',  badgeBg: 'bg-gray-500',  badgeColor: 'text-white',    icon: ClipboardList },
  enviada_cocina: { label: 'En cocina',  color: 'text-rojo-700',  bg: 'bg-rojo-100',  badgeBg: 'bg-rojo-500',  badgeColor: 'text-white',    icon: ChefHat       },
  en_preparacion: { label: 'Preparando', color: 'text-gold-700',  bg: 'bg-gold-100',  badgeBg: 'bg-gold-500',  badgeColor: 'text-gray-900', icon: ChefHat       },
  lista:          { label: 'Lista',      color: 'text-gold-700',  bg: 'bg-gold-100',  badgeBg: 'bg-gold-600',  badgeColor: 'text-white',    icon: CheckCircle   },
  cerrada:        { label: 'Cerrada',    color: 'text-gray-400',  bg: 'bg-gray-50',   badgeBg: 'bg-gray-300',  badgeColor: 'text-gray-700', icon: CreditCard    },
  cancelada:      { label: 'Cancelada',  color: 'text-red-600',   bg: 'bg-red-50',    badgeBg: 'bg-red-500',   badgeColor: 'text-white',    icon: XCircle       },
}

const DESCUENTO_LABEL: Record<TipoDescuento, { label: string; emoji: string }> = {
  pnp:        { label: 'PNP 10%',       emoji: '👮' },
  cumpleaño:  { label: 'Cumpleañero 50%', emoji: '🎂' },
  clases2026: { label: 'Clases 10%',    emoji: '🎓' },
}

function tiempoTranscurrido(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  return diff < 60 ? `${diff} min` : `${Math.floor(diff / 60)}h ${diff % 60}m`
}

// ── Tarjeta de comanda ───────────────────────────────────────────────────────

function TarjetaComanda({
  comanda,
  onAgregarItems,
}: {
  comanda: Comanda
  onAgregarItems: () => void
}) {
  const cfg       = ESTADO_COMANDA[comanda.estado]
  const Icon      = cfg.icon
  const pendientes = comanda.items.filter((i) => i.estado === 'pendiente').length
  const listos    = comanda.items.filter((i) => i.estado === 'listo').length
  const devueltos = comanda.items.filter((i) => i.estado === 'devuelto').length
  const cerrada   = comanda.estado === 'cerrada' || comanda.estado === 'cancelada'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow flex flex-col gap-3">
      {/* Header tarjeta */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gold-500 text-gray-900 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
            {comanda.numeroMesa}
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Mesa {comanda.numeroMesa}</p>
            <p className="text-xs text-gray-400">{comanda.mozo}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${cfg.badgeBg} ${cfg.badgeColor}`}>
          <Icon size={11} />
          {cfg.label}
        </span>
      </div>

      {/* Descuento */}
      {comanda.tipoDescuento && (
        <div className="flex items-center gap-1.5 text-xs text-gold-700 bg-gold-50 border border-gold-200 rounded-lg px-2 py-1">
          <Tag size={11} />
          {DESCUENTO_LABEL[comanda.tipoDescuento].emoji} {DESCUENTO_LABEL[comanda.tipoDescuento].label}
        </div>
      )}

      {/* Nota general */}
      {comanda.notaGeneral && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 line-clamp-2 italic">
          📋 {comanda.notaGeneral}
        </p>
      )}

      {/* Ítems */}
      <div className="space-y-1">
        {comanda.items.filter((i) => i.estado !== 'devuelto').slice(0, 3).map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-600 truncate">{item.cantidad}× {item.nombre}</span>
            <span className="text-gray-400 shrink-0 ml-2">S/ {(item.cantidad * item.precioUnitario).toFixed(2)}</span>
          </div>
        ))}
        {comanda.items.filter((i) => i.estado !== 'devuelto').length > 3 && (
          <p className="text-xs text-gray-400">+{comanda.items.filter((i) => i.estado !== 'devuelto').length - 3} más...</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Clock size={12} />
          {tiempoTranscurrido(comanda.creadaEn)}
        </div>
        <div className="flex items-center gap-1.5 text-xs flex-wrap justify-end">
          {devueltos > 0 && (
            <span className="px-1.5 py-0.5 bg-rojo-600 text-white rounded font-semibold">
              ↩ {devueltos}
            </span>
          )}
          {pendientes > 0 && <span className="px-1.5 py-0.5 bg-gray-500 text-white rounded font-semibold">{pendientes} pend.</span>}
          {listos > 0    && <span className="px-1.5 py-0.5 bg-gold-500 text-gray-900 rounded font-semibold">{listos} listo(s)</span>}
          <span className="font-bold text-gold-700">S/ {comanda.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Botón agregar ítems */}
      {!cerrada && (
        <button
          onClick={onAgregarItems}
          className="w-full flex items-center justify-center gap-1.5 py-2 border border-steel-200 bg-steel-50 text-steel-700 rounded-lg text-xs font-semibold hover:bg-steel-100 transition-colors"
        >
          <Plus size={13} />
          Agregar ítems / cambiar plato
        </button>
      )}
    </div>
  )
}

// ── Panel Turno ──────────────────────────────────────────────────────────────

function PanelTurno() {
  const turno = useTurnoStore()

  const tiempoTurno = () => {
    if (!turno.iniciadoEn) return ''
    const diff = Math.floor((Date.now() - new Date(turno.iniciadoEn).getTime()) / 60000)
    return diff < 60 ? `${diff} min` : `${Math.floor(diff / 60)}h ${diff % 60}m`
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2.5 h-2.5 rounded-full ${turno.activo ? 'bg-green-500' : 'bg-gray-300'}`} />
        <h3 className="text-sm font-bold text-gray-700">Turno de trabajo</h3>
        {turno.activo && (
          <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
            <Clock size={11} />
            {tiempoTurno()}
          </span>
        )}
      </div>

      {turno.activo ? (
        <>
          <p className="text-xs text-gray-500">
            Iniciado por <strong>{turno.iniciadoPor}</strong>
          </p>
          {/* Mozos en turno */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
              <Users size={12} />
              Mozos activos
            </p>
            <div className="flex flex-wrap gap-1.5">
              {turno.mozosDisponibles.map((m) => (
                <button
                  key={m}
                  onClick={() => turno.toggleMozo(m)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    turno.mozosEnTurno.includes(m)
                      ? 'bg-steel-500 text-white border-steel-500'
                      : 'border-gray-200 text-gray-500 hover:border-steel-300 hover:text-steel-600'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={turno.cerrarTurno}
            className="w-full flex items-center justify-center gap-2 py-2 bg-rojo-600 text-white rounded-lg text-xs font-bold hover:bg-rojo-700 transition-colors"
          >
            <StopCircle size={14} />
            Cerrar turno
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-400">Sin turno activo. Los mozos no podrán crear comandas.</p>
          <button
            onClick={() => turno.iniciarTurno('Admin')}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-steel-500 text-white rounded-lg text-sm font-bold hover:bg-steel-600 transition-colors"
          >
            <PlayCircle size={15} />
            Iniciar turno
          </button>
        </div>
      )}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

export default function ComandasPage() {
  const comandas = useComandasStore((s) => s.comandas)
  const turno    = useTurnoStore()
  const activas  = comandas.filter((c) => c.estado !== 'cerrada' && c.estado !== 'cancelada')

  const [agregarA, setAgregarA] = useState<Comanda | null>(null)

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Comandas" subtitulo={`${activas.length} activas`} />

      <div className="flex-1 p-5 overflow-y-auto">
        <div className="flex flex-col lg:flex-row gap-5">

          {/* Columna principal */}
          <div className="flex-1 space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(['enviada_cocina', 'en_preparacion', 'lista', 'cerrada'] as EstadoComanda[]).map((estado) => {
                const cfg  = ESTADO_COMANDA[estado]
                const Icon = cfg.icon
                const count = comandas.filter((c) => c.estado === estado).length
                return (
                  <div key={estado} className={`rounded-xl p-4 border ${cfg.bg}`}>
                    <div className="flex items-center justify-between mb-1">
                      <Icon size={18} className={cfg.color} />
                      <span className={`text-2xl font-bold ${cfg.color}`}>{count}</span>
                    </div>
                    <p className={`text-xs ${cfg.color} opacity-80`}>{cfg.label}</p>
                  </div>
                )
              })}
            </div>

            {/* Lista */}
            <div>
              <h2 className="text-sm font-semibold text-gray-600 mb-3">Comandas activas</h2>
              {activas.length === 0 ? (
                <div className="text-center py-16 text-gray-300">
                  <ClipboardList size={48} className="mx-auto mb-3 opacity-40" />
                  <p>No hay comandas activas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {activas.map((c) => (
                    <TarjetaComanda
                      key={c.id}
                      comanda={c}
                      onAgregarItems={() => setAgregarA(c)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Turno */}
          <div className="lg:w-64 shrink-0">
            <PanelTurno />

            {/* Info turno */}
            {turno.activo && turno.mozosEnTurno.length > 0 && (
              <div className="mt-3 bg-steel-50 border border-steel-200 rounded-xl p-3">
                <p className="text-xs font-bold text-steel-700 mb-1.5">En turno ahora</p>
                <div className="space-y-1">
                  {turno.mozosEnTurno.map((m) => (
                    <div key={m} className="flex items-center gap-2 text-xs text-steel-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal agregar ítems a comanda existente */}
      {agregarA && (
        <NuevaComanda
          mesaId={agregarA.mesaId}
          numeroMesa={agregarA.numeroMesa}
          mesasUnidas={agregarA.mesasUnidas}
          comandaExistente={agregarA}
          onCerrar={() => setAgregarA(null)}
        />
      )}
    </div>
  )
}
