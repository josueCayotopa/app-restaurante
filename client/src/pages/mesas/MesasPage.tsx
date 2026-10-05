import { useState } from 'react'
import Header from '../../components/layout/Header'
import { useMesasStore } from '../../store/mesasStore'
import { useComandasStore } from '../../store/comandasStore'
import { useZonasStore } from '../../store/zonasStore'
import NuevaComanda from '../../components/comandas/NuevaComanda'
import type { Mesa, EstadoMesa, Zona } from '../../types'
import {
  Users, Plus, ClipboardList, X, CheckCircle, AlertCircle,
  Brush, BookOpen, Link2, Link2Off, Trash2, Check, MapPin, Receipt,
} from 'lucide-react'
import { imprimirPrecuenta } from '../../lib/impresion'
import { totalAPagar } from '../../components/caja/ModalCobro'

// ─── Configuraciones ──────────────────────────────────────────────────────────

interface EstadoCfg {
  label: string
  icon: React.ElementType
  // Usados en KPIs y botones de acción (tono suave)
  color: string
  bg: string
  border: string
  // Usados en la tarjeta de mesa: fondo SÓLIDO del color de estado, con
  // texto en blanco/oscuro según haga falta para el contraste.
  solidBg: string
  solidText: string
  solidMuted: string
  chip: string
}

