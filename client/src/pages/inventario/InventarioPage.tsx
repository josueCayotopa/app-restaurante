import { useState } from 'react'
import Header from '../../components/layout/Header'
import {
  Package, AlertTriangle, TrendingDown, Plus, Edit2, X, Check,
  ArrowUp, ArrowDown, Search, Filter,
} from 'lucide-react'

type UnidadMedida = 'kg' | 'g' | 'l' | 'ml' | 'unidad' | 'caja' | 'bolsa'
type CategoriaInsumo = 'carnes' | 'pescados' | 'verduras' | 'lacteos' | 'bebidas' | 'abarrotes' | 'descartables'

interface Insumo {
  id: string
  nombre: string
  categoria: CategoriaInsumo
  unidad: UnidadMedida
  stockActual: number
  stockMinimo: number
  stockMaximo: number
  costoUnitario: number
  proveedor?: string
}

type TipoMovimiento = 'entrada' | 'salida' | 'merma' | 'ajuste'

interface Movimiento {
  id: string
  insumoId: string
  insumoNombre: string
  tipo: TipoMovimiento
  cantidad: number
  motivo: string
  fecha: string
}

const insumosIniciales: Insumo[] = [
  { id: 'i1', nombre: 'Filete de pescado', categoria: 'pescados', unidad: 'kg', stockActual: 12.5, stockMinimo: 5, stockMaximo: 30, costoUnitario: 22, proveedor: 'Pesquera del Norte' },
  { id: 'i2', nombre: 'Camarones frescos', categoria: 'pescados', unidad: 'kg', stockActual: 3.2, stockMinimo: 4, stockMaximo: 15, costoUnitario: 48, proveedor: 'Pesquera del Norte' },
  { id: 'i3', nombre: 'Lomo de res', categoria: 'carnes', unidad: 'kg', stockActual: 8, stockMinimo: 5, stockMaximo: 20, costoUnitario: 35, proveedor: 'Frigorífico San Pedro' },
  { id: 'i4', nombre: 'Pollo entero', categoria: 'carnes', unidad: 'kg', stockActual: 25, stockMinimo: 10, stockMaximo: 50, costoUnitario: 9, proveedor: 'Avícola El Buen Pollo' },
  { id: 'i5', nombre: 'Limón', categoria: 'verduras', unidad: 'kg', stockActual: 8, stockMinimo: 5, stockMaximo: 20, costoUnitario: 3.5 },
  { id: 'i6', nombre: 'Papa blanca', categoria: 'verduras', unidad: 'kg', stockActual: 30, stockMinimo: 10, stockMaximo: 60, costoUnitario: 2 },
  { id: 'i7', nombre: 'Ají amarillo', categoria: 'verduras', unidad: 'kg', stockActual: 2.5, stockMinimo: 2, stockMaximo: 8, costoUnitario: 6 },
  { id: 'i8', nombre: 'Cebolla roja', categoria: 'verduras', unidad: 'kg', stockActual: 12, stockMinimo: 5, stockMaximo: 25, costoUnitario: 2.5 },
  { id: 'i9', nombre: 'Cilantro', categoria: 'verduras', unidad: 'kg', stockActual: 0.8, stockMinimo: 1, stockMaximo: 5, costoUnitario: 4 },
  { id: 'i10', nombre: 'Aceite vegetal', categoria: 'abarrotes', unidad: 'l', stockActual: 15, stockMinimo: 8, stockMaximo: 30, costoUnitario: 6.5 },
  { id: 'i11', nombre: 'Arroz largo', categoria: 'abarrotes', unidad: 'kg', stockActual: 40, stockMinimo: 15, stockMaximo: 80, costoUnitario: 3.2 },
  { id: 'i12', nombre: 'Inca Kola 1.5L', categoria: 'bebidas', unidad: 'unidad', stockActual: 24, stockMinimo: 12, stockMaximo: 60, costoUnitario: 4.5, proveedor: 'Coca-Cola FEMSA' },
  { id: 'i13', nombre: 'Agua San Luis 625ml', categoria: 'bebidas', unidad: 'caja', stockActual: 5, stockMinimo: 3, stockMaximo: 15, costoUnitario: 28, proveedor: 'Backus' },
  { id: 'i14', nombre: 'Cerveza Pilsen 620ml', categoria: 'bebidas', unidad: 'caja', stockActual: 2, stockMinimo: 3, stockMaximo: 12, costoUnitario: 72, proveedor: 'Backus' },
  { id: 'i15', nombre: 'Vasos descartables 10oz', categoria: 'descartables', unidad: 'bolsa', stockActual: 8, stockMinimo: 5, stockMaximo: 20, costoUnitario: 5 },
]

