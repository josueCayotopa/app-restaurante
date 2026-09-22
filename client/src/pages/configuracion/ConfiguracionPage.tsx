import { useState } from 'react'
import Header from '../../components/layout/Header'
import {
  useConfiguracionStore,
  type Impresora,
  type AreaImpresora,
  type TipoConexion,
  type AnchoTicket,
} from '../../store/configuracionStore'
import { useToastStore } from '../../store/toastStore'
import { useTemaStore, type Tema } from '../../store/temaStore'
import {
  ChefHat, Beer, DollarSign, Printer, Plus, Pencil, Trash2,
  Wifi, Usb, Bluetooth, X, CheckCircle2, AlertCircle, Send,
  ToggleLeft, ToggleRight, Sun, Moon, Monitor, Check,
} from 'lucide-react'

// ── SECCIÓN APARIENCIA ────────────────────────────────────────────────────────

const TEMAS: {
  valor: Tema
  label: string
  desc: string
  Icon: React.ElementType
  preview: { fondo: string; superficie: string; borde: string; texto: string; sidebar: string }
}[] = [
  {
    valor: 'claro',
    label: 'Claro',
    desc: 'Fondo blanco, ideal para entornos con buena iluminación',
    Icon: Sun,
    preview: { fondo: '#f3f4f6', superficie: '#ffffff', borde: '#e5e7eb', texto: '#374151', sidebar: '#000000' },
  },
  {
    valor: 'oscuro',
    label: 'Oscuro',
    desc: 'Fondo negro, reduce la fatiga visual en ambientes con poca luz',
    Icon: Moon,
    preview: { fondo: '#0a0a0a', superficie: '#161616', borde: '#2e2e2e', texto: '#cccccc', sidebar: '#000000' },
  },
]

