import { useCallback, useEffect, useState } from 'react'
import Header from '../../components/layout/Header'
import { useMesasStore } from '../../store/mesasStore'
import { apiFetch, ApiError } from '../../lib/api'
import { Calendar, Clock, Users, Phone, Plus, X, Check, Trash2, Loader2, UserCheck } from 'lucide-react'

type EstadoReserva = 'pendiente' | 'confirmada' | 'cancelada' | 'completada'

interface Reserva {
  id: string
  clienteNombre: string
  clienteTel?: string | null
  fecha: string          // ISO (fecha y hora)
  personas: number
  mesaId?: string | null
  mesa?: { id: string; numero: number; zona: string } | null
  notas?: string | null
  estado: EstadoReserva
}

// `badgeBg`/`badgeText` (fondo SÓLIDO) para KPIs e insignia; `border` para la tarjeta
const ESTADO_CONFIG: Record<EstadoReserva, { label: string; border: string; badgeBg: string; badgeText: string }> = {
  pendiente:  { label: 'Pendiente',  border: 'border-rojo-400', badgeBg: 'bg-rojo-500', badgeText: 'text-white' },
  confirmada: { label: 'Confirmada', border: 'border-gold-400', badgeBg: 'bg-gold-500', badgeText: 'text-gray-900' },
  cancelada:  { label: 'Cancelada',  border: 'border-red-400',  badgeBg: 'bg-red-500',  badgeText: 'text-white' },
  completada: { label: 'Llegaron',   border: 'border-gray-300', badgeBg: 'bg-gray-400', badgeText: 'text-white' },
}

// Fecha LOCAL (no UTC): en Perú, después de las 7 p. m. toISOString ya da el día siguiente
const fechaLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const horaLocal = (iso: string) => new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500'
const errorDe = (e: unknown) => (e instanceof ApiError ? e.message : 'No se pudo guardar: revisa la conexión')