// Colores de estado definidos por el cliente: verde=libre, rojo=ocupada,
// amarillo=en_limpieza, gris=reservada, azul=esperando_pago, naranja=unida.
const ESTADO_CONFIG: Record<EstadoMesa, EstadoCfg> = {
  libre:          { label: 'Libre',       icon: CheckCircle, color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-300',  solidBg: 'bg-green-500',  solidText: 'text-white',    solidMuted: 'text-white/75',    chip: 'bg-black/15 text-white' },
  ocupada:        { label: 'Ocupada',     icon: Users,       color: 'text-rojo-700',   bg: 'bg-rojo-100',  border: 'border-rojo-300',   solidBg: 'bg-rojo-500',   solidText: 'text-white',    solidMuted: 'text-white/75',    chip: 'bg-black/15 text-white' },
  reservada:      { label: 'Reservada',   icon: BookOpen,    color: 'text-gray-600',   bg: 'bg-gray-100',  border: 'border-gray-300',   solidBg: 'bg-gray-500',   solidText: 'text-white',    solidMuted: 'text-white/75',    chip: 'bg-black/15 text-white' },
  esperando_pago: { label: 'Esp. pago',   icon: AlertCircle, color: 'text-steel-700',  bg: 'bg-steel-50',  border: 'border-steel-300',  solidBg: 'bg-steel-500',  solidText: 'text-white',    solidMuted: 'text-white/75',    chip: 'bg-black/15 text-white' },
  en_limpieza:    { label: 'En limpieza', icon: Brush,       color: 'text-gold-700',   bg: 'bg-gold-50',   border: 'border-gold-300',   solidBg: 'bg-gold-500',   solidText: 'text-gray-900', solidMuted: 'text-gray-900/70', chip: 'bg-black/10 text-gray-900' },
  unida:          { label: 'Unida',       icon: Link2,       color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-300', solidBg: 'bg-orange-500', solidText: 'text-white',    solidMuted: 'text-white/75',    chip: 'bg-black/15 text-white' },
}

// ─── Modal Gestionar zonas ──────────────────────────────────────────────────

function ModalZonas({ onCerrar }: { onCerrar: () => void }) {
  const { zonas, agregarZona, eliminarZona } = useZonasStore()
  const mesas = useMesasStore((s) => s.mesas)
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setGuardando(true)
    setError('')
    try {
      await agregarZona(nombre.trim())
      setNombre('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la zona')
    } finally {
      setGuardando(false)
    }
  }

  const handleEliminar = async (id: string, nombreZona: string) => {
    const enUso = mesas.some((m) => m.zona === nombreZona)
    if (enUso && !confirm(`Hay mesas asignadas a "${nombreZona}". ¿Eliminar de todas formas?`)) return
    try {
      await eliminarZona(id)
    } catch (err) {
      console.error('[zonas] Error eliminando:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 flex items-center gap-2"><MapPin size={16} className="text-gold-600" /> Zonas del local</h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <form onSubmit={handleAgregar} className="flex gap-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Segundo piso"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
            />
            <button type="submit" disabled={guardando || !nombre.trim()}
              className="px-3 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus size={16} />
            </button>
          </form>
          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {zonas.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sin zonas registradas</p>
            ) : (
              zonas.map((z) => (
                <div key={z.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 font-medium">{z.nombre}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{mesas.filter((m) => m.zona === z.nombre).length} mesa(s)</span>
                    <button onClick={() => handleEliminar(z.id, z.nombre)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Nueva Mesa ─────────────────────────────────────────────────────────

function ModalNuevaMesa({ onCerrar }: { onCerrar: () => void }) {
  const { crearMesa, mesas } = useMesasStore()
  const zonas = useZonasStore((s) => s.zonas)
  const [form, setForm] = useState({ numero: mesas.length + 1, capacidad: 4, zona: zonas[0]?.nombre ?? '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await crearMesa(form)
      onCerrar()
    } catch (err) {
      console.error('[mesas] Error creando mesa:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Nueva mesa</h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Número de mesa</label>
              <input required type="number" min={1} value={form.numero}
                onChange={(e) => setForm({ ...form, numero: parseInt(e.target.value) })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Capacidad (personas)</label>
              <input required type="number" min={1} max={20} value={form.capacidad}
                onChange={(e) => setForm({ ...form, capacidad: parseInt(e.target.value) })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Zona</label>
            {zonas.length === 0 ? (
              <p className="text-xs text-gray-400">No hay zonas creadas todavía — agrega una desde "Zonas" en la barra de herramientas.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {zonas.map((z) => (
                  <button key={z.id} type="button"
                    onClick={() => setForm({ ...form, zona: z.nombre })}
                    className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                      form.zona === z.nombre
                        ? 'border-gold-500 bg-gold-50 text-gold-700'
                        : 'border-gray-200 text-gray-600 hover:border-gold-300'
                    }`}>
                    {z.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCerrar}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={!form.zona}
              className="flex-1 py-2.5 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
              <Check size={15} /> Crear mesa
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Tarjeta Mesa ─────────────────────────────────────────────────────────────

function TarjetaMesa({ mesa, onClick, modoUnion, seleccionadaParaUnir, onSeleccionarParaUnir }: {
  mesa: Mesa
  onClick: () => void
  modoUnion: boolean
  seleccionadaParaUnir: string | null
  onSeleccionarParaUnir: (id: string) => void
}) {
  const cfg = ESTADO_CONFIG[mesa.estado]
  const Icon = cfg.icon
  const getComandaByMesa = useComandasStore((s) => s.getComandaByMesa)
  const comanda = getComandaByMesa(mesa.id)
  const mesas = useMesasStore((s) => s.mesas)

  const esPrincipal = (mesa.mesasUnidasIds?.length ?? 0) > 0
  const esSecundaria = !!mesa.mesaPrincipalId
  const mesasSecundarias = (mesa.mesasUnidasIds ?? []).map((id) => mesas.find((m) => m.id === id)).filter(Boolean) as Mesa[]

  const isSeleccionada = seleccionadaParaUnir === mesa.id
  const puedeFusionar = modoUnion && !esSecundaria && mesa.estado !== 'unida'

  const handleClick = () => {
    if (modoUnion && puedeFusionar) {
      onSeleccionarParaUnir(mesa.id)
    } else if (!modoUnion && !esSecundaria) {
      onClick()
    }
  }

  return (
    <button onClick={handleClick}
      className={`relative border-2 rounded-xl p-4 text-left transition-all ${
        esSecundaria
          ? 'border-gold-200 bg-gold-50 opacity-70 cursor-default'
          : isSeleccionada
          ? 'border-gold-500 bg-gold-50 shadow-lg ring-2 ring-gold-300'
          : puedeFusionar
          ? 'border-dashed border-gold-300 bg-white hover:border-gold-500 hover:shadow-md cursor-pointer'
          : `border-transparent ${cfg.solidBg} hover:shadow-md hover:brightness-105 cursor-pointer`
      }`}
    >
      {/* Badge unida */}
      {esPrincipal && (
        <div className="absolute -top-2 -right-2 bg-gold-600 text-white rounded-full px-2 py-0.5 text-xs font-bold flex items-center gap-1">
          <Link2 size={10} />
          +{mesasSecundarias.length}
        </div>
      )}
      {esSecundaria && (
        <div className="absolute -top-2 -right-2 bg-gold-500 text-gray-900 rounded-full px-2 py-0.5 text-xs font-bold">
          unida
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <p className={`text-xs font-medium uppercase tracking-wide ${cfg.solidMuted}`}>
            {mesa.zona}
          </p>
          <h3 className={`text-xl font-bold ${cfg.solidText}`}>
            Mesa {mesa.numero}
            {esPrincipal && mesasSecundarias.length > 0 && (
              <span className={`text-sm font-medium ml-1 ${cfg.solidText}`}>
                +{mesasSecundarias.map((m) => m.numero).join('+')}
              </span>
            )}
          </h3>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          isSeleccionada ? 'bg-gold-600' : cfg.chip
        }`}>
          {isSeleccionada
            ? <Check size={18} className="text-white" />
            : <Icon size={18} className={cfg.solidText} />
          }
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1 text-sm ${cfg.solidMuted}`}>
          <Users size={13} />
          <span>
            {esPrincipal
              ? `${mesa.capacidad + mesasSecundarias.reduce((a, m) => a + m.capacidad, 0)} pers.`
              : `${mesa.capacidad} pers.`
            }
          </span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.chip}`}>
          <Icon size={10} />
          {cfg.label}
        </span>
      </div>

      {comanda && !esSecundaria && (
        <div className="mt-2 pt-2 border-t border-black/10 flex items-center justify-between">
          <span className={`text-xs ${cfg.solidMuted}`}>{comanda.items.length} ítem(s)</span>
          <span className={`text-xs font-semibold ${cfg.solidText}`}>S/ {comanda.total.toFixed(2)}</span>
        </div>
      )}
    </button>
  )
}

// ─── Panel de Mesa ────────────────────────────────────────────────────────────

function PanelMesa({ mesa, onCerrar }: { mesa: Mesa; onCerrar: () => void }) {
  const { cambiarEstado, eliminarMesa, separarMesa, mesas } = useMesasStore()
  const getComandaByMesa = useComandasStore((s) => s.getComandaByMesa)
  const comanda = getComandaByMesa(mesa.id)
  const [nuevaComandaAbierta, setNuevaComandaAbierta] = useState(false)
  const [editarComanda, setEditarComanda] = useState(false)

  const transiciones = (['libre', 'ocupada', 'reservada', 'esperando_pago', 'en_limpieza'] as EstadoMesa[])
    .filter((e) => e !== mesa.estado && e !== 'unida')

  const esPrincipal = (mesa.mesasUnidasIds?.length ?? 0) > 0
  const mesasSecundarias = (mesa.mesasUnidasIds ?? [])
    .map((id) => mesas.find((m) => m.id === id))
    .filter(Boolean) as Mesa[]

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide">{mesa.zona}</p>
          <h2 className="text-lg font-bold text-gray-800">
            Mesa {mesa.numero}
            {esPrincipal && <span className="text-gold-600 text-sm ml-1">+{mesasSecundarias.map((m) => m.numero).join('+')}</span>}
          </h2>
        </div>
        <button onClick={onCerrar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Estado */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Estado</p>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${ESTADO_CONFIG[mesa.estado].solidBg} ${ESTADO_CONFIG[mesa.estado].solidText}`}>
            {ESTADO_CONFIG[mesa.estado].label}
          </span>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Capacidad</p>
            <p className="font-semibold text-gray-800">
              {esPrincipal
                ? `${mesa.capacidad + mesasSecundarias.reduce((a, m) => a + m.capacidad, 0)} pers.`
                : `${mesa.capacidad} pers.`}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-400">Zona</p>
            <p className="font-semibold text-gray-800">{mesa.zona}</p>
          </div>
        </div>

        {/* Mesas unidas */}
        {esPrincipal && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Mesas unidas</p>
            <div className="space-y-1.5">
              {mesasSecundarias.map((ms) => (
                <div key={ms.id} className="flex items-center justify-between bg-gold-50 border border-gold-200 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Link2 size={13} className="text-gold-600" />
                    <span className="text-sm font-medium text-gold-700">Mesa {ms.numero}</span>
                    <span className="text-xs text-gold-500">{ms.capacidad} pers.</span>
                  </div>
                </div>
              ))}
              <button onClick={() => { separarMesa(mesa.id); onCerrar() }}
                className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-gold-300 text-gold-700 rounded-lg text-xs font-medium hover:bg-gold-50 transition-colors">
                <Link2Off size={13} /> Separar mesas
              </button>
            </div>
          </div>
        )}

        {/* Comanda activa */}
        {comanda ? (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Comanda activa</p>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              {comanda.items.filter((i) => i.estado !== 'cancelado' && i.estado !== 'devuelto').map((item) => (
                <div key={item.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <p className="text-sm text-gray-800">{item.cantidad}× {item.nombre}</p>
                    {item.nota && <p className="text-xs text-gray-400 italic">{item.nota}</p>}
                  </div>
                  <span className="text-xs font-medium text-gold-700">
                    S/ {(item.cantidad * item.precioUnitario).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between px-3 py-2 bg-gray-50">
                <span className="text-sm font-semibold">Total</span>
                <span className="text-sm font-bold text-gold-700">S/ {totalAPagar(comanda).toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => setEditarComanda(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-gold-600 text-white text-sm font-medium hover:bg-gold-700 transition-colors">
                <ClipboardList size={15} /> Agregar / quitar
              </button>
              <button onClick={() => imprimirPrecuenta(comanda.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
                <Receipt size={15} /> Precuenta
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-400">
            <ClipboardList size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sin comanda activa</p>
          </div>
        )}

        {/* Cambiar estado */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Cambiar estado</p>
          <div className="flex flex-col gap-2">
            {transiciones.map((estado) => {
              const c = ESTADO_CONFIG[estado]
              const Ico = c.icon
              return (
                <button key={estado} onClick={() => cambiarEstado(mesa.id, estado)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:opacity-80 ${c.bg} ${c.color} ${c.border}`}>
                  <Ico size={14} /> {c.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Eliminar mesa */}
        <button onClick={() => { eliminarMesa(mesa.id); onCerrar() }}
          className="w-full flex items-center justify-center gap-2 py-2 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 transition-colors">
          <Trash2 size={14} /> Eliminar mesa
        </button>
      </div>

      {/* Nueva comanda */}
      {mesa.estado !== 'ocupada' && mesa.estado !== 'unida' && (
        <div className="p-4 border-t border-gray-100">
          <button onClick={() => setNuevaComandaAbierta(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gold-600 text-white text-sm font-semibold hover:bg-gold-700 transition-colors">
            <Plus size={16} /> Nueva comanda
          </button>
        </div>
      )}

      {editarComanda && comanda && (
        <NuevaComanda
          mesaId={comanda.mesaId}
          numeroMesa={comanda.numeroMesa}
          mesasUnidas={comanda.mesasUnidas}
          comandaExistente={comanda}
          onCerrar={() => setEditarComanda(false)}
        />
      )}
      {nuevaComandaAbierta && (
        <NuevaComanda
          mesaId={mesa.id}
          numeroMesa={mesa.numero}
          mesasUnidas={mesasSecundarias.map((m) => m.numero)}
          onCerrar={() => { setNuevaComandaAbierta(false); onCerrar() }}
        />
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MesasPage() {
  const { mesas, mesaSeleccionada, seleccionarMesa, unirMesas } = useMesasStore()
  const zonas = useZonasStore((s) => s.zonas)
  const [zonaFiltro, setZonaFiltro] = useState<Zona | 'todas'>('todas')
  const [modoUnion, setModoUnion] = useState(false)
  const [primeraSeleccion, setPrimeraSeleccion] = useState<string | null>(null)
  const [modalNuevaMesa, setModalNuevaMesa] = useState(false)
  const [modalZonas, setModalZonas] = useState(false)

  const mesasFiltradas = zonaFiltro === 'todas' ? mesas : mesas.filter((m) => m.zona === zonaFiltro)

  const conteos = {
    libre: mesas.filter((m) => m.estado === 'libre').length,
    ocupada: mesas.filter((m) => m.estado === 'ocupada').length,
    reservada: mesas.filter((m) => m.estado === 'reservada').length,
    esperando_pago: mesas.filter((m) => m.estado === 'esperando_pago').length,
    en_limpieza: mesas.filter((m) => m.estado === 'en_limpieza').length,
    unida: mesas.filter((m) => m.estado === 'unida').length,
  }

  const handleSeleccionarParaUnir = (mesaId: string) => {
    if (!primeraSeleccion) {
      setPrimeraSeleccion(mesaId)
    } else if (primeraSeleccion === mesaId) {
      setPrimeraSeleccion(null)
    } else {
      unirMesas(primeraSeleccion, mesaId)
      setPrimeraSeleccion(null)
      setModoUnion(false)
    }
  }

  const cancelarModoUnion = () => {
    setModoUnion(false)
    setPrimeraSeleccion(null)
  }

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Gestión de Mesas" subtitulo={`${mesas.length} mesas registradas`} />

      <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-5 overflow-y-auto">
        {/* KPIs */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {(Object.entries(ESTADO_CONFIG) as [EstadoMesa, typeof ESTADO_CONFIG[EstadoMesa]][]).map(([estado, cfg]) => {
            const Icon = cfg.icon
            return (
              <div key={estado} className={`rounded-xl p-3 ${cfg.solidBg}`}>
                <div className="flex items-center justify-between mb-1">
                  <Icon size={15} className={cfg.solidText} />
                  <span className={`text-2xl font-bold ${cfg.solidText}`}>{conteos[estado]}</span>
                </div>
                <p className={`text-xs font-medium ${cfg.solidMuted} leading-tight`}>{cfg.label}</p>
              </div>
            )
          })}
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          {/* Filtros zona — scroll horizontal en móvil */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 flex-1 min-w-0">
            <button onClick={() => setZonaFiltro('todas')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${zonaFiltro === 'todas' ? 'bg-gold-600 text-white border-gold-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gold-300'}`}>
              Todas ({mesas.length})
            </button>
            {zonas.map((z) => (
              <button key={z.id} onClick={() => setZonaFiltro(z.nombre)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${zonaFiltro === z.nombre ? 'bg-gold-600 text-white border-gold-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gold-300'}`}>
                {z.nombre} ({mesas.filter((m) => m.zona === z.nombre).length})
              </button>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex gap-2 shrink-0">
            {/* Unir mesas */}
            {!modoUnion ? (
              <button onClick={() => { setModoUnion(true); seleccionarMesa(null) }}
                className="flex items-center gap-1.5 px-3 py-2 border border-gold-300 text-gold-700 bg-gold-50 rounded-lg text-sm font-semibold hover:bg-gold-100 transition-colors">
                <Link2 size={15} /> <span className="hidden sm:inline">Unir</span><span className="sm:hidden">Unir</span>
              </button>
            ) : (
              <button onClick={cancelarModoUnion}
                className="flex items-center gap-1.5 px-3 py-2 bg-gold-50 border border-gold-300 text-gold-700 rounded-lg text-sm font-semibold">
                <X size={14} /> Cancelar
              </button>
            )}

            {/* Nueva mesa */}
            <button onClick={() => setModalNuevaMesa(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-colors">
              <Plus size={15} /> <span className="hidden sm:inline">Nueva mesa</span><span className="sm:hidden">Nueva</span>
            </button>

            {/* Zonas */}
            <button onClick={() => setModalZonas(true)} title="Gestionar zonas"
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors">
              <MapPin size={16} /> <span className="hidden sm:inline">Zonas</span>
            </button>
          </div>
        </div>

        {/* Banner modo unión */}
        {modoUnion && (
          <div className="flex items-center gap-3 bg-gold-50 border border-gold-200 rounded-xl px-4 py-3">
            <Link2 size={18} className="text-gold-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gold-700">Modo unión de mesas activo</p>
              <p className="text-xs text-gold-600">
                {primeraSeleccion
                  ? `Mesa ${mesas.find((m) => m.id === primeraSeleccion)?.numero} seleccionada como principal. Haz clic en la segunda mesa para unirlas.`
                  : 'Haz clic en la mesa principal (la que recibirá la comanda conjunta).'}
              </p>
            </div>
            <button onClick={cancelarModoUnion} className="text-gold-600 hover:text-gold-700 text-sm font-medium">
              Cancelar
            </button>
          </div>
        )}

        {/* Grid de mesas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {mesasFiltradas.map((mesa) => (
            <TarjetaMesa
              key={mesa.id}
              mesa={mesa}
              onClick={() => seleccionarMesa(mesa)}
              modoUnion={modoUnion}
              seleccionadaParaUnir={primeraSeleccion}
              onSeleccionarParaUnir={handleSeleccionarParaUnir}
            />
          ))}
        </div>
      </div>

      {/* Panel lateral */}
      {mesaSeleccionada && !modoUnion && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => seleccionarMesa(null)} />
          {/* Siempre la versión actual de la mesa (no la copia del momento en que se abrió el panel) */}
          <PanelMesa mesa={mesas.find((m) => m.id === mesaSeleccionada.id) ?? mesaSeleccionada} onCerrar={() => seleccionarMesa(null)} />
        </>
      )}

      {/* Modal nueva mesa */}
      {modalNuevaMesa && <ModalNuevaMesa onCerrar={() => setModalNuevaMesa(false)} />}

      {/* Modal gestionar zonas */}
      {modalZonas && <ModalZonas onCerrar={() => setModalZonas(false)} />}
    </div>
  )
}
