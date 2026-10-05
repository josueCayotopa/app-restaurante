import { useCallback, useEffect, useState } from 'react'
import Header from '../../components/layout/Header'
import { useMesasStore } from '../../store/mesasStore'
import { apiFetch, ApiError } from '../../lib/api'
import { exportarExcel } from '../../lib/exportarExcel'
import type { ResumenReporte } from '../../types'
import {
  TrendingUp, Wallet, Users, Clock, BarChart3, Receipt, Star,
  FileSpreadsheet, Table2, Tag, Layers, Loader2, RefreshCw,
} from 'lucide-react'

const soles = (n: number) => `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const solesCorto = (n: number) => `S/ ${Math.round(n).toLocaleString('es-PE')}`

// ── Fechas (hora local) ─────────────────────────────────────────────────────
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const sumarDias = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

type Preset = 'hoy' | 'ayer' | '7dias' | 'mes' | 'mesAnterior' | 'personalizado'
function rangoDe(p: Exclude<Preset, 'personalizado'>): [string, string] {
  const hoy = new Date()
  switch (p) {
    case 'hoy': return [iso(hoy), iso(hoy)]
    case 'ayer': return [iso(sumarDias(hoy, -1)), iso(sumarDias(hoy, -1))]
    case '7dias': return [iso(sumarDias(hoy, -6)), iso(hoy)]
    case 'mes': return [iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), iso(hoy)]
    case 'mesAnterior': return [
      iso(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)),
      iso(new Date(hoy.getFullYear(), hoy.getMonth(), 0)),
    ]
  }
}
const PRESETS: { id: Exclude<Preset, 'personalizado'>; label: string }[] = [
  { id: 'hoy', label: 'Hoy' }, { id: 'ayer', label: 'Ayer' }, { id: '7dias', label: 'Últimos 7 días' },
  { id: 'mes', label: 'Este mes' }, { id: 'mesAnterior', label: 'Mes anterior' },
]
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
function etiquetaDia(fecha: string, muchos: boolean) {
  const [y, m, d] = fecha.split('-').map(Number)
  const f = new Date(y, m - 1, d)
  return muchos ? String(d) : `${DIAS_SEMANA[f.getDay()]} ${d}`
}

// ── Componentes ─────────────────────────────────────────────────────────────

function KPI({ label, valor, sub, icon: Icon, bg, texto }: {
  label: string; valor: string; sub?: string; icon: React.ElementType; bg: string; texto: string
}) {
  return (
    <div className={`rounded-xl p-5 ${bg}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-medium uppercase tracking-wide opacity-80 ${texto}`}>{label}</p>
        <Icon size={18} className={`opacity-70 ${texto}`} />
      </div>
      <p className={`text-2xl font-bold ${texto}`}>{valor}</p>
      {sub && <p className={`text-xs mt-1 opacity-75 ${texto}`}>{sub}</p>}
    </div>
  )
}

function Tarjeta({ titulo, icon: Icon, children, extra }: {
  titulo: string; icon: React.ElementType; children: React.ReactNode; extra?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-gold-600" />
        <h3 className="font-bold text-gray-800 text-sm">{titulo}</h3>
        {extra && <div className="ml-auto">{extra}</div>}
      </div>
      {children}
    </div>
  )
}

// Barras verticales de una sola serie, con tooltip al pasar el cursor o tocar
function GraficoBarras({ datos, vacio }: {
  datos: { etiqueta: string; valor: number; detalle: string }[]
  vacio: string
}) {
  const [activo, setActivo] = useState<number | null>(null)
  const max = Math.max(...datos.map((d) => d.valor), 0)
  if (max === 0) return <p className="text-sm text-gray-300 text-center py-10">{vacio}</p>

  return (
    <div>
      <div className="flex items-start justify-between text-[11px] text-gray-400 mb-1">
        <span>Máx. {solesCorto(max)}</span>
      </div>
      <div className="relative flex items-end gap-0.5 h-40 border-b border-gray-200" onMouseLeave={() => setActivo(null)}>
        {datos.map((d, i) => (
          <div key={d.etiqueta + i}
            className="flex-1 h-full flex items-end cursor-default"
            onMouseEnter={() => setActivo(i)}
            onClick={() => setActivo(activo === i ? null : i)}
            role="img"
            aria-label={`${d.etiqueta}: ${d.detalle}`}>
            <div className={`w-full rounded-t-[4px] transition-colors ${activo === i ? 'bg-gold-700' : 'bg-gold-600'}`}
              style={{ height: `${d.valor > 0 ? Math.max(2, (d.valor / max) * 100) : 0}%` }} />
          </div>
        ))}
        {activo !== null && (
          <div className="absolute -top-2 -translate-y-full pointer-events-none z-10 bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap"
            style={{ left: `${((activo + 0.5) / datos.length) * 100}%`, transform: 'translate(-50%, -100%)' }}>
            <p className="font-semibold">{datos[activo].etiqueta}</p>
            <p>{datos[activo].detalle}</p>
          </div>
        )}
      </div>
      <div className="flex gap-0.5 mt-1">
        {datos.map((d, i) => (
          <span key={d.etiqueta + i} className="flex-1 text-center text-[10px] text-gray-400 truncate">
            {/* Con muchas barras, se rotulan solo algunas para que no se encimen */}
            {datos.length <= 16 || i % Math.ceil(datos.length / 12) === 0 ? d.etiqueta : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

// Lista con barra horizontal proporcional y el valor siempre visible
function Ranking({ filas, vacio, numerado }: {
  filas: { nombre: string; valor: number; detalle: string }[]
  vacio: string
  numerado?: boolean
}) {
  if (filas.length === 0) return <p className="text-sm text-gray-300 text-center py-8">{vacio}</p>
  const max = Math.max(...filas.map((f) => f.valor), 1)
  return (
    <div className="space-y-3">
      {filas.map((f, idx) => (
        <div key={f.nombre + idx}>
          <div className="flex items-center justify-between mb-1 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {numerado && (
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-gray-200 text-gray-700 shrink-0">{idx + 1}</span>
              )}
              <span className="text-sm font-medium text-gray-700 truncate">{f.nombre}</span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-bold text-gray-800">{soles(f.valor)}</span>
              <span className="text-xs text-gray-400 ml-2">{f.detalle}</span>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 bg-gold-600 rounded-full" style={{ width: `${(f.valor / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Página ──────────────────────────────────────────────────────────────────

export default function ReportesPage() {
  const mesas = useMesasStore((s) => s.mesas)
  const [preset, setPreset] = useState<Preset>('hoy')
  const [[desde, hasta], setRango] = useState<[string, string]>(rangoDe('hoy'))
  const [datos, setDatos] = useState<ResumenReporte | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true); setError('')
    try {
      setDatos(await apiFetch<ResumenReporte>(`/api/reportes/resumen?desde=${desde}&hasta=${hasta}`))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el reporte')
    } finally {
      setCargando(false)
    }
  }, [desde, hasta])

  useEffect(() => { cargar() }, [cargar])

  const elegirPreset = (p: Exclude<Preset, 'personalizado'>) => { setPreset(p); setRango(rangoDe(p)) }

  const t = datos?.totales
  const totalMetodos = datos ? datos.porMetodo.efectivo + datos.porMetodo.tarjeta + datos.porMetodo.yape_plin : 0
  const pct = (v: number) => (totalMetodos > 0 ? `${Math.round((v / totalMetodos) * 100)}%` : '0%')
  const variosDias = (datos?.dias ?? 1) > 1

  return (
    <div className="flex flex-col h-full">
      <Header
        titulo="Reportes"
        subtitulo={desde === hasta ? `Ventas del ${desde}` : `Ventas del ${desde} al ${hasta}`}
        acciones={
          <button onClick={() => datos && exportarExcel(datos)} disabled={!datos || !t?.pedidos}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-xl text-sm transition-colors disabled:opacity-40">
            <FileSpreadsheet size={16} />
            Exportar Excel
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Filtros: una sola fila sobre los gráficos */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => elegirPreset(p.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                preset === p.id ? 'bg-gold-600 text-white border-gold-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gold-300'
              }`}>
              {p.label}
            </button>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <input type="date" value={desde} max={hasta}
              onChange={(e) => { setPreset('personalizado'); setRango([e.target.value, hasta]) }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-gold-500" />
            <span className="text-gray-400 text-sm">a</span>
            <input type="date" value={hasta} min={desde}
              onChange={(e) => { setPreset('personalizado'); setRango([desde, e.target.value]) }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-gold-500" />
            <button onClick={cargar} title="Actualizar" className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
              {cargando ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPI label="Ventas netas" valor={soles(t?.ventasNetas ?? 0)} icon={Wallet}
            sub={`Subtotal ${soles(t?.subtotal ?? 0)} − descuentos ${soles(t?.descuentos ?? 0)}`}
            bg="bg-gold-500" texto="text-gray-900" />
          <KPI label="Pedidos cobrados" valor={String(t?.pedidos ?? 0)} icon={Receipt}
            sub={`${t?.itemsVendidos ?? 0} ítems vendidos`}
            bg="bg-gold-600" texto="text-white" />
          <KPI label="Ticket promedio" valor={soles(t?.ticketPromedio ?? 0)} icon={TrendingUp}
            sub="Venta neta por pedido"
            bg="bg-gray-600" texto="text-white" />
          <KPI label="Propinas" valor={soles(t?.propinas ?? 0)} icon={Users}
            sub={t?.cancelados ? `${t.cancelados} pedido(s) cancelado(s) · ${soles(t.montoCancelado)}` : 'Sin pedidos cancelados'}
            bg="bg-rojo-500" texto="text-white" />
        </div>

        {/* Métodos de pago */}
        <Tarjeta titulo="Cobrado por método de pago" icon={Wallet}
          extra={<span className="text-xs text-gray-400">Total {soles(totalMetodos)} · incluye propinas</span>}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta'], ['yape_plin', 'Yape / Plin']] as const).map(([k, label]) => {
              const v = datos?.porMetodo[k] ?? 0
              return (
                <div key={k}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-medium text-gray-600">{label}</span>
                    <span className="text-xs text-gray-400">{pct(v)}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-800">{soles(v)}</p>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                    <div className="h-1.5 bg-gold-600 rounded-full" style={{ width: pct(v) }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Tarjeta>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {variosDias && (
            <Tarjeta titulo="Ventas netas por día" icon={BarChart3}>
              <GraficoBarras vacio="Sin ventas en este periodo"
                datos={(datos?.porDia ?? []).map((d) => ({
                  etiqueta: etiquetaDia(d.fecha, (datos?.porDia.length ?? 0) > 14),
                  valor: d.ventas,
                  detalle: `${soles(d.ventas)} · ${d.pedidos} pedido(s)`,
                }))} />
            </Tarjeta>
          )}
          <Tarjeta titulo="Ventas netas por hora" icon={Clock}>
            <GraficoBarras vacio="Sin ventas en este periodo"
              datos={(() => {
                const ph = datos?.porHora ?? []
                if (ph.length === 0) return []
                // Rango continuo de horas (aunque alguna hora intermedia no tenga ventas)
                const desdeH = ph[0].hora, hastaH = ph[ph.length - 1].hora
                return Array.from({ length: hastaH - desdeH + 1 }, (_, i) => {
                  const h = ph.find((x) => x.hora === desdeH + i)
                  return {
                    etiqueta: `${desdeH + i}h`,
                    valor: h?.ventas ?? 0,
                    detalle: `${soles(h?.ventas ?? 0)} · ${h?.pedidos ?? 0} pedido(s)`,
                  }
                })
              })()} />
          </Tarjeta>
          {!variosDias && (
            <Tarjeta titulo="Ventas por categoría" icon={Layers}>
              <Ranking vacio="Sin ventas"
                filas={(datos?.porCategoria ?? []).map((c) => ({ nombre: c.categoria, valor: c.ventas, detalle: `${c.cantidad} und.` }))} />
            </Tarjeta>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Tarjeta titulo="Productos más vendidos" icon={Star}>
            <Ranking numerado vacio="Sin ventas"
              filas={(datos?.topProductos ?? []).map((p) => ({ nombre: p.nombre, valor: p.ventas, detalle: `${p.cantidad} und.` }))} />
          </Tarjeta>
          <Tarjeta titulo="Ventas por mozo" icon={Users}>
            <Ranking vacio="Sin ventas"
              filas={(datos?.porMozo ?? []).map((m) => ({ nombre: m.mozo, valor: m.ventas, detalle: `${m.pedidos} pedido(s)` }))} />
          </Tarjeta>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {variosDias && (
            <Tarjeta titulo="Ventas por categoría" icon={Layers}>
              <Ranking vacio="Sin ventas"
                filas={(datos?.porCategoria ?? []).map((c) => ({ nombre: c.categoria, valor: c.ventas, detalle: `${c.cantidad} und.` }))} />
            </Tarjeta>
          )}
          <Tarjeta titulo="Descuentos aplicados" icon={Tag}>
            <Ranking vacio="Sin descuentos en este periodo"
              filas={(datos?.descuentos ?? []).map((d) => ({ nombre: d.promocion, valor: d.monto, detalle: `${d.pedidos} pedido(s)` }))} />
          </Tarjeta>
        </div>

        {/* Estado actual de mesas (en vivo, no depende del rango) */}
        <Tarjeta titulo="Estado actual de mesas" icon={Table2}>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {(['libre', 'ocupada', 'reservada', 'esperando_pago'] as const).map((estado) => {
              const count = mesas.filter((m) => m.estado === estado).length
              const labels = { libre: 'Libres', ocupada: 'Ocupadas', reservada: 'Reservadas', esperando_pago: 'Esp. pago' }
              // Misma paleta que MesasPage: verde=libre, rojo=ocupada, gris=reservada, azul=esperando pago, dorado=limpieza
              const colores = {
                libre: 'text-white bg-green-500', ocupada: 'text-white bg-rojo-500', reservada: 'text-white bg-gray-500',
                esperando_pago: 'text-white bg-steel-500',
              }
              return (
                <div key={estado} className={`rounded-xl p-3 text-center ${colores[estado]}`}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs font-medium opacity-80">{labels[estado]}</p>
                </div>
              )
            })}
          </div>
        </Tarjeta>
      </div>
    </div>
  )
}
