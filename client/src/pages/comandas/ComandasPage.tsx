import { useState } from 'react'
import Header from '../../components/layout/Header'
import NuevaComanda from '../../components/comandas/NuevaComanda'
import ModalCancelarComanda from '../../components/comandas/ModalCancelarComanda'
import { useComandasStore } from '../../store/comandasStore'
import { useTurnoStore } from '../../store/turnoStore'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { ApiError } from '../../lib/api'
import { useCartaPublicaStore } from '../../store/cartaPublicaStore'
import type { Comanda, EstadoComanda } from '../../types'
import { etiquetaComanda, insigniaComanda } from '../../lib/etiqueta'
import {
  Clock, ClipboardList, CheckCircle, ChefHat, XCircle, CreditCard,
  Plus, PlayCircle, StopCircle, Users, Tag, Loader2, Receipt,
} from 'lucide-react'
import { imprimirPrecuenta } from '../../lib/impresion'
import { totalAPagar } from '../../components/caja/ModalCobro'

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
  const promo     = useCartaPublicaStore((s) => s.promociones.find((p) => p.id === comanda.tipoDescuento))
  const [cancelar, setCancelar] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow flex flex-col gap-3">
      {/* Header tarjeta */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gold-500 text-gray-900 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
            {insigniaComanda(comanda)}
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{etiquetaComanda(comanda)}</p>
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
        <div className="flex items-center gap-1.5 text-xs text-gray-900 bg-gold-500 rounded-lg px-2 py-1 font-medium">
          <Tag size={11} />
          {promo ? `${promo.emoji} ${promo.nombre} ${promo.porcentaje}%` : 'Descuento'}
        </div>
      )}

      {/* Nota general */}
      {comanda.notaGeneral && (
        <p className="text-xs text-gray-900 bg-amber-500 rounded-lg px-2 py-1 line-clamp-2 italic font-medium">
          📋 {comanda.notaGeneral}
        </p>
      )}

      {/* Ítems */}
      <div className="space-y-1">
        {comanda.items.filter((i) => i.estado !== 'devuelto' && i.estado !== 'cancelado').slice(0, 3).map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-600 truncate">{item.cantidad}× {item.nombre}</span>
            <span className="text-gray-400 shrink-0 ml-2">S/ {(item.cantidad * item.precioUnitario).toFixed(2)}</span>
          </div>
        ))}
        {comanda.items.filter((i) => i.estado !== 'devuelto' && i.estado !== 'cancelado').length > 3 && (
          <p className="text-xs text-gray-400">+{comanda.items.filter((i) => i.estado !== 'devuelto' && i.estado !== 'cancelado').length - 3} más...</p>
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
          <span className="font-bold text-gold-700">S/ {totalAPagar(comanda).toFixed(2)}</span>
        </div>
      </div>

      {/* Agregar / quitar ítems y precuenta */}
      {!cerrada && (
        <div className="flex gap-2">
          <button
            onClick={onAgregarItems}
            className="flex-[2] flex items-center justify-center gap-1.5 py-2 border border-steel-200 bg-steel-50 text-steel-700 rounded-lg text-xs font-semibold hover:bg-steel-100 transition-colors"
          >
            <Plus size={13} />
            Agregar / quitar platos
          </button>
          <button
            onClick={() => imprimirPrecuenta(comanda.id)}
            title="Imprimir precuenta para el cliente"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            <Receipt size={13} />
            Precuenta
          </button>
          <button
            onClick={() => setCancelar(true)}
            title="Cancelar la comanda (el cliente canceló o se devolvió todo)"
            className="px-2.5 flex items-center justify-center border border-rojo-200 text-rojo-600 rounded-lg hover:bg-rojo-50 transition-colors"
          >
            <XCircle size={15} />
          </button>
        </div>
      )}
      {cancelar && <ModalCancelarComanda comanda={comanda} onCerrar={() => setCancelar(false)} />}
    </div>
  )
}

// ── Panel Turno ──────────────────────────────────────────────────────────────