const movimientosIniciales: Movimiento[] = [
  { id: 'm1', insumoId: 'i1', insumoNombre: 'Filete de pescado', tipo: 'entrada', cantidad: 5, motivo: 'Compra proveedor', fecha: new Date().toISOString() },
  { id: 'm2', insumoId: 'i3', insumoNombre: 'Lomo de res', tipo: 'salida', cantidad: 2, motivo: 'Consumo cocina', fecha: new Date(Date.now() - 3600000).toISOString() },
  { id: 'm3', insumoId: 'i9', insumoNombre: 'Cilantro', tipo: 'merma', cantidad: 0.2, motivo: 'Deterioro', fecha: new Date(Date.now() - 7200000).toISOString() },
]

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
  entrada: { label: 'Entrada', color: 'text-gold-700',  bg: 'bg-gold-50',  chipBg: 'bg-gold-500', chipText: 'text-gray-900', icon: ArrowUp,     signo: '+' },
  salida:  { label: 'Salida',  color: 'text-gray-700',  bg: 'bg-gray-100', chipBg: 'bg-gray-500', chipText: 'text-white',    icon: ArrowDown,   signo: '-' },
  merma:   { label: 'Merma',   color: 'text-red-600',   bg: 'bg-red-50',   chipBg: 'bg-red-500',  chipText: 'text-white',    icon: TrendingDown, signo: '-' },
  ajuste:  { label: 'Ajuste',  color: 'text-rojo-600',  bg: 'bg-rojo-50',  chipBg: 'bg-rojo-500', chipText: 'text-white',    icon: Edit2,       signo: '±' },
}

function nivelStock(insumo: Insumo): 'critico' | 'bajo' | 'normal' | 'alto' {
  const pct = insumo.stockActual / insumo.stockMaximo
  if (insumo.stockActual <= insumo.stockMinimo * 0.5) return 'critico'
  if (insumo.stockActual <= insumo.stockMinimo) return 'bajo'
  if (pct > 0.9) return 'alto'
  return 'normal'
}

// `bg`/`color` con fondo SÓLIDO — insignia de nivel de stock en la tabla.
const NIVEL_CONFIG = {
  critico: { label: 'Crítico', color: 'text-white',    bg: 'bg-red-500',   bar: 'bg-red-500'  },
  bajo:    { label: 'Bajo',    color: 'text-white',    bg: 'bg-rojo-500',  bar: 'bg-rojo-500'  },
  normal:  { label: 'Normal',  color: 'text-gray-900', bg: 'bg-gold-500',  bar: 'bg-gold-500'  },
  alto:    { label: 'Alto',    color: 'text-white',    bg: 'bg-gray-500',  bar: 'bg-gray-400'  },
}

