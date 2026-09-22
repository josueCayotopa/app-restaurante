import { useState } from 'react'
import Header from '../../components/layout/Header'
import { Calendar, Clock, Users, Phone, Plus, X, Check, Trash2 } from 'lucide-react'

interface Reserva {
  id: string
  nombre: string
  telefono: string
  fecha: string
  hora: string
  personas: number
  mesa?: number
  nota?: string
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
}

const reservasIniciales: Reserva[] = [
  { id: 'r1', nombre: 'Juan Pérez', telefono: '987654321', fecha: '2026-09-11', hora: '13:00', personas: 4, mesa: 4, estado: 'confirmada', nota: 'Cumpleaños, necesitan torta' },
  { id: 'r2', nombre: 'María García', telefono: '912345678', fecha: '2026-09-11', hora: '20:00', personas: 2, mesa: 12, estado: 'pendiente' },
  { id: 'r3', nombre: 'Carlos Ríos', telefono: '945678901', fecha: '2026-09-12', hora: '13:30', personas: 6, estado: 'pendiente', nota: 'Mesa con vista' },
  { id: 'r4', nombre: 'Ana Torres', telefono: '956789012', fecha: '2026-09-12', hora: '20:30', personas: 3, mesa: 7, estado: 'confirmada' },
]

// `color`/`bg` (tono suave) para KPIs; `border`/`badgeBg`/`badgeText`
// (fondo SÓLIDO en la insignia) para la tarjeta de reserva.
const ESTADO_CONFIG = {
  pendiente:  { label: 'Pendiente',  color: 'text-rojo-700', bg: 'bg-rojo-50 border-rojo-200',   border: 'border-rojo-400', badgeBg: 'bg-rojo-500', badgeText: 'text-white' },
  confirmada: { label: 'Confirmada', color: 'text-gold-700', bg: 'bg-gold-50 border-gold-200',   border: 'border-gold-400', badgeBg: 'bg-gold-500', badgeText: 'text-gray-900' },
  cancelada:  { label: 'Cancelada',  color: 'text-red-600',  bg: 'bg-red-50 border-red-200',     border: 'border-red-400',  badgeBg: 'bg-red-500',  badgeText: 'text-white' },
  completada: { label: 'Completada', color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200',   border: 'border-gray-300', badgeBg: 'bg-gray-400', badgeText: 'text-white' },
}

function ModalReserva({ onGuardar, onCerrar }: { onGuardar: (r: Reserva) => void; onCerrar: () => void }) {
  const [form, setForm] = useState({
    nombre: '', telefono: '', fecha: '', hora: '13:00', personas: 2, mesa: '', nota: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGuardar({
      id: `r${Date.now()}`,
      nombre: form.nombre,
      telefono: form.telefono,
      fecha: form.fecha,
      hora: form.hora,
      personas: form.personas,
      mesa: form.mesa ? parseInt(form.mesa) : undefined,
      nota: form.nota || undefined,
      estado: 'pendiente',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Nueva Reserva</h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre del cliente *</label>
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
                placeholder="Nombre completo" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
                placeholder="9xxxxxxxx" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Personas *</label>
              <input required type="number" min={1} max={20} value={form.personas}
                onChange={(e) => setForm({ ...form, personas: parseInt(e.target.value) })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
              <input required type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hora *</label>
              <input required type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Mesa asignada (opcional)</label>
              <input type="number" min={1} value={form.mesa} onChange={(e) => setForm({ ...form, mesa: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
                placeholder="Nº de mesa" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nota especial</label>
              <textarea value={form.nota} onChange={(e) => setForm({ ...form, nota: e.target.value })} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500 resize-none"
                placeholder="Cumpleaños, alergias, preferencias..." />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCerrar} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" className="flex-1 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 flex items-center justify-center gap-2">
              <Check size={15} /> Guardar reserva
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TarjetaReserva({ reserva, onConfirmar, onCancelar, onEliminar }: {
  reserva: Reserva
  onConfirmar: () => void
  onCancelar: () => void
  onEliminar: () => void
}) {
  const cfg = ESTADO_CONFIG[reserva.estado]
  const esHoy = reserva.fecha === new Date().toISOString().split('T')[0]

  return (
    <div className={`bg-white rounded-xl border-2 p-4 ${cfg.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-gray-800 text-sm">{reserva.nombre}</h3>
            {esHoy && <span className="text-xs bg-gold-600 text-white px-1.5 py-0.5 rounded-full">Hoy</span>}
          </div>
          {reserva.telefono && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Phone size={11} />
              {reserva.telefono}
            </div>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}>
          {cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Calendar size={12} className="text-gray-400" />
          {reserva.fecha}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Clock size={12} className="text-gray-400" />
          {reserva.hora}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-600">
          <Users size={12} className="text-gray-400" />
          {reserva.personas} pers.
        </div>
      </div>

      {reserva.mesa && (
        <p className="text-xs text-gray-500 mb-2">Mesa asignada: <strong>{reserva.mesa}</strong></p>
      )}
      {reserva.nota && (
        <p className="text-xs bg-rojo-50 text-rojo-700 border border-rojo-100 rounded-lg px-2 py-1 mb-3">
          📝 {reserva.nota}
        </p>
      )}

      <div className="flex gap-2">
        {reserva.estado === 'pendiente' && (
          <>
            <button onClick={onConfirmar} className="flex-1 py-1.5 bg-gold-600 text-white rounded-lg text-xs font-medium hover:bg-gold-700 flex items-center justify-center gap-1">
              <Check size={12} /> Confirmar
            </button>
            <button onClick={onCancelar} className="flex-1 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 flex items-center justify-center gap-1">
              <X size={12} /> Cancelar
            </button>
          </>
        )}
        <button onClick={onEliminar} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>(reservasIniciales)
  const [modal, setModal] = useState(false)
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0])

  const hoy = new Date().toISOString().split('T')[0]
  const reservasHoy = reservas.filter((r) => r.fecha === hoy && r.estado !== 'cancelada')
  const reservasFiltradas = reservas.filter((r) => r.fecha === fechaFiltro)

  const cambiarEstado = (id: string, estado: Reserva['estado']) =>
    setReservas((prev) => prev.map((r) => (r.id === id ? { ...r, estado } : r)))

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Reservas" subtitulo={`${reservasHoy.length} reservas hoy`} />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* KPIs hoy */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['pendiente', 'confirmada', 'cancelada', 'completada'] as Reserva['estado'][]).map((estado) => {
            const cfg = ESTADO_CONFIG[estado]
            const count = reservas.filter((r) => r.estado === estado && r.fecha === hoy).length
            return (
              <div key={estado} className={`rounded-xl p-4 border ${cfg.bg}`}>
                <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
                <p className={`text-xs ${cfg.color} opacity-80`}>{cfg.label} hoy</p>
              </div>
            )
          })}
        </div>

        {/* Toolbar */}
        <div className="flex gap-3 items-center">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500 bg-white"
            />
          </div>
          <button
            onClick={() => setModal(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-colors"
          >
            <Plus size={16} /> Nueva reserva
          </button>
        </div>

        {/* Lista */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-3">
            Reservas del {fechaFiltro} ({reservasFiltradas.length})
          </h2>
          {reservasFiltradas.length === 0 ? (
            <div className="text-center py-16 text-gray-300">
              <Calendar size={48} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Sin reservas para esta fecha</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reservasFiltradas.map((r) => (
                <TarjetaReserva
                  key={r.id}
                  reserva={r}
                  onConfirmar={() => cambiarEstado(r.id, 'confirmada')}
                  onCancelar={() => cambiarEstado(r.id, 'cancelada')}
                  onEliminar={() => setReservas((prev) => prev.filter((x) => x.id !== r.id))}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <ModalReserva
          onGuardar={(r) => { setReservas((prev) => [...prev, r]); setModal(false) }}
          onCerrar={() => setModal(false)}
        />
      )}
    </div>
  )
}