function SeccionApariencia() {
  const { tema, setTema } = useTemaStore()
  const agregarToast = useToastStore((s) => s.agregar)

  const handleCambiar = (nuevo: Tema) => {
    setTema(nuevo)
    agregarToast({
      tipo: 'success',
      titulo: `Tema ${nuevo === 'oscuro' ? 'Oscuro' : 'Claro'} activado`,
      mensaje: nuevo === 'oscuro' ? 'Modo oscuro habilitado' : 'Modo claro habilitado',
      duracion: 2500,
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
      {/* Header de sección */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <Monitor size={16} className="text-gold-700" />
        <span className="text-sm font-bold text-gray-700">Apariencia</span>
      </div>

      <div className="p-5">
        <p className="text-xs text-gray-500 mb-4">
          Elige el tema visual de la aplicación. El ajuste se guarda automáticamente en este dispositivo.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEMAS.map(({ valor, label, desc, Icon, preview }) => {
            const activo = tema === valor
            return (
              <button
                key={valor}
                onClick={() => handleCambiar(valor)}
                className={`relative text-left rounded-xl border-2 overflow-hidden transition-all focus:outline-none ${
                  activo
                    ? 'border-gold-500 shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Preview mini de la interfaz */}
                <div
                  className="h-28 relative overflow-hidden"
                  style={{ backgroundColor: preview.fondo }}
                >
                  {/* Sidebar simulado */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-10 flex flex-col gap-1 pt-2 px-1"
                    style={{ backgroundColor: preview.sidebar }}
                  >
                    <div className="w-full h-6 rounded" style={{ backgroundColor: '#e8b400', opacity: 0.9 }} />
                    {[0.4, 0.25, 0.25, 0.25, 0.25].map((op, i) => (
                      <div key={i} className="w-full h-3 rounded" style={{ backgroundColor: '#ffffff', opacity: op }} />
                    ))}
                  </div>
                  {/* Contenido simulado */}
                  <div className="ml-10 p-2 space-y-1.5">
                    {/* Header simulado */}
                    <div className="h-5 rounded" style={{ backgroundColor: preview.superficie, border: `1px solid ${preview.borde}` }} />
                    {/* Cards simulados */}
                    <div className="grid grid-cols-3 gap-1">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-8 rounded" style={{ backgroundColor: preview.superficie, border: `1px solid ${preview.borde}` }}>
                          <div className="h-1.5 rounded-t mx-1 mt-1" style={{ backgroundColor: i === 1 ? '#e8b400' : i === 2 ? '#cc2222' : '#6b7280', opacity: 0.7 }} />
                          <div className="h-1 rounded mx-1 mt-0.5" style={{ backgroundColor: preview.texto, opacity: 0.3 }} />
                          <div className="h-1 rounded mx-1 mt-0.5 w-2/3" style={{ backgroundColor: preview.texto, opacity: 0.2 }} />
                        </div>
                      ))}
                    </div>
                    {/* Lista simulada */}
                    <div className="rounded" style={{ backgroundColor: preview.superficie, border: `1px solid ${preview.borde}` }}>
                      {[0.3, 0.2, 0.15].map((op, i) => (
                        <div key={i} className="h-2.5 mx-2 my-1 rounded" style={{ backgroundColor: preview.texto, opacity: op }} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Info del tema */}
                <div className={`px-4 py-3 flex items-start gap-3 ${activo ? 'bg-gold-50' : ''}`}>
                  <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    activo ? 'bg-gold-500 text-black' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${activo ? 'text-gold-700' : 'text-gray-700'}`}>
                      {label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{desc}</p>
                  </div>
                  {activo && (
                    <div className="shrink-0 w-5 h-5 rounded-full bg-gold-500 flex items-center justify-center mt-0.5">
                      <Check size={11} className="text-black font-bold" />
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Configuración visual por área ────────────────────────────────────────────

const AREA_CFG: Record<AreaImpresora, {
  label: string
  Icon: React.ElementType
  color: string
  bg: string
  border: string
  badge: string
  btnBg: string
}> = {
  cocina: {
    label: 'Cocina',
    Icon: ChefHat,
    color: 'text-rojo-600',
    bg: 'bg-rojo-50',
    border: 'border-rojo-200',
    badge: 'bg-rojo-100 text-rojo-700',
    btnBg: 'bg-rojo-500 hover:bg-rojo-600',
  },
  bar: {
    label: 'Bar',
    Icon: Beer,
    color: 'text-gold-700',
    bg: 'bg-gold-50',
    border: 'border-gold-200',
    badge: 'bg-gold-100 text-gold-700',
    btnBg: 'bg-gold-600 hover:bg-gold-700',
  },
  caja: {
    label: 'Caja / Recibos',
    Icon: DollarSign,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    badge: 'bg-gray-100 text-gray-700',
    btnBg: 'bg-gray-700 hover:bg-gray-800',
  },
}

const TIPO_CFG: Record<TipoConexion, { label: string; Icon: React.ElementType; desc: string }> = {
  red:       { label: 'Red (TCP/IP)', Icon: Wifi,      desc: 'Requiere IP y puerto' },
  usb:       { label: 'USB',          Icon: Usb,       desc: 'Conexión directa USB' },
  bluetooth: { label: 'Bluetooth',    Icon: Bluetooth, desc: 'Enlace inalámbrico'   },
}

const AREAS: AreaImpresora[] = ['cocina', 'bar', 'caja']

interface FormData {
  nombre: string
  area: AreaImpresora
  tipo: TipoConexion
  ip: string
  puerto: string
  ancho: AnchoTicket
}

const FORM_VACÍO: FormData = {
  nombre: '',
  area: 'cocina',
  tipo: 'red',
  ip: '',
  puerto: '9100',
  ancho: '80mm',
}

function toImpresora(f: FormData): Omit<Impresora, 'id'> {
  return {
    nombre: f.nombre.trim(),
    area: f.area,
    tipo: f.tipo,
    ip: f.tipo === 'red' ? f.ip.trim() || undefined : undefined,
    puerto: parseInt(f.puerto) || 9100,
    ancho: f.ancho,
    activa: true,
  }
}

// ── Tarjeta de impresora ──────────────────────────────────────────────────────

function TarjetaImpresora({
  imp, onEditar, onEliminar, onTest,
}: {
  imp: Impresora; onEditar: () => void; onEliminar: () => void; onTest: () => void
}) {
  const toggleActiva = useConfiguracionStore((s) => s.toggleActiva)
  const tipoCfg = TIPO_CFG[imp.tipo]
  const TipoIcon = tipoCfg.Icon

  return (
    <div className={`flex items-center gap-4 px-5 py-4 ${!imp.activa ? 'opacity-50' : ''}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        imp.activa ? 'bg-gold-100' : 'bg-gray-100'
      }`}>
        <Printer size={18} className={imp.activa ? 'text-gold-700' : 'text-gray-400'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800 truncate">{imp.nombre}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            imp.activa ? 'bg-gold-100 text-gold-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {imp.activa ? 'Activa' : 'Inactiva'}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <TipoIcon size={11} /> {tipoCfg.label}
          </span>
          {imp.tipo === 'red' && imp.ip && (
            <span className="text-xs text-gray-500 font-mono">{imp.ip}:{imp.puerto}</span>
          )}
          <span className="text-xs text-gray-400">{imp.ancho}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onTest} title="Prueba de impresión"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gold-700 hover:bg-gold-50 transition-colors">
          <Send size={14} />
        </button>
        <button onClick={onEditar} title="Editar"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gold-700 hover:bg-gold-50 transition-colors">
          <Pencil size={14} />
        </button>
        <button onClick={() => toggleActiva(imp.id)} title={imp.activa ? 'Desactivar' : 'Activar'}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gold-700 hover:bg-gold-50 transition-colors">
          {imp.activa
            ? <ToggleRight size={16} className="text-gold-600" />
            : <ToggleLeft size={16} className="text-gray-400" />
          }
        </button>
        <button onClick={onEliminar} title="Eliminar"
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Modal agregar/editar ──────────────────────────────────────────────────────

function ModalImpresora({
  form, setForm, editando, onGuardar, onCerrar,
}: {
  form: FormData
  setForm: React.Dispatch<React.SetStateAction<FormData>>
  editando: boolean
  onGuardar: () => void
  onCerrar: () => void
}) {
  const valido = form.nombre.trim().length > 0 &&
    (form.tipo !== 'red' || form.ip.trim().length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-gold-700" />
            <h2 className="font-bold text-gray-800">
              {editando ? 'Editar impresora' : 'Nueva impresora'}
            </h2>
          </div>
          <button onClick={onCerrar} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nombre de la impresora</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej: Epson TM-T20 Cocina"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-200"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Área de impresión</label>
            <div className="grid grid-cols-3 gap-2">
              {AREAS.map((area) => {
                const cfg = AREA_CFG[area]
                const Icon = cfg.Icon
                return (
                  <button key={area} onClick={() => setForm((f) => ({ ...f, area }))}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                      form.area === area ? `${cfg.border} ${cfg.bg} ${cfg.color}` : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    <Icon size={18} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de conexión</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(TIPO_CFG) as [TipoConexion, typeof TIPO_CFG[TipoConexion]][]).map(([tipo, cfg]) => {
                const Icon = cfg.Icon
                return (
                  <button key={tipo} onClick={() => setForm((f) => ({ ...f, tipo }))}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                      form.tipo === tipo ? 'border-gold-500 bg-gold-50 text-gold-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    <Icon size={18} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
          {form.tipo === 'red' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Dirección IP</label>
                <input
                  value={form.ip}
                  onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))}
                  placeholder="192.168.1.101"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Puerto</label>
                <input
                  value={form.puerto}
                  onChange={(e) => setForm((f) => ({ ...f, puerto: e.target.value }))}
                  placeholder="9100"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ancho del papel</label>
            <div className="flex gap-3">
              {(['58mm', '80mm'] as AnchoTicket[]).map((ancho) => (
                <button key={ancho} onClick={() => setForm((f) => ({ ...f, ancho }))}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    form.ancho === ancho ? 'border-gold-500 bg-gold-50 text-gold-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {ancho}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={onCerrar}
            className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button onClick={onGuardar} disabled={!valido}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gold-600 text-white text-sm font-semibold hover:bg-gold-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <CheckCircle2 size={15} />
            {editando ? 'Guardar cambios' : 'Agregar impresora'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal confirmar eliminación ────────────────────────────────────────────────

function ModalConfirmarEliminar({
  impresora, onConfirmar, onCancelar,
}: {
  impresora: Impresora; onConfirmar: () => void; onCancelar: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancelar} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <h3 className="font-bold text-gray-800 mb-1">Eliminar impresora</h3>
        <p className="text-sm text-gray-500 mb-5">
          ¿Confirmas eliminar <span className="font-semibold text-gray-700">"{impresora.nombre}"</span>?
          Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancelar}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirmar}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const { impresoras, agregar, actualizar, eliminar } = useConfiguracionStore()
  const agregarToast = useToastStore((s) => s.agregar)

  const [modal, setModal] = useState<{ abierto: boolean; editandoId: string | null }>({
    abierto: false,
    editandoId: null,
  })
  const [form, setForm] = useState<FormData>(FORM_VACÍO)
  const [confirmEliminarId, setConfirmEliminarId] = useState<string | null>(null)

  const abrirNueva = (area: AreaImpresora) => {
    setForm({ ...FORM_VACÍO, area })
    setModal({ abierto: true, editandoId: null })
  }

  const abrirEditar = (imp: Impresora) => {
    setForm({
      nombre: imp.nombre, area: imp.area, tipo: imp.tipo,
      ip: imp.ip ?? '', puerto: String(imp.puerto), ancho: imp.ancho,
    })
    setModal({ abierto: true, editandoId: imp.id })
  }

  const guardar = () => {
    const datos = toImpresora(form)
    if (modal.editandoId) {
      actualizar(modal.editandoId, datos)
      agregarToast({ tipo: 'success', titulo: 'Impresora actualizada', mensaje: datos.nombre, duracion: 3000 })
    } else {
      agregar(datos)
      agregarToast({ tipo: 'success', titulo: 'Impresora agregada', mensaje: datos.nombre, duracion: 3000 })
    }
    setModal({ abierto: false, editandoId: null })
  }

  const confirmarEliminar = () => {
    if (!confirmEliminarId) return
    const imp = impresoras.find((i) => i.id === confirmEliminarId)
    eliminar(confirmEliminarId)
    setConfirmEliminarId(null)
    if (imp) agregarToast({ tipo: 'info', titulo: 'Impresora eliminada', mensaje: imp.nombre, duracion: 3000 })
  }

  const testImprimir = (imp: Impresora) => {
    agregarToast({
      tipo: 'info',
      titulo: 'Prueba de impresión enviada',
      mensaje: `${imp.nombre}${imp.tipo === 'red' ? ` — ${imp.ip}:${imp.puerto}` : ''}`,
      duracion: 4000,
    })
  }

  const impresoraAEliminar = confirmEliminarId
    ? impresoras.find((i) => i.id === confirmEliminarId) ?? null
    : null

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Configuración" subtitulo="Apariencia e Impresoras" />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">

        {/* ── Sección: Apariencia ── */}
        <SeccionApariencia />

        {/* ── Resumen global de impresoras ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-5">
          {AREAS.map((area) => {
            const cfg = AREA_CFG[area]
            const Icon = cfg.Icon
            const total = impresoras.filter((i) => i.area === area).length
            const activas = impresoras.filter((i) => i.area === area && i.activa).length
            return (
              <div key={area} className={`bg-white rounded-xl border ${cfg.border} p-4 flex items-center gap-4`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
                  <Icon size={20} className={cfg.color} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">{cfg.label}</p>
                  <p className="text-lg font-bold text-gray-800">{total} impresora{total !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-gray-400">{activas} activa{activas !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Secciones por área ── */}
        <div className="space-y-5">
          {AREAS.map((area) => {
            const cfg = AREA_CFG[area]
            const Icon = cfg.Icon
            const imps = impresoras.filter((i) => i.area === area)

            return (
              <div key={area} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className={`flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 ${cfg.bg} border-b ${cfg.border}`}>
                  <div className="flex items-center gap-2.5">
                    <Icon size={17} className={cfg.color} />
                    <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>
                      {imps.length}
                    </span>
                  </div>
                  <button
                    onClick={() => abrirNueva(area)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors ${cfg.btnBg}`}
                  >
                    <Plus size={13} /> Agregar impresora
                  </button>
                </div>

                {imps.length === 0 ? (
                  <div className="py-10 text-center text-gray-300">
                    <Printer size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Sin impresoras configuradas</p>
                    <button
                      onClick={() => abrirNueva(area)}
                      className="mt-3 text-xs text-gold-600 hover:text-gold-700 font-medium underline"
                    >
                      Agregar la primera
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {imps.map((imp) => (
                      <TarjetaImpresora
                        key={imp.id}
                        imp={imp}
                        onEditar={() => abrirEditar(imp)}
                        onEliminar={() => setConfirmEliminarId(imp.id)}
                        onTest={() => testImprimir(imp)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex items-start gap-2 text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
          <AlertCircle size={13} className="mt-0.5 shrink-0 text-gray-300" />
          <p>
            Las impresoras configuradas aquí recibirán los tickets automáticamente al enviar comandas.
            Asegúrate de que las impresoras de red estén encendidas y accesibles en la misma red local.
          </p>
        </div>
      </div>

      {modal.abierto && (
        <ModalImpresora
          form={form} setForm={setForm}
          editando={modal.editandoId !== null}
          onGuardar={guardar}
          onCerrar={() => setModal({ abierto: false, editandoId: null })}
        />
      )}

      {impresoraAEliminar && (
        <ModalConfirmarEliminar
          impresora={impresoraAEliminar}
          onConfirmar={confirmarEliminar}
          onCancelar={() => setConfirmEliminarId(null)}
        />
      )}
    </div>
  )
}
