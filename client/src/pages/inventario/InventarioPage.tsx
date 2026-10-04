import { useCallback, useEffect, useState } from 'react'
import Header from '../../components/layout/Header'
import { apiFetch, ApiError } from '../../lib/api'
import { socket } from '../../lib/socket'
import {
  Package, AlertTriangle, TrendingDown, Plus, Edit2, X, Check,
  ArrowUp, ArrowDown, Search, Filter, Loader2, Trash2, Scale,
} from 'lucide-react'

type UnidadMedida = 'kg' | 'g' | 'l' | 'ml' | 'unidad' | 'caja' | 'bolsa' | 'saco'
type CategoriaInsumo = 'carnes' | 'pescados' | 'verduras' | 'lacteos' | 'bebidas' | 'abarrotes' | 'descartables'

export interface Insumo {
  id: string
  nombre: string
  categoria: CategoriaInsumo
  unidad: UnidadMedida
  stockActual: number
  stockMinimo: number
  stockMaximo: number
  precioUnitario: number
  proveedor?: string | null
}

type TipoMovimiento = 'entrada' | 'salida' | 'merma' | 'ajuste'

interface Movimiento {
  id: string
  insumoId: string
  tipo: TipoMovimiento
  cantidad: number
  stockResultante?: number | null
  motivo?: string | null
  usuario?: string | null
  realizadoEn: string
  insumo: { nombre: string; unidad: string }
}

const UNIDADES: UnidadMedida[] = ['kg', 'g', 'l', 'ml', 'unidad', 'caja', 'bolsa', 'saco']

const CATEGORIAS_INSUMO: { valor: CategoriaInsumo; label: string; emoji: string }[] = [
  { valor: 'carnes', label: 'Carnes', emoji: '🥩' },
  { valor: 'pescados', label: 'Pescados', emoji: '🐟' },
  { valor: 'verduras', label: 'Verduras', emoji: '🥦' },
  { valor: 'lacteos', label: 'Lácteos', emoji: '🥛' },
  { valor: 'bebidas', label: 'Bebidas', emoji: '🥤' },
  { valor: 'abarrotes', label: 'Abarrotes', emoji: '🛒' },
  { valor: 'descartables', label: 'Descartables', emoji: '📦' },
]

// `color`/`bg` (tono suave) para el selector de tipo; `chipBg`/`chipText`
// (fondo SÓLIDO) para el ícono en el historial de movimientos.
const MOVIMIENTO_CONFIG: Record<TipoMovimiento, { label: string; color: string; bg: string; chipBg: string; chipText: string; icon: React.ElementType; signo: string }> = {
  entrada: { label: 'Entrada', color: 'text-gold-700',  bg: 'bg-gold-50',  chipBg: 'bg-gold-500', chipText: 'text-gray-900', icon: ArrowUp,      signo: '+' },
  salida:  { label: 'Salida',  color: 'text-gray-700',  bg: 'bg-gray-100', chipBg: 'bg-gray-500', chipText: 'text-white',    icon: ArrowDown,    signo: '−' },
  merma:   { label: 'Merma',   color: 'text-red-600',   bg: 'bg-red-50',   chipBg: 'bg-red-500',  chipText: 'text-white',    icon: TrendingDown, signo: '−' },
  ajuste:  { label: 'Ajuste',  color: 'text-rojo-600',  bg: 'bg-rojo-50',  chipBg: 'bg-rojo-500', chipText: 'text-white',    icon: Scale,        signo: '±' },
}

function nivelStock(insumo: Insumo): 'critico' | 'bajo' | 'normal' | 'alto' {
  if (insumo.stockActual <= insumo.stockMinimo * 0.5) return 'critico'
  if (insumo.stockActual <= insumo.stockMinimo) return 'bajo'
  if (insumo.stockMaximo > 0 && insumo.stockActual / insumo.stockMaximo > 0.9) return 'alto'
  return 'normal'
}