function ModalMovimiento({ insumo, onGuardar, onCerrar }: {
  insumo: Insumo
  onGuardar: (tipo: TipoMovimiento, cantidad: number, motivo: string) => void
  onCerrar: () => void
}) {
  const [tipo, setTipo] = useState<TipoMovimiento>('entrada')
  const [cantidad, setCantidad] = useState(0)
  const [motivo, setMotivo] = useState('')

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800 text-sm">Registrar movimiento</h2>
            <p className="text-xs text-gray-400">{insumo.nombre}</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">Tipo de movimiento</label>
            <div className="grid grid-cols-2 gap-2">
              {(['entrada', 'salida', 'merma', 'ajuste'] as TipoMovimiento[]).map((t) => {
                const cfg = MOVIMIENTO_CONFIG[t]
                const Icon = cfg.icon
                return (
                  <button key={t} onClick={() => setTipo(t)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      tipo === t ? `border-current ${cfg.bg} ${cfg.color}` : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}>
                    <Icon size={13} /> {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Cantidad ({insumo.unidad}) — Stock actual: {insumo.stockActual}
            </label>
            <input type="number" min={0.1} step={0.1} value={cantidad || ''}
              onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
              placeholder="0.0" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Motivo</label>
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
              placeholder="Descripción del movimiento" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onCerrar} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={() => { if (cantidad > 0) { onGuardar(tipo, cantidad, motivo); onCerrar() } }}
              disabled={cantidad <= 0}
              className="flex-1 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 disabled:opacity-40 flex items-center justify-center gap-2">
              <Check size={14} /> Registrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InventarioPage() {
  const [insumos, setInsumos] = useState<Insumo[]>(insumosIniciales)
  const [movimientos, setMovimientos] = useState<Movimiento[]>(movimientosIniciales)
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaInsumo | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [tab, setTab] = useState<'stock' | 'movimientos'>('stock')
  const [insumoSeleccionado, setInsumoSeleccionado] = useState<Insumo | null>(null)
  const [soloAlertas, setSoloAlertas] = useState(false)

  const insumosFiltrados = insumos.filter((i) => {
    const matchCat = categoriaFiltro === 'todos' || i.categoria === categoriaFiltro
    const matchBusq = i.nombre.toLowerCase().includes(busqueda.toLowerCase())
    const matchAlerta = !soloAlertas || nivelStock(i) === 'critico' || nivelStock(i) === 'bajo'
    return matchCat && matchBusq && matchAlerta
  })

  const criticos = insumos.filter((i) => nivelStock(i) === 'critico').length
  const bajos = insumos.filter((i) => nivelStock(i) === 'bajo').length
  const valorTotal = insumos.reduce((acc, i) => acc + i.stockActual * i.costoUnitario, 0)

  const registrarMovimiento = (insumo: Insumo, tipo: TipoMovimiento, cantidad: number, motivo: string) => {
    const nuevoStock = tipo === 'entrada'
      ? insumo.stockActual + cantidad
      : Math.max(0, insumo.stockActual - cantidad)

    setInsumos((prev) => prev.map((i) =>
      i.id === insumo.id ? { ...i, stockActual: parseFloat(nuevoStock.toFixed(3)) } : i
    ))
    setMovimientos((prev) => [{
      id: `m${Date.now()}`,
      insumoId: insumo.id,
      insumoNombre: insumo.nombre,
      tipo, cantidad, motivo,
      fecha: new Date().toISOString(),
    }, ...prev])
  }

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Inventario" subtitulo={`${insumos.length} insumos registrados`} />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center justify-between mb-1">
              <AlertTriangle size={18} className="text-red-500" />
              <span className="text-2xl font-bold text-red-600">{criticos}</span>
            </div>
            <p className="text-xs text-red-500 font-medium">Stock crítico</p>
          </div>
          <div className="bg-white rounded-xl border border-rojo-200 bg-rojo-50 p-4">
            <div className="flex items-center justify-between mb-1">
              <TrendingDown size={18} className="text-rojo-500" />
              <span className="text-2xl font-bold text-rojo-600">{bajos}</span>
            </div>
            <p className="text-xs text-rojo-600 font-medium">Stock bajo</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-1">
              <Package size={18} className="text-gold-600" />
              <span className="text-2xl font-bold text-gold-700">{insumos.length}</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">Total insumos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">S/</span>
              <span className="text-xl font-bold text-gray-700">{valorTotal.toFixed(0)}</span>
            </div>
            <p className="text-xs text-gray-500 font-medium">Valor en stock</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {(['stock', 'movimientos'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {t === 'stock' ? 'Stock actual' : 'Movimientos'}
            </button>
          ))}
        </div>

        {tab === 'stock' && (
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
                    const pct = Math.min(100, (insumo.stockActual / insumo.stockMaximo) * 100)
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
                          <div className="mt-1 w-full bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-gray-400">mín: {insumo.stockMinimo}</p>
                        </td>
                        <td className="px-4 py-3 text-center hidden md:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          <span className="text-gray-600">S/ {insumo.costoUnitario.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => setInsumoSeleccionado(insumo)}
                            className="flex items-center gap-1 mx-auto px-2.5 py-1.5 bg-gold-50 text-gold-700 border border-gold-200 rounded-lg text-xs font-medium hover:bg-gold-100 transition-colors">
                            <Plus size={11} /> Mov.
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {insumosFiltrados.length === 0 && (
                <div className="text-center py-10 text-gray-300">
                  <Package size={36} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Sin insumos</p>
                </div>
              )}
            </div>
          </>
        )}

        {tab === 'movimientos' && (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
            {movimientos.length === 0 ? (
              <div className="text-center py-12 text-gray-300">
                <ArrowUp size={36} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Sin movimientos registrados</p>
              </div>
            ) : (
              movimientos.map((mov) => {
                const cfg = MOVIMIENTO_CONFIG[mov.tipo]
                const Icon = cfg.icon
                return (
                  <div key={mov.id} className="flex items-center gap-4 px-5 py-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cfg.chipBg}`}>
                      <Icon size={14} className={cfg.chipText} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{mov.insumoNombre}</p>
                      <p className="text-xs text-gray-400">{mov.motivo || cfg.label}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${cfg.color}`}>
                        {cfg.signo}{mov.cantidad}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(mov.fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {insumoSeleccionado && (
        <ModalMovimiento
          insumo={insumoSeleccionado}
          onGuardar={(tipo, cantidad, motivo) => registrarMovimiento(insumoSeleccionado, tipo, cantidad, motivo)}
          onCerrar={() => setInsumoSeleccionado(null)}
        />
      )}
    </div>
  )
}