function ModalReserva({ fechaInicial, onGuardado, onCerrar }: { fechaInicial: string; onGuardado: () => void; onCerrar: () => void }) {
  const mesas = useMesasStore((s) => s.mesas)
  const [form, setForm] = useState({ nombre: '', telefono: '', fecha: fechaInicial, hora: '13:00', personas: '2', mesaId: '', nota: '' })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    const [y, m, d] = form.fecha.split('-').map(Number)
    const [hh, mm] = form.hora.split(':').map(Number)
    setEnviando(true); setError('')
    try {
      await apiFetch('/api/reservas', {
        method: 'POST',
        body: JSON.stringify({
          clienteNombre: form.nombre,
          clienteTel: form.telefono,
          fecha: new Date(y, m - 1, d, hh, mm).toISOString(),   // hora local → instante exacto
          personas: parseInt(form.personas),
          mesaId: form.mesaId || null,
          notas: form.nota,
        }),
      })
      onGuardado(); onCerrar()
    } catch (err) { setError(errorDe(err)); setEnviando(false) }
  }

  const mesasOrdenadas = [...mesas].sort((a, b) => a.numero - b.numero)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Nueva reserva</h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>
        <form onSubmit={guardar} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del cliente *</label>
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputCls} placeholder="Nombre completo" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input value={form.telefono} inputMode="tel" onChange={(e) => setForm({ ...form, telefono: e.target.value })} className={inputCls} placeholder="9xxxxxxxx" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Personas *</label>
              <input required type="number" min={1} max={100} value={form.personas} onChange={(e) => setForm({ ...form, personas: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
              <input required type="date" min={fechaLocal(new Date())} value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hora *</label>
              <input required type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Mesa (opcional)</label>
              <select value={form.mesaId} onChange={(e) => setForm({ ...form, mesaId: e.target.value })} className={inputCls}>
                <option value="">Sin asignar (se elige al llegar)</option>
                {mesasOrdenadas.map((m) => (
                  <option key={m.id} value={m.id}>Mesa {m.numero} · {m.zona} · {m.capacidad} pers.</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nota especial</label>
              <textarea value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} rows={2}
                className={`${inputCls} resize-none`} placeholder="Cumpleaños, alergias, preferencias..." />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCerrar} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={enviando} className="flex-1 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {enviando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar reserva
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TarjetaReserva({ reserva, esHoy, onEstado, onEliminar }: {
  reserva: Reserva; esHoy: boolean
  onEstado: (estado: EstadoReserva) => void
  onEliminar: () => void
}) {
  const cfg = ESTADO_CONFIG[reserva.estado]
  return (
    <div className={`bg-white rounded-xl border-2 p-4 ${cfg.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-gray-800 text-sm truncate">{reserva.clienteNombre}</h3>
            {esHoy && <span className="text-xs bg-gold-600 text-white px-1.5 py-0.5 rounded-full">Hoy</span>}
          </div>
          {reserva.clienteTel && (
            <a href={`tel:${reserva.clienteTel}`} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gold-600">
              <Phone size={11} /> {reserva.clienteTel}
            </a>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold shrink-0 ${cfg.badgeBg} ${cfg.badgeText}`}>{cfg.label}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="flex items-center gap-1 text-sm font-semibold text-gray-700"><Clock size={13} className="text-gray-400" />{horaLocal(reserva.fecha)}</div>
        <div className="flex items-center gap-1 text-xs text-gray-600"><Users size={12} className="text-gray-400" />{reserva.personas} pers.</div>
        <div className="text-xs text-gray-600 text-right">{reserva.mesa ? <>Mesa <strong>{reserva.mesa.numero}</strong></> : 'Sin mesa'}</div>
      </div>

      {reserva.notas && (
        <p className="text-xs bg-gold-500 text-gray-900 rounded-lg px-2 py-1 mb-3 font-medium">📝 {reserva.notas}</p>
      )}

      <div className="flex gap-2">
        {reserva.estado === 'pendiente' && (
          <button onClick={() => onEstado('confirmada')} className="flex-1 py-2 bg-gold-600 text-white rounded-lg text-xs font-semibold hover:bg-gold-700 flex items-center justify-center gap-1">
            <Check size={13} /> Confirmar
          </button>
        )}
        {(reserva.estado === 'pendiente' || reserva.estado === 'confirmada') && (
          <>
            <button onClick={() => onEstado('completada')} className="flex-1 py-2 bg-gray-700 text-white rounded-lg text-xs font-semibold hover:bg-gray-800 flex items-center justify-center gap-1">
              <UserCheck size={13} /> Llegó
            </button>
            <button onClick={() => onEstado('cancelada')} className="py-2 px-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 flex items-center justify-center gap-1">
              <X size={13} /> Cancelar
            </button>
          </>
        )}
        <button onClick={onEliminar} title="Eliminar" className="ml-auto p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function ReservasPage() {
  const hoy = fechaLocal(new Date())
  const [fechaFiltro, setFechaFiltro] = useState(hoy)
  const [delDia, setDelDia] = useState<Reserva[]>([])
  const [deHoy, setDeHoy] = useState<Reserva[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const [dia, hoyLista] = await Promise.all([
        apiFetch<Reserva[]>(`/api/reservas?desde=${fechaFiltro}&hasta=${fechaFiltro}`),
        fechaFiltro === hoy ? Promise.resolve(null) : apiFetch<Reserva[]>(`/api/reservas?desde=${hoy}&hasta=${hoy}`),
      ])
      setDelDia(dia); setDeHoy(hoyLista ?? dia); setError('')
    } catch (e) {
      setError(errorDe(e))
    } finally {
      setCargando(false)
    }
  }, [fechaFiltro, hoy])
  useEffect(() => { cargar() }, [cargar])

  const accion = async (fn: () => Promise<unknown>) => {
    try { await fn(); await cargar() } catch (e) { alert(errorDe(e)) }
  }
  const cambiarEstado = (r: Reserva, estado: EstadoReserva) =>
    accion(() => apiFetch(`/api/reservas/${r.id}`, { method: 'PATCH', body: JSON.stringify({ estado }) }))
  const eliminar = (r: Reserva) => {
    if (confirm(`¿Eliminar la reserva de ${r.clienteNombre}?`)) accion(() => apiFetch(`/api/reservas/${r.id}`, { method: 'DELETE' }))
  }

  const activasHoy = deHoy.filter((r) => r.estado !== 'cancelada')

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Reservas" subtitulo={`${activasHoy.length} reservas hoy · ${activasHoy.reduce((a, r) => a + r.personas, 0)} personas`} />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* KPIs de hoy */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['pendiente', 'confirmada', 'completada', 'cancelada'] as EstadoReserva[]).map((estado) => {
            const cfg = ESTADO_CONFIG[estado]
            const count = deHoy.filter((r) => r.estado === estado).length
            return (
              <div key={estado} className={`rounded-xl p-4 ${cfg.badgeBg}`}>
                <p className={`text-2xl font-bold ${cfg.badgeText}`}>{count}</p>
                <p className={`text-xs ${cfg.badgeText} opacity-80`}>{cfg.label} hoy</p>
              </div>
            )
          })}
        </div>

        {/* Toolbar */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value || hoy)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500 bg-white" />
            {fechaFiltro !== hoy && (
              <button onClick={() => setFechaFiltro(hoy)} className="text-sm text-gold-600 font-medium hover:underline">Hoy</button>
            )}
          </div>
          <button onClick={() => setModal(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-colors">
            <Plus size={16} /> Nueva reserva
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* Lista */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-3">
            Reservas del {new Date(`${fechaFiltro}T12:00:00`).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })} ({delDia.length})
          </h2>
          {cargando ? (
            <div className="flex justify-center py-10 text-gray-300"><Loader2 className="animate-spin" /></div>
          ) : delDia.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <Calendar size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Sin reservas para esta fecha</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {delDia.map((r) => (
                <TarjetaReserva key={r.id} reserva={r} esHoy={fechaFiltro === hoy}
                  onEstado={(e) => cambiarEstado(r, e)} onEliminar={() => eliminar(r)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {modal && <ModalReserva fechaInicial={fechaFiltro} onGuardado={cargar} onCerrar={() => setModal(false)} />}
    </div>
  )
}