// `bg`/`color` con fondo SÓLIDO — insignia de nivel de stock en la tabla.
const NIVEL_CONFIG = {
  critico: { label: 'Crítico', color: 'text-white',    bg: 'bg-red-500',   bar: 'bg-red-500'  },
  bajo:    { label: 'Bajo',    color: 'text-white',    bg: 'bg-rojo-500',  bar: 'bg-rojo-500'  },
  normal:  { label: 'Normal',  color: 'text-gray-900', bg: 'bg-gold-500',  bar: 'bg-gold-500'  },
  alto:    { label: 'Alto',    color: 'text-white',    bg: 'bg-gray-500',  bar: 'bg-gray-400'  },
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500'
const errorDe = (e: unknown) => (e instanceof ApiError ? e.message : 'No se pudo guardar: revisa la conexión')

// ─── Modal crear / editar insumo ──────────────────────────────────────────────

function ModalInsumo({ insumo, onGuardado, onCerrar }: {
  insumo?: Insumo; onGuardado: () => void; onCerrar: () => void
}) {
  const [form, setForm] = useState({
    nombre: insumo?.nombre ?? '',
    categoria: insumo?.categoria ?? ('abarrotes' as CategoriaInsumo),
    unidad: insumo?.unidad ?? ('kg' as UnidadMedida),
    stockActual: '',
    stockMinimo: String(insumo?.stockMinimo ?? ''),
    stockMaximo: String(insumo?.stockMaximo ?? ''),
    precioUnitario: String(insumo?.precioUnitario ?? ''),
    proveedor: insumo?.proveedor ?? '',
  })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value })

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true); setError('')
    const datos = {
      nombre: form.nombre, categoria: form.categoria, unidad: form.unidad, proveedor: form.proveedor,
      stockMinimo: parseFloat(form.stockMinimo) || 0,
      stockMaximo: parseFloat(form.stockMaximo) || 0,
      precioUnitario: parseFloat(form.precioUnitario) || 0,
      ...(insumo ? {} : { stockActual: parseFloat(form.stockActual) || 0 }),
    }
    try {
      await apiFetch(insumo ? `/api/inventario/${insumo.id}` : '/api/inventario', {
        method: insumo ? 'PATCH' : 'POST', body: JSON.stringify(datos),
      })
      onGuardado(); onCerrar()
    } catch (err) { setError(errorDe(err)); setEnviando(false) }
  }

  const eliminar = async () => {
    if (!insumo || !confirm(`¿Eliminar "${insumo.nombre}" y todo su historial de movimientos?`)) return
    setEnviando(true)
    try { await apiFetch(`/api/inventario/${insumo.id}`, { method: 'DELETE' }); onGuardado(); onCerrar() }
    catch (err) { setError(errorDe(err)); setEnviando(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">{insumo ? 'Editar insumo' : 'Nuevo insumo'}</h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>
        <form onSubmit={guardar} className="overflow-y-auto p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
            <input required value={form.nombre} onChange={set('nombre')} placeholder="ej. Panceta de cerdo" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
            <select value={form.categoria} onChange={set('categoria')} className={inputCls}>
              {CATEGORIAS_INSUMO.map((c) => <option key={c.valor} value={c.valor}>{c.emoji} {c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Unidad</label>
            <select value={form.unidad} onChange={set('unidad')} className={inputCls}>
              {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          {!insumo && (
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Stock inicial ({form.unidad})</label>
              <input type="number" min={0} step={0.001} value={form.stockActual} onChange={set('stockActual')} placeholder="0" className={inputCls} />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Stock mínimo (alerta)</label>
            <input type="number" min={0} step={0.001} value={form.stockMinimo} onChange={set('stockMinimo')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Stock máximo</label>
            <input type="number" min={0} step={0.001} value={form.stockMaximo} onChange={set('stockMaximo')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Costo por {form.unidad} (S/)</label>
            <input type="number" min={0} step={0.01} value={form.precioUnitario} onChange={set('precioUnitario')} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Proveedor habitual</label>
            <input value={form.proveedor} onChange={set('proveedor')} className={inputCls} />
          </div>
          {insumo && (
            <p className="col-span-2 text-xs text-gray-400">El stock no se edita aquí: usa “Mov.” → Ajuste (conteo físico), así queda registrado.</p>
          )}
          {error && <p className="col-span-2 text-sm text-red-500">{error}</p>}
          <div className="col-span-2 flex gap-3 pt-1">
            {insumo && (
              <button type="button" onClick={eliminar} disabled={enviando} title="Eliminar"
                className="px-3 py-2 border border-red-200 text-red-500 rounded-lg hover:bg-red-50"><Trash2 size={15} /></button>
            )}
            <button type="button" onClick={onCerrar} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={enviando}
              className="flex-1 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {enviando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {insumo ? 'Guardar' : 'Crear insumo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal movimiento de stock ────────────────────────────────────────────────

function ModalMovimiento({ insumo, onGuardado, onCerrar }: {
  insumo: Insumo; onGuardado: () => void; onCerrar: () => void
}) {
  const [tipo, setTipo] = useState<TipoMovimiento>('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const n = parseFloat(cantidad)
  const valido = tipo === 'ajuste' ? n >= 0 : n > 0
  const resultado = !valido ? null
    : tipo === 'entrada' ? insumo.stockActual + n
    : tipo === 'ajuste' ? n
    : insumo.stockActual - n

  const registrar = async () => {
    setEnviando(true); setError('')
    try {
      await apiFetch(`/api/inventario/${insumo.id}/movimiento`, { method: 'POST', body: JSON.stringify({ tipo, cantidad: n, motivo }) })
      onGuardado(); onCerrar()
    } catch (err) { setError(errorDe(err)); setEnviando(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800 text-sm">Registrar movimiento</h2>
            <p className="text-xs text-gray-400">{insumo.nombre} · stock actual {insumo.stockActual} {insumo.unidad}</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(['entrada', 'salida', 'merma', 'ajuste'] as TipoMovimiento[]).map((t) => {
              const cfg = MOVIMIENTO_CONFIG[t]
              const Icon = cfg.icon
              return (
                <button key={t} onClick={() => setTipo(t)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    tipo === t ? `border-current ${cfg.bg} ${cfg.color}` : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}>
                  <Icon size={14} /> {t === 'ajuste' ? 'Ajuste (conteo)' : cfg.label}
                </button>
              )
            })}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {tipo === 'ajuste' ? `Stock contado físicamente (${insumo.unidad})` : `Cantidad (${insumo.unidad})`}
            </label>
            <input type="number" min={0} step={0.001} value={cantidad} autoFocus
              onChange={(e) => setCantidad(e.target.value)} className={inputCls} placeholder="0" />
            {resultado !== null && (
              <p className={`text-xs mt-1 font-medium ${resultado < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                {resultado < 0 ? `Solo hay ${insumo.stockActual} ${insumo.unidad}` : `Quedará: ${Math.round(resultado * 1000) / 1000} ${insumo.unidad}`}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Motivo</label>
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputCls}
              placeholder={tipo === 'merma' ? 'ej. Se malogró' : tipo === 'salida' ? 'ej. Consumo del día' : 'Opcional'} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onCerrar} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={registrar} disabled={!valido || (resultado ?? 0) < 0 || enviando}
              className="flex-1 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 disabled:opacity-40 flex items-center justify-center gap-2">
              {enviando ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Registrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function InventarioPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaInsumo | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [tab, setTab] = useState<'stock' | 'movimientos'>('stock')
  const [insumoMov, setInsumoMov] = useState<Insumo | null>(null)
  const [modalInsumo, setModalInsumo] = useState<{ abierto: boolean; insumo?: Insumo }>({ abierto: false })
  const [soloAlertas, setSoloAlertas] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const [i, m] = await Promise.all([
        apiFetch<Insumo[]>('/api/inventario'),
        apiFetch<Movimiento[]>('/api/inventario/movimientos?limite=200'),
      ])
      setInsumos(i); setMovimientos(m); setError('')
    } catch (e) {
      setError(errorDe(e))
    } finally {
      setCargando(false)
    }
  }, [])
  useEffect(() => {
    cargar()
    // Las ventas descuentan insumos por receta: el stock se actualiza solo
    socket.on('inventario:actualizado', cargar)
    return () => { socket.off('inventario:actualizado', cargar) }
  }, [cargar])

  const insumosFiltrados = insumos.filter((i) => {
    const matchCat = categoriaFiltro === 'todos' || i.categoria === categoriaFiltro
    const matchBusq = i.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchAlerta = !soloAlertas || nivelStock(i) === 'critico' || nivelStock(i) === 'bajo'
    return matchCat && matchBusq && matchAlerta
  })

  const criticos = insumos.filter((i) => nivelStock(i) === 'critico').length
  const bajos = insumos.filter((i) => nivelStock(i) === 'bajo').length
  const valorTotal = insumos.reduce((acc, i) => acc + i.stockActual * i.precioUnitario, 0)

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Inventario" subtitulo={`${insumos.length} insumos registrados`} />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-red-500 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <AlertTriangle size={18} className="text-white" />
              <span className="text-2xl font-bold text-white">{criticos}</span>
            </div>
            <p className="text-xs text-white/80 font-medium">Stock crítico</p>
          </div>
          <div className="bg-rojo-500 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <TrendingDown size={18} className="text-white" />
              <span className="text-2xl font-bold text-white">{bajos}</span>
            </div>
            <p className="text-xs text-white/80 font-medium">Stock bajo</p>
          </div>
          <div className="bg-gold-500 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <Package size={18} className="text-gray-900" />
              <span className="text-2xl font-bold text-gray-900">{insumos.length}</span>
            </div>
            <p className="text-xs text-gray-900/70 font-medium">Total insumos</p>
          </div>
          <div className="bg-gray-600 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/70">S/</span>
              <span className="text-xl font-bold text-white">{valorTotal.toFixed(0)}</span>
            </div>
            <p className="text-xs text-white/80 font-medium">Valor en stock</p>
          </div>
        </div>

        {/* Tabs + nuevo */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {(['stock', 'movimientos'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t === 'stock' ? 'Stock actual' : 'Movimientos'}
              </button>
            ))}
          </div>
          <button onClick={() => setModalInsumo({ abierto: true })}
            className="flex items-center gap-2 px-4 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700">
            <Plus size={15} /> Nuevo insumo
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {cargando && <div className="flex justify-center py-10 text-gray-300"><Loader2 className="animate-spin" /></div>}

        {!cargando && tab === 'stock' && (
          <>
            {/* Filtros */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar insumo..."
                  className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold-500 bg-white" />
              </div>
              <button onClick={() => setSoloAlertas(!soloAlertas)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  soloAlertas ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-600 hover:border-red-200'
                }`}>
                <Filter size={14} /> Solo alertas
              </button>
            </div>

            {/* Categorías */}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setCategoriaFiltro('todos')}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  categoriaFiltro === 'todos' ? 'bg-gold-600 text-white border-gold-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gold-300'
                }`}>
                Todos ({insumos.length})
              </button>
              {CATEGORIAS_INSUMO.map((cat) => (
                <button key={cat.valor} onClick={() => setCategoriaFiltro(cat.valor)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    categoriaFiltro === cat.valor ? 'bg-gold-600 text-white border-gold-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gold-300'
                  }`}>
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>

            {/* Tabla de stock */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Insumo</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stock</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Nivel</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Costo unit.</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {insumosFiltrados.map((insumo) => {
                    const nivel = nivelStock(insumo)
                    const cfg = NIVEL_CONFIG[nivel]
                    const pct = insumo.stockMaximo > 0 ? Math.min(100, (insumo.stockActual / insumo.stockMaximo) * 100) : 0
                    return (
                      <tr key={insumo.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {(nivel === 'critico' || nivel === 'bajo') && (
                              <AlertTriangle size={13} className={nivel === 'critico' ? 'text-red-500' : 'text-rojo-500'} />
                            )}
                            <div>
                              <p className="font-medium text-gray-800">{insumo.nombre}</p>
                              {insumo.proveedor && <p className="text-xs text-gray-400">{insumo.proveedor}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-gray-800">{insumo.stockActual}</span>
                          <span className="text-xs text-gray-400 ml-1">{insumo.unidad}</span>
                          {insumo.stockMaximo > 0 && (
                            <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                            </div>
                          )}
                          <p className="text-xs text-gray-400">mín: {insumo.stockMinimo}</p>
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          <span className="text-gray-600">S/ {insumo.precioUnitario.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setInsumoMov(insumo)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-gold-50 text-gold-700 border border-gold-200 rounded-lg text-xs font-medium hover:bg-gold-100 transition-colors">
                              <Plus size={11} /> Mov.
                            </button>
                            <button onClick={() => setModalInsumo({ abierto: true, insumo })} title="Editar"
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><Edit2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {insumosFiltrados.length === 0 && (
                <div className="text-center py-10 text-gray-300">
                  <Package size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">{insumos.length === 0 ? 'Todavía no hay insumos: crea el primero con “Nuevo insumo”' : 'Sin insumos con estos filtros'}</p>
                </div>
              )}
            </div>
          </>
        )}

        {!cargando && tab === 'movimientos' && (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {movimientos.length === 0 ? (
              <div className="text-center py-12 text-gray-300">
                <ArrowUp size={36} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Sin movimientos registrados</p>
              </div>
            ) : (
              movimientos.map((mov) => {
                const cfg = MOVIMIENTO_CONFIG[mov.tipo] ?? MOVIMIENTO_CONFIG.ajuste
                const Icon = cfg.icon
                return (
                  <div key={mov.id} className="flex items-center gap-4 px-5 py-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.chipBg}`}>
                      <Icon size={14} className={cfg.chipText} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{mov.insumo.nombre}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {mov.motivo || cfg.label}{mov.usuario ? ` · ${mov.usuario}` : ''}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${cfg.color}`}>{cfg.signo}{mov.cantidad} {mov.insumo.unidad}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(mov.realizadoEn).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {mov.stockResultante != null && ` · queda ${mov.stockResultante}`}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {insumoMov && (
        <ModalMovimiento insumo={insumoMov} onGuardado={cargar} onCerrar={() => setInsumoMov(null)} />
      )}
      {modalInsumo.abierto && (
        <ModalInsumo insumo={modalInsumo.insumo} onGuardado={cargar} onCerrar={() => setModalInsumo({ abierto: false })} />
      )}
    </div>
  )
}
