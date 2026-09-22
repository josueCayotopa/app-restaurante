import { useState } from 'react'
import Header from '../../components/layout/Header'
import {
  useProveedoresStore,
  type Proveedor,
  type OrdenCompra,
  type ItemOrden,
  type EstadoOrden,
  type CategoriaProveedor,
} from '../../store/proveedoresStore'
import {
  Building2, Phone, Mail, Star, Plus, Edit2, X, Check,
  ShoppingCart, Package, ChevronDown, ChevronUp,
  Truck, FileText, ToggleRight, ToggleLeft, Search,
} from 'lucide-react'

// ─── Configuraciones ────────────────────────────────────────────────────────

const CATEGORIAS_PROV: { valor: CategoriaProveedor; label: string; emoji: string }[] = [
  { valor: 'carnes', label: 'Carnes', emoji: '🥩' },
  { valor: 'pescados', label: 'Pescados', emoji: '🐟' },
  { valor: 'verduras', label: 'Verduras', emoji: '🥦' },
  { valor: 'bebidas', label: 'Bebidas', emoji: '🥤' },
  { valor: 'abarrotes', label: 'Abarrotes', emoji: '🛒' },
  { valor: 'descartables', label: 'Descartables', emoji: '📦' },
  { valor: 'general', label: 'General', emoji: '🏪' },
]

// `color`/`bg` (tono suave) para los filtros; `badgeBg`/`badgeText`
// (fondo SÓLIDO) para la insignia en cada tarjeta de orden.
const ESTADO_ORDEN: Record<EstadoOrden, { label: string; color: string; bg: string; badgeBg: string; badgeText: string }> = {
  borrador:  { label: 'Borrador',  color: 'text-gray-500', bg: 'bg-gray-100', badgeBg: 'bg-gray-500', badgeText: 'text-white' },
  enviada:   { label: 'Enviada',   color: 'text-rojo-700', bg: 'bg-rojo-100', badgeBg: 'bg-rojo-500', badgeText: 'text-white' },
  aprobada:  { label: 'Aprobada',  color: 'text-gold-700', bg: 'bg-gold-100', badgeBg: 'bg-gold-500', badgeText: 'text-gray-900' },
  recibida:  { label: 'Recibida',  color: 'text-gray-700', bg: 'bg-gray-100', badgeBg: 'bg-gray-600', badgeText: 'text-white' },
  cancelada: { label: 'Cancelada', color: 'text-red-600',  bg: 'bg-red-50',   badgeBg: 'bg-red-500',  badgeText: 'text-white' },
}

const FLUJO_ORDEN: Partial<Record<EstadoOrden, EstadoOrden>> = {
  borrador: 'enviada',
  enviada:  'aprobada',
  aprobada: 'recibida',
}

function Estrellas({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={12} className={i <= n ? 'text-gold-500 fill-gold-500' : 'text-gray-200 fill-gray-200'} />
      ))}
    </div>
  )
}

// ─── Modal Proveedor ─────────────────────────────────────────────────────────