function PanelTurno() {
  const turno = useTurnoStore()
  const esAdmin = useAuthStore((s) => s.usuario?.rol === 'admin')
  const agregarToast = useToastStore((s) => s.agregar)
  const [seleccion, setSeleccion] = useState<string[]>([])   // mozos elegidos antes de abrir
  const [ocupado, setOcupado] = useState<string | null>(null)

  const ejecutar = async (clave: string, accion: () => Promise<void>) => {
    setOcupado(clave)
    try { await accion() }
    catch (e) {
      agregarToast({ tipo: 'error', titulo: 'Turno', mensaje: e instanceof ApiError ? e.message : 'No se pudo completar: revisa la conexión', duracion: 7000 })
    } finally { setOcupado(null) }
  }

  const tiempoTurno = () => {
    if (!turno.iniciadoEn) return ''
    const diff = Math.floor((Date.now() - new Date(turno.iniciadoEn).getTime()) / 60000)
    return diff < 60 ? `${diff} min` : `${Math.floor(diff / 60)}h ${diff % 60}m`
  }

  const chip = (activo: boolean) => `px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors disabled:opacity-50 ${
    activo ? 'bg-steel-500 text-white border-steel-500' : 'border-gray-200 text-gray-500 hover:border-steel-300 hover:text-steel-600'
  }`

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-2.5 h-2.5 rounded-full ${turno.activo ? 'bg-green-500' : 'bg-gray-300'}`} />
        <h3 className="text-sm font-bold text-gray-700">Turno de trabajo</h3>
        {turno.activo && (
          <span className="ml-auto text-xs text-gray-400 flex items-center gap-1"><Clock size={11} /> {tiempoTurno()}</span>
        )}
      </div>

      {turno.activo ? (
        <>
          <p className="text-xs text-gray-500">
            Abierto por <strong>{turno.iniciadoPor}</strong> a las {new Date(turno.iniciadoEn!).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
              <Users size={12} /> Mozos en turno ({turno.mozosEnTurno.length})
            </p>
            {esAdmin ? (
              <div className="flex flex-wrap gap-1.5">
                {turno.mozosDisponibles.map((m) => (
                  <button key={m.id} disabled={ocupado !== null}
                    onClick={() => ejecutar(m.id, () => turno.toggleMozo(m.id))}
                    className={chip(turno.estaEnTurno(m.id))}>
                    {ocupado === m.id ? '…' : m.nombre}
                  </button>
                ))}
                {turno.mozosDisponibles.length === 0 && (
                  <p className="text-xs text-gray-400">No hay usuarios con rol Mozo. Créalos en Usuarios.</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-600">
                {turno.mozosEnTurno.length ? turno.mozosEnTurno.map((m) => m.nombre).join(', ') : 'Ningún mozo asignado todavía'}
              </p>
            )}
          </div>
          {esAdmin && (
            <button disabled={ocupado !== null}
              onClick={() => {
                if (confirm('¿Cerrar el turno? Los mozos ya no podrán tomar pedidos nuevos.')) ejecutar('cerrar', turno.cerrarTurno)
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-rojo-600 text-white rounded-lg text-sm font-bold hover:bg-rojo-700 transition-colors disabled:opacity-50">
              {ocupado === 'cerrar' ? <Loader2 size={14} className="animate-spin" /> : <StopCircle size={14} />} Cerrar turno
            </button>
          )}
        </>
      ) : esAdmin ? (
        <div className="space-y-3">
          <p className="text-xs text-gray-400">Sin turno abierto: no se pueden tomar pedidos nuevos.</p>
          {turno.mozosDisponibles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">¿Quiénes trabajan hoy?</p>
              <div className="flex flex-wrap gap-1.5">
                {turno.mozosDisponibles.map((m) => (
                  <button key={m.id}
                    onClick={() => setSeleccion((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))}
                    className={chip(seleccion.includes(m.id))}>
                    {m.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button disabled={ocupado !== null}
            onClick={() => ejecutar('iniciar', async () => { await turno.iniciarTurno(seleccion); setSeleccion([]) })}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-steel-500 text-white rounded-lg text-sm font-bold hover:bg-steel-600 transition-colors disabled:opacity-50">
            {ocupado === 'iniciar' ? <Loader2 size={15} className="animate-spin" /> : <PlayCircle size={15} />}
            Iniciar turno{seleccion.length ? ` con ${seleccion.length} mozo${seleccion.length > 1 ? 's' : ''}` : ''}
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-400">Sin turno abierto. El administrador debe iniciarlo para tomar pedidos.</p>
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
                  <div key={estado} className={`rounded-xl p-4 ${cfg.badgeBg}`}>
                    <div className="flex items-center justify-between mb-1">
                      <Icon size={18} className={cfg.badgeColor} />
                      <span className={`text-2xl font-bold ${cfg.badgeColor}`}>{count}</span>
                    </div>
                    <p className={`text-xs ${cfg.badgeColor} opacity-80`}>{cfg.label}</p>
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
              <div className="mt-3 bg-steel-500 rounded-xl p-3">
                <p className="text-xs font-bold text-white mb-1.5">En turno ahora</p>
                <div className="space-y-1">
                  {turno.mozosEnTurno.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs text-white/90">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      {m.nombre}
                      <span className="ml-auto text-white/60">
                        {activas.filter((c) => c.mozo === m.nombre).length} mesa(s)
                      </span>
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
