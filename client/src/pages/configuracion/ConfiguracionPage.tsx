import { useCallback, useEffect, useState } from 'react'
import Header from '../../components/layout/Header'
import {
  useImpresorasStore,
  type Impresora,
  type AreaImpresora,
  type TipoImpresora,
  type DatosImpresora,
} from '../../store/impresorasStore'
import { useToastStore } from '../../store/toastStore'
import { useTemaStore, type Tema } from '../../store/temaStore'
import { useAuthStore } from '../../store/authStore'
import { apiFetch, ApiError } from '../../lib/api'
import { socket } from '../../lib/socket'
import {
  impresorasDeEsteEquipo, guardarImpresorasDeEsteEquipo, anchoLocal, guardarAnchoLocal, imprimirEnNavegador,
} from '../../lib/impresion'
import { TONOS, leerConfigSonido, guardarConfigSonido, reproducirAlerta, type ConfigSonido } from '../../lib/sound'
import {
  ChefHat, Beer, Wallet, Printer, Plus, Pencil, Trash2,
  Wifi, Usb, X, CheckCircle2, AlertCircle, Send,
  ToggleLeft, ToggleRight, Sun, Moon, Monitor, Check, Loader2, Laptop, History, RotateCcw,
  Volume2, VolumeX, Bell, Play,
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

// ── SECCIÓN SONIDO (por equipo) ───────────────────────────────────────────────

function SeccionSonido() {
  const [cfg, setCfg] = useState<ConfigSonido>(leerConfigSonido)
  const cambiar = (parcial: Partial<ConfigSonido>, probar = false) => {
    const nueva = { ...cfg, ...parcial }
    setCfg(nueva)
    guardarConfigSonido(nueva)
    if (probar) reproducirAlerta(nueva, true)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <Volume2 size={16} className="text-gold-700" />
        <span className="text-sm font-bold text-gray-700">Sonido de avisos</span>
        <span className="ml-auto text-[11px] text-gray-400">Se guarda en este equipo</span>
      </div>

      <div className="p-5 space-y-5">
        <Interruptor activo={cfg.activo} onClick={() => cambiar({ activo: !cfg.activo })}
          label="Sonar al llegar pedidos y avisos"
          desc="Pedidos nuevos, adiciones, platos listos, anulados y devoluciones" />

        <div className={cfg.activo ? '' : 'opacity-50 pointer-events-none'}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tono (tócalo para escucharlo)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {TONOS.map((t) => {
              const activo = cfg.tono === t.valor
              return (
                <button key={t.valor} type="button" onClick={() => cambiar({ tono: t.valor }, true)}
                  className={`flex items-start gap-3 text-left px-3 py-2.5 rounded-xl border-2 transition-colors ${activo ? 'border-gold-500 bg-gold-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${activo ? 'bg-gold-500 text-black' : 'bg-gray-100 text-gray-500'}`}>
                    <Bell size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-bold ${activo ? 'text-gold-700' : 'text-gray-700'}`}>{t.label}</span>
                    <span className="block text-xs text-gray-400 leading-snug">{t.desc}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Volumen</p>
                <span className="text-sm font-bold text-gray-800">{cfg.volumen}%</span>
              </div>
              <div className="flex items-center gap-3">
                <VolumeX size={16} className="text-gray-400 shrink-0" />
                <input type="range" min={10} max={100} step={5} value={cfg.volumen}
                  onChange={(e) => cambiar({ volumen: Number(e.target.value) })}
                  onPointerUp={() => reproducirAlerta({ ...cfg, repeticiones: 1 }, true)}
                  className="flex-1 h-2 accent-gold-600 cursor-pointer" />
                <Volume2 size={18} className="text-gray-700 shrink-0" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Repetir el aviso</p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((n) => (
                  <button key={n} type="button" onClick={() => cambiar({ repeticiones: n }, true)}
                    className={`py-2 rounded-lg text-sm font-semibold ${cfg.repeticiones === n ? 'bg-gold-500 text-gray-900' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    {n === 1 ? '1 vez' : `${n} veces`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-5">
            <button type="button" onClick={() => reproducirAlerta(cfg, true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 text-white rounded-xl text-sm font-semibold hover:bg-gray-900">
              <Play size={15} /> Probar sonido
            </button>
            <p className="text-xs text-gray-400 leading-snug">
              El 100 % es el máximo del navegador: si aún se oye bajo, sube también el volumen de Windows o de la tablet
              (o conecta un parlante). Toca la pantalla una vez al encender el equipo para que el navegador permita sonar.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Configuración visual por área ────────────────────────────────────────────

const AREA_CFG: Record<AreaImpresora, { label: string; desc: string; Icon: React.ElementType; solidBg: string; solidText: string; badge: string; btnBg: string }> = {
  cocina: { label: 'Cocina', desc: 'Comandas de platos al enviar un pedido', Icon: ChefHat, solidBg: 'bg-rojo-500', solidText: 'text-white', badge: 'bg-black/15 text-white', btnBg: 'bg-black/20 hover:bg-black/30' },
  bar:    { label: 'Bar', desc: 'Comandas de bebidas al enviar un pedido', Icon: Beer, solidBg: 'bg-gold-500', solidText: 'text-gray-900', badge: 'bg-black/10 text-gray-900', btnBg: 'bg-black/15 hover:bg-black/25' },
  caja:   { label: 'Caja', desc: 'Ticket al cobrar y cierre de caja', Icon: Wallet, solidBg: 'bg-gray-600', solidText: 'text-white', badge: 'bg-white/15 text-white', btnBg: 'bg-white/15 hover:bg-white/25' },
}
const AREAS: AreaImpresora[] = ['cocina', 'bar', 'caja']

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gold-500'
const errorDe = (e: unknown) => (e instanceof ApiError ? e.message : 'No se pudo completar: revisa la conexión')

type FormImpresora = { nombre: string; area: AreaImpresora; tipo: TipoImpresora; ip: string; puerto: string; ancho: 58 | 80; copias: string; autoImprimir: boolean; abrirGaveta: boolean }
const formDe = (area: AreaImpresora, imp?: Impresora): FormImpresora => ({
  nombre: imp?.nombre ?? '', area: imp?.area ?? area, tipo: imp?.tipo ?? 'red',
  ip: imp?.ip ?? '', puerto: String(imp?.puerto ?? 9100), ancho: imp?.ancho ?? 80,
  copias: String(imp?.copias ?? 1), autoImprimir: imp?.autoImprimir ?? true, abrirGaveta: imp?.abrirGaveta ?? false,
})

function Interruptor({ activo, onClick, label, desc }: { activo: boolean; onClick: () => void; label: string; desc?: string }) {
  return (
    <button type="button" onClick={onClick} className="flex items-start gap-3 text-left w-full">
      <span className={`mt-0.5 w-10 h-6 rounded-full relative shrink-0 transition-colors ${activo ? 'bg-gold-500' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${activo ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      <span>
        <span className="block text-sm font-medium text-gray-700">{label}</span>
        {desc && <span className="block text-xs text-gray-400">{desc}</span>}
      </span>
    </button>
  )
}

// ── Modal agregar / editar impresora ─────────────────────────────────────────

function ModalImpresora({ area, impresora, onCerrar }: { area: AreaImpresora; impresora?: Impresora; onCerrar: () => void }) {
  const { crear, actualizar } = useImpresorasStore()
  const [f, setF] = useState<FormImpresora>(formDe(area, impresora))
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const set = <K extends keyof FormImpresora>(k: K, v: FormImpresora[K]) => setF((x) => ({ ...x, [k]: v }))

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true); setError('')
    const datos: DatosImpresora = {
      nombre: f.nombre, area: f.area, tipo: f.tipo, ip: f.tipo === 'red' ? f.ip.trim() : null,
      puerto: parseInt(f.puerto) || 9100, ancho: f.ancho, copias: parseInt(f.copias) || 1,
      activa: impresora?.activa ?? true, autoImprimir: f.autoImprimir, abrirGaveta: f.area === 'caja' && f.abrirGaveta,
    }
    try {
      if (impresora) await actualizar(impresora.id, datos)
      else await crear(datos)
      onCerrar()
    } catch (err) { setError(errorDe(err)); setEnviando(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />
      <form onSubmit={guardar} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-gold-700" />
            <h2 className="font-bold text-gray-800">{impresora ? 'Editar impresora' : 'Nueva impresora'}</h2>
          </div>
          <button type="button" onClick={onCerrar} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"><X size={18} /></button>
        </div>
        <div className="px-6 py-5 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nombre</label>
            <input required value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Térmica de cocina" className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Área</label>
            <div className="grid grid-cols-3 gap-2">
              {AREAS.map((a) => {
                const cfg = AREA_CFG[a]
                return (
                  <button key={a} type="button" onClick={() => set('area', a)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                      f.area === a ? `${cfg.solidBg} ${cfg.solidText}` : 'border-2 border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    <cfg.Icon size={18} /> {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">¿Cómo está conectada?</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['red', 'A la red (LAN / WiFi)', 'Tiene cable de red o WiFi. El servidor le envía el ticket directo.', Wifi],
                ['equipo', 'Por USB a un equipo', 'Conectada a una PC o tablet, que imprime con el navegador.', Usb],
              ] as const).map(([tipo, titulo, desc, Icon]) => (
                <button key={tipo} type="button" onClick={() => set('tipo', tipo)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${f.tipo === tipo ? 'border-gold-500 bg-gold-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-800"><Icon size={15} /> {titulo}</span>
                  <span className="block text-xs text-gray-500 mt-1 leading-snug">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {f.tipo === 'red' ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Dirección IP</label>
                <input required value={f.ip} onChange={(e) => set('ip', e.target.value)} placeholder="192.168.1.100" inputMode="decimal" className={`${inputCls} font-mono`} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Puerto</label>
                <input value={f.puerto} onChange={(e) => set('puerto', e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={`${inputCls} font-mono`} />
              </div>
              <p className="col-span-3 text-xs text-gray-400 -mt-1">
                ¿No sabes la IP? Apaga la impresora, mantén presionado el botón <strong>FEED</strong> y enciéndela: imprime una hoja de configuración con su IP.
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              Después de guardarla, entra a <strong>Configuración</strong> en la PC o tablet donde está conectada y márcala en
              <strong> “Este equipo”</strong>. Ese equipo debe tener esta app abierta para imprimir.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ancho del papel</label>
              <div className="flex gap-2">
                {([58, 80] as const).map((a) => (
                  <button key={a} type="button" onClick={() => set('ancho', a)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold ${f.ancho === a ? 'border-gold-500 bg-gold-50 text-gold-700' : 'border-gray-200 text-gray-500'}`}>
                    {a} mm
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Copias por ticket</label>
              <select value={f.copias} onChange={(e) => set('copias', e.target.value)} className={inputCls}>
                {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {f.area !== 'caja' && (
              <Interruptor activo={f.autoImprimir} onClick={() => set('autoImprimir', !f.autoImprimir)}
                label="Imprimir automáticamente cada pedido"
                desc="Si lo apagas, solo imprime cuando cocina/bar toca el botón de reimprimir" />
            )}
            {f.area === 'caja' && (
              <Interruptor activo={f.abrirGaveta} onClick={() => set('abrirGaveta', !f.abrirGaveta)}
                label="Abrir la gaveta de dinero al cobrar en efectivo"
                desc={f.tipo === 'red' ? 'La gaveta debe estar conectada a la impresora (cable RJ11)' : 'Solo funciona con impresoras de red'} />
            )}
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button type="button" onClick={onCerrar} className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
          <button type="submit" disabled={enviando}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gold-600 text-white text-sm font-semibold hover:bg-gold-700 disabled:opacity-50">
            {enviando ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            {impresora ? 'Guardar cambios' : 'Agregar impresora'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Fila de impresora ────────────────────────────────────────────────────────

function FilaImpresora({ imp, onEditar }: { imp: Impresora; onEditar: () => void }) {
  const { alternar, eliminar, probar } = useImpresorasStore()
  const agregarToast = useToastStore((s) => s.agregar)
  const [probando, setProbando] = useState(false)
  const asignadaAqui = impresorasDeEsteEquipo().includes(imp.id)

  const hacerPrueba = async () => {
    setProbando(true)
    try {
      await probar(imp.id)
      agregarToast({ tipo: 'success', titulo: 'Prueba enviada', mensaje: `Revisa el papel en ${imp.nombre}`, duracion: 4000 })
    } catch (e) {
      agregarToast({ tipo: 'error', titulo: `No imprimió: ${imp.nombre}`, mensaje: errorDe(e), duracion: 9000 })
    } finally { setProbando(false) }
  }
  const borrar = async () => {
    if (!confirm(`¿Eliminar la impresora "${imp.nombre}"?`)) return
    try { await eliminar(imp.id) } catch (e) { alert(errorDe(e)) }
  }

  return (
    <div className={`flex items-center gap-4 px-5 py-4 ${!imp.activa ? 'opacity-50' : ''}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${imp.activa ? 'bg-gold-500' : 'bg-gray-400'}`}>
        <Printer size={18} className={imp.activa ? 'text-gray-900' : 'text-white'} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800 truncate">{imp.nombre}</p>
          {!imp.activa && <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-gray-400 text-white">Apagada en el sistema</span>}
          {imp.area !== 'caja' && !imp.autoImprimir && <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-gray-200 text-gray-600">Solo manual</span>}
          {imp.abrirGaveta && <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-gray-200 text-gray-600">Abre gaveta</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-gray-500">
          {imp.tipo === 'red'
            ? <span className="flex items-center gap-1"><Wifi size={11} /> Red · <span className="font-mono">{imp.ip}:{imp.puerto}</span></span>
            : <span className="flex items-center gap-1"><Usb size={11} /> USB en un equipo{asignadaAqui ? ' · conectada a este' : ''}</span>}
          <span>{imp.ancho} mm</span>
          {imp.copias > 1 && <span>{imp.copias} copias</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={hacerPrueba} disabled={probando || !imp.activa} title="Imprimir prueba"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:border-gold-500 hover:text-gold-700 disabled:opacity-40">
          {probando ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Probar
        </button>
        <button onClick={onEditar} title="Editar" className="p-2 rounded-lg text-gray-400 hover:text-gold-700 hover:bg-gold-50"><Pencil size={15} /></button>
        <button onClick={() => alternar(imp.id, 'activa').catch((e) => alert(errorDe(e)))} title={imp.activa ? 'Desactivar' : 'Activar'}
          className="p-2 rounded-lg hover:bg-gold-50">
          {imp.activa ? <ToggleRight size={20} className="text-gold-600" /> : <ToggleLeft size={20} className="text-gray-400" />}
        </button>
        <button onClick={borrar} title="Eliminar" className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={15} /></button>
      </div>
    </div>
  )
}

// ── Este equipo ───────────────────────────────────────────────────────────────
// Ajustes que viven en ESTE navegador: qué impresoras USB están conectadas aquí
// y el ancho para imprimir localmente cuando un área no tiene impresora configurada.

function SeccionEsteEquipo() {
  const impresoras = useImpresorasStore((s) => s.impresoras)
  const [asignadas, setAsignadas] = useState<string[]>(impresorasDeEsteEquipo())
  const [ancho, setAncho] = useState<58 | 80>(anchoLocal())
  const deEquipo = impresoras.filter((i) => i.tipo === 'equipo')

  const alternar = (id: string) => {
    const nuevas = asignadas.includes(id) ? asignadas.filter((x) => x !== id) : [...asignadas, id]
    setAsignadas(nuevas); guardarImpresorasDeEsteEquipo(nuevas)
  }
  const cambiarAncho = (a: 58 | 80) => { setAncho(a); guardarAnchoLocal(a) }
  const probarAqui = () => imprimirEnNavegador({
    titulo: 'Prueba local',
    lineas: [
      { t: 'logo' },
      { t: 'texto', texto: 'PRUEBA EN ESTE EQUIPO', alinear: 'centro', negrita: true, tam: 'alto' },
      { t: 'separador' },
      { t: 'fila', izq: 'Fecha', der: new Date().toLocaleString('es-PE') },
      { t: 'texto', texto: 'Tildes: á é í ó ú ñ ¿? ¡!' },
      { t: 'separador', doble: true },
    ],
  }, ancho)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <Laptop size={16} className="text-gold-700" />
        <span className="text-sm font-bold text-gray-700">Este equipo</span>
        <span className="text-xs text-gray-400">(se guarda solo en este navegador)</span>
      </div>
      <div className="p-5 space-y-5">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-1">Impresoras USB conectadas a este equipo</p>
          {deEquipo.length === 0 ? (
            <p className="text-xs text-gray-400">No hay impresoras de tipo “USB en un equipo”. Si la impresora de este equipo es USB, el administrador debe agregarla abajo con ese tipo.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {deEquipo.map((imp) => (
                <Interruptor key={imp.id} activo={asignadas.includes(imp.id)} onClick={() => alternar(imp.id)}
                  label={`${imp.nombre} (${AREA_CFG[imp.area].label})`}
                  desc={asignadas.includes(imp.id) ? 'Este equipo imprimirá sus tickets — mantén la app abierta' : 'No conectada a este equipo'} />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Papel de la impresora de este equipo</p>
            <div className="flex gap-2">
              {([58, 80] as const).map((a) => (
                <button key={a} onClick={() => cambiarAncho(a)}
                  className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold ${ancho === a ? 'border-gold-500 bg-gold-50 text-gold-700' : 'border-gray-200 text-gray-500'}`}>
                  {a} mm
                </button>
              ))}
            </div>
          </div>
          <button onClick={probarAqui} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:border-gold-500">
            <Printer size={15} /> Probar impresión aquí
          </button>
        </div>
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 leading-relaxed">
          <strong>Para que imprima sin preguntar:</strong> en la PC de Caja (o de Cocina/Bar con USB), crea un acceso directo a Chrome
          con <span className="font-mono bg-white px-1 rounded border border-gray-200">--kiosk-printing</span> al final del destino y deja esa
          impresora como predeterminada en Windows. Así los tickets salen directo, sin el cuadro de diálogo.
        </p>
      </div>
    </div>
  )
}

// ── Historial de impresiones ─────────────────────────────────────────────────

interface Trabajo { id: string; creadoEn: string; impresora: string; area: string; titulo: string; estado: 'ok' | 'error' | 'enviando'; error?: string }

function SeccionHistorial() {
  const [trabajos, setTrabajos] = useState<Trabajo[]>([])
  const [reintentando, setReintentando] = useState<string | null>(null)
  const cargar = useCallback(() => { apiFetch<Trabajo[]>('/api/impresion/historial').then(setTrabajos).catch(() => {}) }, [])

  useEffect(() => {
    cargar()
    socket.on('impresion:historial', cargar)
    return () => { socket.off('impresion:historial', cargar) }
  }, [cargar])

  const reintentar = async (id: string) => {
    setReintentando(id)
    try { await apiFetch(`/api/impresion/historial/${id}/reintentar`, { method: 'POST' }) } catch (e) { alert(errorDe(e)) }
    finally { setReintentando(null); cargar() }
  }
  const errores = trabajos.filter((t) => t.estado === 'error').length

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mt-5">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50">
        <History size={16} className="text-gold-700" />
        <span className="text-sm font-bold text-gray-700">Últimas impresiones</span>
        {errores > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-semibold">{errores} con error</span>}
        <span className="ml-auto text-xs text-gray-400">Se reinicia al apagar el servidor</span>
      </div>
      {trabajos.length === 0 ? (
        <p className="text-sm text-gray-300 text-center py-8">Todavía no se imprimió nada desde que encendió el servidor</p>
      ) : (
        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {trabajos.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-5 py-2.5">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.estado === 'ok' ? 'bg-green-600' : t.estado === 'error' ? 'bg-red-500' : 'bg-gold-500 animate-pulse'}`}
                title={t.estado === 'ok' ? 'Impreso' : t.estado === 'error' ? 'Error' : 'Enviando'} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{t.titulo}</p>
                <p className={`text-xs truncate ${t.estado === 'error' ? 'text-red-500' : 'text-gray-400'}`}>
                  {new Date(t.creadoEn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} · {t.impresora}
                  {t.estado === 'error' ? ` · ${t.error}` : t.estado === 'ok' ? ' · impreso' : ' · enviando…'}
                </p>
              </div>
              {t.estado === 'error' && (
                <button onClick={() => reintentar(t.id)} disabled={reintentando === t.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gold-600 text-white text-xs font-semibold hover:bg-gold-700 disabled:opacity-50">
                  {reintentando === t.id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Reintentar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function ConfiguracionPage() {
  const { impresoras, cargado, cargar } = useImpresorasStore()
  const esAdmin = useAuthStore((s) => s.usuario?.rol === 'admin')
  const [modal, setModal] = useState<{ area: AreaImpresora; impresora?: Impresora } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => { cargar().catch((e) => setError(errorDe(e))) }, [cargar])

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Configuración" subtitulo="Apariencia, sonido, este equipo e impresoras" />

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <SeccionApariencia />
        <SeccionSonido />
        <SeccionEsteEquipo />

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        {esAdmin && (
          <>
            <div className="flex items-center gap-2 mb-3 mt-2">
              <Printer size={18} className="text-gold-700" />
              <h2 className="text-base font-bold text-gray-800">Impresoras del local</h2>
            </div>

            {!cargado && !error && <div className="flex justify-center py-8 text-gray-300"><Loader2 className="animate-spin" /></div>}

            <div className="space-y-5">
              {cargado && AREAS.map((area) => {
                const cfg = AREA_CFG[area]
                const imps = impresoras.filter((i) => i.area === area)
                const activas = imps.filter((i) => i.activa).length
                return (
                  <div key={area} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className={`flex items-center justify-between gap-3 px-5 py-3.5 ${cfg.solidBg}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <cfg.Icon size={18} className={cfg.solidText} />
                        <div className="min-w-0">
                          <p className={`text-sm font-bold ${cfg.solidText}`}>{cfg.label}
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badge}`}>{activas} activa{activas !== 1 ? 's' : ''}</span>
                          </p>
                          <p className={`text-xs opacity-80 truncate ${cfg.solidText}`}>{cfg.desc}</p>
                        </div>
                      </div>
                      <button onClick={() => setModal({ area })}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 ${cfg.btnBg} ${cfg.solidText}`}>
                        <Plus size={13} /> Agregar
                      </button>
                    </div>
                    {imps.length === 0 ? (
                      <div className="px-5 py-6 text-sm text-gray-400 flex items-start gap-2">
                        <AlertCircle size={16} className="shrink-0 mt-0.5 text-gray-300" />
                        <span>
                          Sin impresora: {area === 'caja'
                            ? 'los tickets se imprimen en el equipo que cobra, con el navegador.'
                            : 'los pedidos solo se ven en la pantalla; el botón de reimprimir usa la impresora del equipo de esa pantalla.'}
                        </span>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {imps.map((imp) => <FilaImpresora key={imp.id} imp={imp} onEditar={() => setModal({ area, impresora: imp })} />)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <SeccionHistorial />
          </>
        )}
      </div>

      {modal && <ModalImpresora area={modal.area} impresora={modal.impresora} onCerrar={() => setModal(null)} />}
    </div>
  )
}