function ModalProveedor({ proveedor, onGuardar, onCerrar }: {
  proveedor?: Proveedor; onGuardar: (p: Omit<Proveedor, 'id'>) => void; onCerrar: () => void
}) {
  const [form, setForm] = useState({
    nombre: proveedor?.nombre ?? '',
    ruc: proveedor?.ruc ?? '',
    contacto: proveedor?.contacto ?? '',
    telefono: proveedor?.telefono ?? '',
    email: proveedor?.email ?? '',
    categoria: proveedor?.categoria ?? ('general' as CategoriaProveedor),
    direccion: proveedor?.direccion ?? '',
    calificacion: proveedor?.calificacion ?? 3,
    activo: proveedor?.activo ?? true,
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">{proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>
        <form className="overflow-y-auto flex-1 p-6 space-y-4"
          onSubmit={(e) => { e.preventDefault(); onGuardar(form as Omit<Proveedor,'id'>) }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Razón social *</label>
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">RUC *</label>
              <input required value={form.ruc} maxLength={11} onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaProveedor })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500">
                {CATEGORIAS_PROV.map((c) => <option key={c.valor} value={c.valor}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contacto</label>
              <input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Dirección</label>
              <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Calificación</label>
              <div className="flex gap-1 pt-1">
                {[1,2,3,4,5].map((n) => (
                  <button key={n} type="button" onClick={() => setForm({ ...form, calificacion: n as Proveedor['calificacion'] })}>
                    <Star size={20} className={n <= form.calificacion ? 'text-gold-500 fill-gold-500' : 'text-gray-200 fill-gray-200'} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCerrar}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit"
              className="flex-1 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 flex items-center justify-center gap-2">
              <Check size={15} /> Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal Nueva Orden ────────────────────────────────────────────────────────

function ModalNuevaOrden({ onGuardar, onCerrar, proveedores }: {
  onGuardar: (o: OrdenCompra) => void; onCerrar: () => void; proveedores: Proveedor[]
}) {
  const [proveedorId, setProveedorId] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState<ItemOrden[]>([{ id: 'new0', insumoNombre: '', unidad: 'kg', cantidad: 1, precioUnitario: 0, subtotal: 0 }])

  const proveedor = proveedores.find((p) => p.id === proveedorId)
  const total = items.reduce((acc, i) => acc + i.subtotal, 0)

  const updateItem = (idx: number, campo: Partial<ItemOrden>) => {
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, ...campo }
      updated.subtotal = updated.cantidad * updated.precioUnitario
      return updated
    }))
  }

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!proveedor || items.some((i) => !i.insumoNombre)) return
    onGuardar({
      id: `oc${Date.now()}`, proveedorId, proveedorNombre: proveedor.nombre,
      estado: 'borrador', items, total, creadoPor: 'Admin',
      fechaCreacion: new Date().toISOString(),
      fechaEntrega: fechaEntrega || undefined,
      notas: notas || undefined,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Nueva Orden de Compra</h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>
        <form className="overflow-y-auto flex-1 p-6 space-y-5" onSubmit={handleGuardar}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Proveedor *</label>
              <select required value={proveedorId} onChange={(e) => setProveedorId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500">
                <option value="">Seleccionar proveedor...</option>
                {proveedores.filter((p) => p.activo).map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de entrega</label>
              <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
              <input value={notas} onChange={(e) => setNotas(e.target.value)}
                placeholder="Instrucciones de entrega..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">Productos a pedir</label>
              <button type="button" onClick={() => setItems((p) => [...p, { id: `new${p.length}`, insumoNombre: '', unidad: 'kg', cantidad: 1, precioUnitario: 0, subtotal: 0 }])}
                className="flex items-center gap-1 text-xs text-gold-600 hover:text-gold-700 font-medium">
                <Plus size={13} /> Agregar ítem
              </button>
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-xs text-gray-500">Insumo</th>
                  <th className="text-center px-2 py-2 text-xs text-gray-500">Unidad</th>
                  <th className="text-center px-2 py-2 text-xs text-gray-500">Cant.</th>
                  <th className="text-center px-2 py-2 text-xs text-gray-500">P. Unit.</th>
                  <th className="text-right px-3 py-2 text-xs text-gray-500">Subtotal</th>
                  <th className="px-2"></th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="px-2 py-1.5">
                        <input required value={item.insumoNombre} onChange={(e) => updateItem(idx, { insumoNombre: e.target.value })}
                          placeholder="Nombre del insumo"
                          className="w-full text-sm border-none outline-none bg-transparent" />
                      </td>
                      <td className="px-2 py-1.5">
                        <select value={item.unidad} onChange={(e) => updateItem(idx, { unidad: e.target.value })}
                          className="text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none">
                          {['kg','g','l','ml','unidad','caja','bolsa','saco'].map((u) => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min={0.1} step={0.1} value={item.cantidad}
                          onChange={(e) => updateItem(idx, { cantidad: parseFloat(e.target.value)||0 })}
                          className="w-16 text-center text-sm border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-gold-500" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min={0} step={0.1} value={item.precioUnitario}
                          onChange={(e) => updateItem(idx, { precioUnitario: parseFloat(e.target.value)||0 })}
                          className="w-20 text-center text-sm border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:border-gold-500" />
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-gold-700 text-sm">
                        S/ {item.subtotal.toFixed(2)}
                      </td>
                      <td className="px-2">
                        {items.length > 1 && (
                          <button type="button" onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-600"><X size={13} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="bg-gray-50 border-t border-gray-100">
                  <td colSpan={4} className="px-3 py-2 text-right text-sm font-semibold text-gray-600">TOTAL</td>
                  <td className="px-3 py-2 text-right text-sm font-bold text-gold-700">S/ {total.toFixed(2)}</td>
                  <td></td>
                </tr></tfoot>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onCerrar}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit"
              className="flex-1 py-2.5 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 flex items-center justify-center gap-2">
              <FileText size={15} /> Crear orden
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Tarjeta Orden ────────────────────────────────────────────────────────────

function TarjetaOrden({ orden }: { orden: OrdenCompra }) {
  const cambiarEstadoOrden = useProveedoresStore((s) => s.cambiarEstadoOrden)
  const [expandido, setExpandido] = useState(false)
  const cfg = ESTADO_ORDEN[orden.estado]
  const siguiente = FLUJO_ORDEN[orden.estado]

  const diasParaEntrega = orden.fechaEntrega
    ? Math.ceil((new Date(orden.fechaEntrega).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-mono text-gray-400">{orden.id.toUpperCase()}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}>{cfg.label}</span>
            </div>
            <h3 className="font-bold text-gray-800 text-sm">{orden.proveedorNombre}</h3>
            <p className="text-xs text-gray-400">{orden.creadoPor} · {new Date(orden.fechaCreacion).toLocaleDateString('es-PE')}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gold-700">S/ {orden.total.toFixed(2)}</p>
            <p className="text-xs text-gray-400">{orden.items.length} items</p>
          </div>
        </div>

        {orden.fechaEntrega && (
          <div className={`flex items-center gap-1 text-xs mb-2 font-medium ${
            diasParaEntrega !== null && diasParaEntrega < 0 ? 'text-red-500' :
            diasParaEntrega !== null && diasParaEntrega === 0 ? 'text-rojo-600' : 'text-gray-500'
          }`}>
            <Truck size={12} />
            Entrega: {new Date(orden.fechaEntrega).toLocaleDateString('es-PE')}
            {diasParaEntrega !== null && (
              <span>({diasParaEntrega < 0 ? 'vencida' : diasParaEntrega === 0 ? 'hoy' : `en ${diasParaEntrega}d`})</span>
            )}
          </div>
        )}
        {orden.notas && <p className="text-xs text-rojo-600 bg-rojo-50 border border-rojo-100 rounded px-2 py-1 mb-2">📝 {orden.notas}</p>}

        <div className="flex gap-2">
          <button onClick={() => setExpandido(!expandido)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
            {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Ver items
          </button>
          {siguiente && (
            <button onClick={() => cambiarEstadoOrden(orden.id, siguiente)}
              className="ml-auto flex items-center gap-1 px-3 py-1 bg-gold-600 text-white rounded-lg text-xs font-semibold hover:bg-gold-700 transition-colors">
              <Check size={12} />
              {siguiente === 'enviada' ? 'Enviar' : siguiente === 'aprobada' ? 'Aprobar' : 'Marcar recibida'}
            </button>
          )}
          {orden.estado !== 'cancelada' && orden.estado !== 'recibida' && (
            <button onClick={() => cambiarEstadoOrden(orden.id, 'cancelada')}
              className="px-3 py-1 bg-red-50 text-red-500 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100">
              Cancelar
            </button>
          )}
        </div>
      </div>

      {expandido && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-400">
              <th className="text-left pb-1">Insumo</th>
              <th className="text-center pb-1">Cant.</th>
              <th className="text-center pb-1">P.Unit.</th>
              <th className="text-right pb-1">Subtotal</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {orden.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-1 text-gray-700">{item.insumoNombre} <span className="text-gray-400 text-xs">({item.unidad})</span></td>
                  <td className="py-1 text-center text-gray-600">{item.cantidad}</td>
                  <td className="py-1 text-center text-gray-600">S/ {item.precioUnitario.toFixed(2)}</td>
                  <td className="py-1 text-right font-semibold text-gold-700">S/ {item.subtotal.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ProveedoresPage() {
  const { proveedores, ordenes, agregarProveedor, actualizarProveedor, toggleActivo, agregarOrden } = useProveedoresStore()
  const [tab, setTab] = useState<'proveedores' | 'ordenes'>('proveedores')
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaProveedor | 'todos'>('todos')
  const [estadoFiltroOrden, setEstadoFiltroOrden] = useState<EstadoOrden | 'todas'>('todas')
  const [modalProv, setModalProv] = useState<{ abierto: boolean; proveedor?: Proveedor }>({ abierto: false })
  const [modalOrden, setModalOrden] = useState(false)

  const provFiltrados = proveedores.filter((p) => {
    const matchBusq = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.ruc.includes(busqueda)
    const matchCat = categoriaFiltro === 'todos' || p.categoria === categoriaFiltro
    return matchBusq && matchCat
  })

  const ordenesFiltradas = estadoFiltroOrden === 'todas' ? ordenes : ordenes.filter((o) => o.estado === estadoFiltroOrden)

  const totalOrdenes = ordenes.filter((o) => o.estado === 'recibida').reduce((acc, o) => acc + o.total, 0)
  const pendientesEntrega = ordenes.filter((o) => o.estado === 'aprobada').length

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Proveedores y Compras" subtitulo={`${proveedores.filter((p) => p.activo).length} proveedores activos`} />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold text-gold-600">{proveedores.filter((p) => p.activo).length}</p>
            <p className="text-xs text-gray-400">Proveedores activos</p>
          </div>
          <div className="bg-white rounded-xl border border-rojo-200 bg-rojo-50 p-4">
            <p className="text-2xl font-bold text-rojo-600">{pendientesEntrega}</p>
            <p className="text-xs text-rojo-600">Órdenes por recibir</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-2xl font-bold text-gray-700">{ordenes.filter((o) => o.estado !== 'cancelada').length}</p>
            <p className="text-xs text-gray-400">Órdenes totales</p>
          </div>
          <div className="bg-white rounded-xl border border-gold-200 bg-gold-50 p-4">
            <p className="text-xl font-bold text-gold-600">S/ {totalOrdenes.toFixed(0)}</p>
            <p className="text-xs text-gold-600">Compras recibidas</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(['proveedores', 'ordenes'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                  tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t === 'proveedores' ? `Proveedores (${proveedores.length})` : `Órdenes (${ordenes.length})`}
              </button>
            ))}
          </div>
          <button
            onClick={() => tab === 'proveedores' ? setModalProv({ abierto: true }) : setModalOrden(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-colors">
            <Plus size={15} />
            {tab === 'proveedores' ? 'Nuevo proveedor' : 'Nueva orden'}
          </button>
        </div>

        {/* ── Tab Proveedores ── */}
        {tab === 'proveedores' && (
          <>
            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Nombre o RUC..."
                  className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold-500 bg-white" />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setCategoriaFiltro('todos')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${categoriaFiltro === 'todos' ? 'bg-gold-600 text-white border-gold-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  Todos
                </button>
                {CATEGORIAS_PROV.map((c) => (
                  <button key={c.valor} onClick={() => setCategoriaFiltro(c.valor)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${categoriaFiltro === c.valor ? 'bg-gold-600 text-white border-gold-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {provFiltrados.map((prov) => {
                const cat = CATEGORIAS_PROV.find((c) => c.valor === prov.categoria)
                return (
                  <div key={prov.id} className={`bg-white rounded-xl border border-gray-200 p-4 ${!prov.activo ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gold-50 border border-gold-200 rounded-xl flex items-center justify-center text-xl">
                          {cat?.emoji}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm">{prov.nombre}</h3>
                          <p className="text-xs text-gray-400">RUC {prov.ruc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleActivo(prov.id)} className={`${prov.activo ? 'text-gold-500' : 'text-gray-400'}`}>
                          {prov.activo ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                        <button onClick={() => setModalProv({ abierto: true, proveedor: prov })}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      {prov.contacto && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Building2 size={12} className="text-gray-400 shrink-0" />
                          {prov.contacto}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Phone size={12} className="text-gray-400 shrink-0" />
                        {prov.telefono}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Mail size={12} className="text-gray-400 shrink-0" />
                        {prov.email}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Estrellas n={prov.calificacion} />
                      <button
                        onClick={() => { setModalOrden(true); setTab('ordenes') }}
                        className="flex items-center gap-1 text-xs text-gold-600 hover:text-gold-700 font-medium">
                        <ShoppingCart size={12} /> Nueva orden
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── Tab Órdenes ── */}
        {tab === 'ordenes' && (
          <>
            <div className="flex gap-2 flex-wrap">
              {(['todas', 'borrador', 'enviada', 'aprobada', 'recibida', 'cancelada'] as const).map((estado) => {
                const count = estado === 'todas' ? ordenes.length : ordenes.filter((o) => o.estado === estado).length
                const cfg = estado !== 'todas' ? ESTADO_ORDEN[estado] : null
                return (
                  <button key={estado} onClick={() => setEstadoFiltroOrden(estado)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      estadoFiltroOrden === estado ? 'bg-gold-600 text-white border-gold-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gold-300'
                    }`}>
                    {cfg ? cfg.label : 'Todas'} ({count})
                  </button>
                )
              })}
            </div>

            <div className="space-y-3">
              {ordenesFiltradas.length === 0 ? (
                <div className="text-center py-12 text-gray-300 bg-white rounded-xl border border-gray-100">
                  <Package size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Sin órdenes</p>
                </div>
              ) : (
                ordenesFiltradas.map((o) => <TarjetaOrden key={o.id} orden={o} />)
              )}
            </div>
          </>
        )}
      </div>

      {modalProv.abierto && (
        <ModalProveedor
          proveedor={modalProv.proveedor}
          onGuardar={(datos) => {
            if (modalProv.proveedor) actualizarProveedor(modalProv.proveedor.id, datos)
            else agregarProveedor({ ...datos, id: `pv${Date.now()}` })
            setModalProv({ abierto: false })
          }}
          onCerrar={() => setModalProv({ abierto: false })}
        />
      )}
      {modalOrden && (
        <ModalNuevaOrden
          proveedores={proveedores}
          onGuardar={(o) => { agregarOrden(o); setModalOrden(false) }}
          onCerrar={() => setModalOrden(false)}
        />
      )}
    </div>
  )
}
