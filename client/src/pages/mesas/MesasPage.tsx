import { useState } from 'react'
import Header from '../../components/layout/Header'
import { useMesasStore } from '../../store/mesasStore'
import { useComandasStore } from '../../store/comandasStore'
import NuevaComanda from '../../components/comandas/NuevaComanda'
import type { Mesa, EstadoMesa, Zona } from '../../types'
import {
  Users, Plus, ClipboardList, X, CheckCircle, AlertCircle,
  Brush, BookOpen, Link2, Link2Off, Trash2, Check, Settings2,
} from 'lucide-react'

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

const ESTADO_CONFIG: Record<EstadoMesa, EstadoCfg> = {
  libre:          { label: 'Libre',       icon: CheckCircle, color: 'text-gray-600', bg: 'bg-gray-50',  border: 'border-gray-200', solidBg: 'bg-white',    solidText: 'text-gray-800', solidMuted: 'text-gray-400',    chip: 'bg-gray-100 text-gray-600' },
  ocupada:        { label: 'Ocupada',     icon: Users,       color: 'text-gold-700', bg: 'bg-gold-100', border: 'border-gold-300', solidBg: 'bg-gold-500', solidText: 'text-gray-900', solidMuted: 'text-gray-900/70', chip: 'bg-black/10 text-gray-900' },
  reservada:      { label: 'Reservada',   icon: BookOpen,    color: 'text-rojo-600', bg: 'bg-rojo-50',  border: 'border-rojo-200', solidBg: 'bg-rojo-500', solidText: 'text-white',    solidMuted: 'text-white/75',    chip: 'bg-black/15 text-white' },
  esperando_pago: { label: 'Esp. pago',   icon: AlertCircle, color: 'text-rojo-700', bg: 'bg-rojo-100', border: 'border-rojo-200', solidBg: 'bg-rojo-600', solidText: 'text-white',    solidMuted: 'text-white/75',    chip: 'bg-black/15 text-white' },
  en_limpieza:    { label: 'En limpieza', icon: Brush,       color: 'text-gray-500', bg: 'bg-gray-100', border: 'border-gray-200', solidBg: 'bg-gray-500', solidText: 'text-white',    solidMuted: 'text-white/75',    chip: 'bg-black/15 text-white' },
  unida:          { label: 'Unida',       icon: Link2,       color: 'text-gold-700', bg: 'bg-gold-50',  border: 'border-gold-300', solidBg: 'bg-gold-500', solidText: 'text-gray-900', solidMuted: 'text-gray-900/70', chip: 'bg-black/10 text-gray-900' },
}

const ZONA_LABELS: Record<Zona, string> = {
  salon: 'Salón', terraza: 'Terraza', barra: 'Barra', vip: 'VIP',
}
const ZONAS: Zona[] = ['salon', 'terraza', 'barra', 'vip']

// ─── Modal Nueva Mesa ─────────────────────────────────────────────────────────

function ModalNuevaMesa({ onCerrar }: { onCerrar: () => void }) {
  const { crearMesa, mesas } = useMesasStore()
  const [form, setForm] = useState({ numero: mesas.length + 1, capacidad: 4, zona: 'salon' as Zona })

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
            <div className="grid grid-cols-2 gap-2">
              {ZONAS.map((z) => (
                <button key={z} type="button"
                  onClick={() => setForm({ ...form, zona: z })}
                  className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                    form.zona === z
                      ? 'border-gold-500 bg-gold-50 text-gold-700'
                      : 'border-gray-200 text-gray-600 hover:border-gold-300'
                  }`}>
                  {ZONA_LABELS[z]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCerrar}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit"
              className="flex-1 py-2.5 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 flex items-center justify-center gap-2">
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

  const esLibre = mesa.estado === 'libre'

  return (
    <button onClick={handleClick}
      className={`relative border-2 rounded-xl p-4 text-left transition-all ${
        esSecundaria
          ? 'border-gold-200 bg-gold-50 opacity-70 cursor-default'
          : isSeleccionada
          ? 'border-gold-500 bg-gold-50 shadow-lg ring-2 ring-gold-300'
          : puedeFusionar
          ? 'border-dashed border-gold-300 bg-white hover:border-gold-500 hover:shadow-md cursor-pointer'
          : esLibre
          ? 'border-gray-200 bg-white hover:border-gold-300 hover:shadow-md cursor-pointer'
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
          <p className={`text-xs font-medium uppercase tracking-wide ${esLibre ? 'text-gray-400' : cfg.solidMuted}`}>
            {ZONA_LABELS[mesa.zona]}
          </p>
          <h3 className={`text-xl font-bold ${esLibre ? 'text-gray-800' : cfg.solidText}`}>
            Mesa {mesa.numero}
            {esPrincipal && mesasSecundarias.length > 0 && (
              <span className={`text-sm font-medium ml-1 ${esLibre ? 'text-gold-700' : cfg.solidText}`}>
                +{mesasSecundarias.map((m) => m.numero).join('+')}
              </span>
            )}
          </h3>
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          isSeleccionada ? 'bg-gold-600' : esLibre ? 'bg-gray-50' : cfg.chip
        }`}>
          {isSeleccionada
            ? <Check size={18} className="text-white" />
            : <Icon size={18} className={esLibre ? 'text-gray-400' : cfg.solidText} />
          }
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-1 text-sm ${esLibre ? 'text-gray-500' : cfg.solidMuted}`}>
          <Users size={13} />
          <span>
            {esPrincipal
              ? `${mesa.capacidad + mesasSecundarias.reduce((a, m) => a + m.capacidad, 0)} pers.`
              : `${mesa.capacidad} pers.`
            }
          </span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
          esLibre ? `border ${cfg.border} ${cfg.bg} ${cfg.color}` : cfg.chip
        }`}>
          <Icon size={10} />
          {cfg.label}
        </span>
      </div>

      {comanda && !esSecundaria && (
        <div className={`mt-2 pt-2 border-t flex items-center justify-between ${esLibre ? 'border-gray-100' : 'border-black/10'}`}>
          <span className={`text-xs ${esLibre ? 'text-gray-500' : cfg.solidMuted}`}>{comanda.items.length} ítem(s)</span>
          <span className={`text-xs font-semibold ${esLibre ? 'text-gold-700' : cfg.solidText}`}>S/ {comanda.total.toFixed(2)}</span>
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
          <p className="text-xs text-gray-400 uppercase tracking-wide">{ZONA_LABELS[mesa.zona]}</p>
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
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
            mesa.estado === 'libre'
              ? `border ${ESTADO_CONFIG[mesa.estado].border} ${ESTADO_CONFIG[mesa.estado].bg} ${ESTADO_CONFIG[mesa.estado].color}`
              : `${ESTADO_CONFIG[mesa.estado].solidBg} ${ESTADO_CONFIG[mesa.estado].solidText}`
          }`}>
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
            <p className="font-semibold text-gray-800">{ZONA_LABELS[mesa.zona]}</p>
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
              {comanda.items.map((item) => (
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
                <span className="text-sm font-bold text-gold-700">S/ {comanda.total.toFixed(2)}</span>
              </div>
            </div>
            <button className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gold-600 text-white text-sm font-medium hover:bg-gold-700 transition-colors">
              <ClipboardList size={15} /> Ver comanda completa
            </button>
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
  const [zonaFiltro, setZonaFiltro] = useState<Zona | 'todas'>('todas')
  const [modoUnion, setModoUnion] = useState(false)
  const [primeraSeleccion, setPrimeraSeleccion] = useState<string | null>(null)
  const [modalNuevaMesa, setModalNuevaMesa] = useState(false)

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
              <div key={estado} className={`rounded-xl p-3 border ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-center justify-between mb-1">
                  <Icon size={15} className={cfg.color} />
                  <span className={`text-2xl font-bold ${cfg.color}`}>{conteos[estado]}</span>
                </div>
                <p className={`text-xs font-medium ${cfg.color} opacity-80 leading-tight`}>{cfg.label}</p>
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
            {ZONAS.map((zona) => (
              <button key={zona} onClick={() => setZonaFiltro(zona)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${zonaFiltro === zona ? 'bg-gold-600 text-white border-gold-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gold-300'}`}>
                {ZONA_LABELS[zona]} ({mesas.filter((m) => m.zona === zona).length})
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

            {/* Configurar layout */}
            <button className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">
              <Settings2 size={16} />
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
          <PanelMesa mesa={mesaSeleccionada} onCerrar={() => seleccionarMesa(null)} />
        </>
      )}

      {/* Modal nueva mesa */}
      {modalNuevaMesa && <ModalNuevaMesa onCerrar={() => setModalNuevaMesa(false)} />}
    </div>
  )
}
