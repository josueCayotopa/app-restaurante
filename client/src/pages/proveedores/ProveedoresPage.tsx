import { useEffect, useState } from 'react'
import Header from '../../components/layout/Header'
import {
  useProveedoresStore,
  type Proveedor,
  type OrdenCompra,
  type EstadoOrden,
  type CategoriaProveedor,
  type DatosOrden,
} from '../../store/proveedoresStore'
import { apiFetch, ApiError } from '../../lib/api'
import {
  Building2, Phone, Mail, Star, Plus, Edit2, X, Check,
  ShoppingCart, Package, ChevronDown, ChevronUp,
  Truck, FileText, ToggleRight, ToggleLeft, Search, Loader2, Link2,
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

// `badgeBg`/`badgeText` (fondo SÓLIDO) para la insignia en cada tarjeta de orden
const ESTADO_ORDEN: Record<EstadoOrden, { label: string; badgeBg: string; badgeText: string }> = {
  borrador:  { label: 'Borrador',  badgeBg: 'bg-gray-500', badgeText: 'text-white' },
  enviada:   { label: 'Enviada',   badgeBg: 'bg-rojo-500', badgeText: 'text-white' },
  aprobada:  { label: 'Aprobada',  badgeBg: 'bg-gold-500', badgeText: 'text-gray-900' },
  recibida:  { label: 'Recibida',  badgeBg: 'bg-gray-600', badgeText: 'text-white' },
  cancelada: { label: 'Cancelada', badgeBg: 'bg-red-500',  badgeText: 'text-white' },
}

const FLUJO_ORDEN: Partial<Record<EstadoOrden, EstadoOrden>> = {
  borrador: 'enviada',
  enviada:  'aprobada',
  aprobada: 'recibida',
}

const UNIDADES = ['kg', 'g', 'l', 'ml', 'unidad', 'caja', 'bolsa', 'saco']
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500'
const errorDe = (e: unknown) => (e instanceof ApiError ? e.message : 'No se pudo guardar: revisa la conexión')
const numeroOrden = (n: number) => `OC-${String(n).padStart(4, '0')}`

interface InsumoLite { id: string; nombre: string; unidad: string; precioUnitario: number }

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

function ModalProveedor({ proveedor, onCerrar }: { proveedor?: Proveedor; onCerrar: () => void }) {
  const { agregarProveedor, actualizarProveedor } = useProveedoresStore()
  const [form, setForm] = useState({
    nombre: proveedor?.nombre ?? '',
    ruc: proveedor?.ruc ?? '',
    contacto: proveedor?.contacto ?? '',
    telefono: proveedor?.telefono ?? '',
    email: proveedor?.email ?? '',
    categoria: proveedor?.categoria ?? ('general' as CategoriaProveedor),
    direccion: proveedor?.direccion ?? '',
    calificacion: proveedor?.calificacion ?? 3,
  })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true); setError('')
    try {
      if (proveedor) await actualizarProveedor(proveedor.id, form)
      else await agregarProveedor(form)
      onCerrar()
    } catch (err) { setError(errorDe(err)); setEnviando(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">{proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>
        <form className="overflow-y-auto flex-1 p-6 space-y-4" onSubmit={guardar}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Razón social / nombre *</label>
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">RUC (11 dígitos)</label>
              <input value={form.ruc} maxLength={11} inputMode="numeric" pattern="\d{11}"
                onChange={(e) => setForm({ ...form, ruc: e.target.value.replace(/\D/g, '') })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaProveedor })} className={inputCls}>
                {CATEGORIAS_PROV.map((c) => <option key={c.valor} value={c.valor}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Contacto</label>
              <input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
              <input value={form.telefono} inputMode="tel" onChange={(e) => setForm({ ...form, telefono: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Dirección</label>
              <input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Calificación</label>
              <div className="flex gap-1 pt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setForm({ ...form, calificacion: n })}>
                    <Star size={22} className={n <= form.calificacion ? 'text-gold-500 fill-gold-500' : 'text-gray-200 fill-gray-200'} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCerrar} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={enviando}
              className="flex-1 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {enviando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal Nueva Orden ────────────────────────────────────────────────────────

type FilaOrden = { clave: number; insumoId: string; nombre: string; unidad: string; cantidad: string; precioUnit: string }
const filaVacia = (clave: number): FilaOrden => ({ clave, insumoId: '', nombre: '', unidad: 'kg', cantidad: '1', precioUnit: '' })

function ModalNuevaOrden({ proveedorInicial, onCerrar }: { proveedorInicial?: string; onCerrar: () => void }) {
  const { proveedores, agregarOrden } = useProveedoresStore()
  const [insumos, setInsumos] = useState<InsumoLite[]>([])
  const [proveedorId, setProveedorId] = useState(proveedorInicial ?? '')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [notas, setNotas] = useState('')
  const [filas, setFilas] = useState<FilaOrden[]>([filaVacia(0)])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { apiFetch<InsumoLite[]>('/api/inventario').then(setInsumos).catch(() => setInsumos([])) }, [])

  const subtotal = (f: FilaOrden) => (parseFloat(f.cantidad) || 0) * (parseFloat(f.precioUnit) || 0)
  const total = filas.reduce((a, f) => a + subtotal(f), 0)

  const actualizar = (idx: number, cambio: Partial<FilaOrden>) =>
    setFilas((prev) => prev.map((f, i) => (i === idx ? { ...f, ...cambio } : f)))

  // Al vincular un insumo se completan nombre, unidad y último costo
  const vincular = (idx: number, insumoId: string) => {
    const ins = insumos.find((i) => i.id === insumoId)
    actualizar(idx, ins
      ? { insumoId, nombre: ins.nombre, unidad: ins.unidad, precioUnit: ins.precioUnitario ? String(ins.precioUnitario) : '' }
      : { insumoId: '' })
  }

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true); setError('')
    const datos: DatosOrden = {
      proveedorId,
      fechaEntrega: fechaEntrega ? new Date(`${fechaEntrega}T12:00:00`).toISOString() : undefined,
      notas,
      items: filas.map((f) => ({
        nombre: f.nombre, unidad: f.unidad, insumoId: f.insumoId || null,
        cantidad: parseFloat(f.cantidad) || 0, precioUnit: parseFloat(f.precioUnit) || 0,
      })),
    }
    try { await agregarOrden(datos); onCerrar() }
    catch (err) { setError(errorDe(err)); setEnviando(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Nueva orden de compra</h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>
        <form className="overflow-y-auto flex-1 p-6 space-y-5" onSubmit={guardar}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Proveedor *</label>
              <select required value={proveedorId} onChange={(e) => setProveedorId(e.target.value)} className={inputCls}>
                <option value="">Seleccionar proveedor...</option>
                {proveedores.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de entrega</label>
              <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Notas</label>
              <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Instrucciones de entrega..." className={inputCls} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">
                Productos a pedir · <Link2 size={11} className="inline" /> vincula un insumo para que, al recibir la orden, suba su stock
              </label>
              <button type="button" onClick={() => setFilas((p) => [...p, filaVacia(Date.now())])}
                className="flex items-center gap-1 text-xs text-gold-600 hover:text-gold-700 font-medium shrink-0">
                <Plus size={13} /> Agregar ítem
              </button>
            </div>
            <div className="space-y-2">
              {filas.map((f, idx) => (
                <div key={f.clave} className="grid grid-cols-12 gap-2 items-center">
                  <select value={f.insumoId} onChange={(e) => vincular(idx, e.target.value)}
                    className="col-span-3 border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:border-gold-500">
                    <option value="">Sin vincular</option>
                    {insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                  </select>
                  <input required value={f.nombre} onChange={(e) => actualizar(idx, { nombre: e.target.value })} placeholder="Producto"
                    className="col-span-3 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-gold-500" />
                  <select value={f.unidad} onChange={(e) => actualizar(idx, { unidad: e.target.value })}
                    className="col-span-1 border border-gray-200 rounded-lg px-1 py-2 text-xs focus:outline-none">
                    {UNIDADES.map((u) => <option key={u}>{u}</option>)}
                  </select>
                  <input required type="number" min={0.001} step={0.001} value={f.cantidad} onChange={(e) => actualizar(idx, { cantidad: e.target.value })}
                    title="Cantidad" className="col-span-1 border border-gray-200 rounded-lg px-1 py-2 text-sm text-center focus:outline-none focus:border-gold-500" />
                  <input required type="number" min={0} step={0.01} value={f.precioUnit} onChange={(e) => actualizar(idx, { precioUnit: e.target.value })}
                    placeholder="P. unit." className="col-span-2 border border-gray-200 rounded-lg px-2 py-2 text-sm text-right focus:outline-none focus:border-gold-500" />
                  <span className="col-span-1 text-right text-sm font-semibold text-gold-700">{subtotal(f).toFixed(2)}</span>
                  <button type="button" onClick={() => setFilas((p) => p.filter((_, i) => i !== idx))} disabled={filas.length === 1}
                    className="col-span-1 justify-self-center text-red-400 hover:text-red-600 disabled:opacity-20"><X size={15} /></button>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3 text-sm font-bold text-gray-800">TOTAL S/ {total.toFixed(2)}</div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onCerrar} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={enviando}
              className="flex-1 py-2.5 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {enviando ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} Crear orden
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
  const [enviando, setEnviando] = useState(false)
  const cfg = ESTADO_ORDEN[orden.estado]
  const siguiente = FLUJO_ORDEN[orden.estado]
  const vinculados = orden.items.filter((i) => i.insumoId).length

  const diasParaEntrega = orden.fechaEntrega
    ? Math.ceil((new Date(orden.fechaEntrega).getTime() - Date.now()) / 86400000)
    : null

  const cambiar = async (estado: EstadoOrden) => {
    if (estado === 'recibida' && vinculados > 0 &&
      !confirm(`Al marcarla recibida se sumará al inventario el stock de ${vinculados} insumo(s) vinculado(s). ¿Continuar?`)) return
    if (estado === 'cancelada' && !confirm(`¿Cancelar la orden ${numeroOrden(orden.numero)}?`)) return
    setEnviando(true)
    try { await cambiarEstadoOrden(orden.id, estado) }
    catch (e) { alert(errorDe(e)) }
    finally { setEnviando(false) }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-mono text-gray-400">{numeroOrden(orden.numero)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}>{cfg.label}</span>
            </div>
            <h3 className="font-bold text-gray-800 text-sm">{orden.proveedor.nombre}</h3>
            <p className="text-xs text-gray-400">{orden.creadoPor ?? '—'} · {new Date(orden.fecha).toLocaleDateString('es-PE')}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gold-700">S/ {orden.total.toFixed(2)}</p>
            <p className="text-xs text-gray-400">{orden.items.length} ítems{vinculados ? ` · ${vinculados} vinculados` : ''}</p>
          </div>
        </div>

        {orden.fechaEntrega && orden.estado !== 'recibida' && orden.estado !== 'cancelada' && (
          <div className={`flex items-center gap-1 text-xs mb-2 font-medium ${
            diasParaEntrega !== null && diasParaEntrega < 0 ? 'text-red-500' :
            diasParaEntrega === 0 ? 'text-rojo-600' : 'text-gray-500'
          }`}>
            <Truck size={12} />
            Entrega: {new Date(orden.fechaEntrega).toLocaleDateString('es-PE')}
            {diasParaEntrega !== null && <span>({diasParaEntrega < 0 ? 'vencida' : diasParaEntrega === 0 ? 'hoy' : `en ${diasParaEntrega}d`})</span>}
          </div>
        )}
        {orden.recibidaEn && (
          <p className="flex items-center gap-1 text-xs mb-2 text-gray-500"><Package size={12} /> Recibida el {new Date(orden.recibidaEn).toLocaleDateString('es-PE')}</p>
        )}
        {orden.notas && <p className="text-xs text-gray-900 bg-gold-500 rounded px-2 py-1 mb-2 font-medium">📝 {orden.notas}</p>}

        <div className="flex gap-2 items-center">
          <button onClick={() => setExpandido(!expandido)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
            {expandido ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Ver ítems
          </button>
          {enviando && <Loader2 size={14} className="animate-spin text-gray-400 ml-auto" />}
          {!enviando && siguiente && (
            <button onClick={() => cambiar(siguiente)}
              className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-gold-600 text-white rounded-lg text-xs font-semibold hover:bg-gold-700 transition-colors">
              <Check size={12} />
              {siguiente === 'enviada' ? 'Enviar' : siguiente === 'aprobada' ? 'Aprobar' : 'Marcar recibida'}
            </button>
          )}
          {!enviando && orden.estado !== 'cancelada' && orden.estado !== 'recibida' && (
            <button onClick={() => cambiar('cancelada')}
              className="px-3 py-1.5 bg-red-50 text-red-500 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100">
              Cancelar
            </button>
          )}
        </div>
      </div>

      {expandido && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-400">
              <th className="text-left pb-1">Producto</th>
              <th className="text-center pb-1">Cant.</th>
              <th className="text-center pb-1">P. unit.</th>
              <th className="text-right pb-1">Subtotal</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {orden.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-1 text-gray-700">
                    {item.insumoId && <Link2 size={11} className="inline mr-1 text-gold-600" />}
                    {item.nombre} <span className="text-gray-400 text-xs">({item.unidad})</span>
                  </td>
                  <td className="py-1 text-center text-gray-600">{item.cantidad}</td>
                  <td className="py-1 text-center text-gray-600">S/ {item.precioUnit.toFixed(2)}</td>
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
  const { proveedores, ordenes, cargado, cargar, toggleActivo } = useProveedoresStore()
  const [tab, setTab] = useState<'proveedores' | 'ordenes'>('proveedores')
  const [busqueda, setBusqueda] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaProveedor | 'todos'>('todos')
  const [estadoFiltroOrden, setEstadoFiltroOrden] = useState<EstadoOrden | 'todas'>('todas')
  const [modalProv, setModalProv] = useState<{ abierto: boolean; proveedor?: Proveedor }>({ abierto: false })
  const [modalOrden, setModalOrden] = useState<{ abierto: boolean; proveedorId?: string }>({ abierto: false })
  const [error, setError] = useState('')

  useEffect(() => { cargar().catch((e) => setError(errorDe(e))) }, [cargar])

  const provFiltrados = proveedores.filter((p) => {
    const matchBusq = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (p.ruc ?? '').includes(busqueda)
    const matchCat = categoriaFiltro === 'todos' || p.categoria === categoriaFiltro
    return matchBusq && matchCat
  })

  const ordenesFiltradas = estadoFiltroOrden === 'todas' ? ordenes : ordenes.filter((o) => o.estado === estadoFiltroOrden)
  const comprasRecibidas = ordenes.filter((o) => o.estado === 'recibida').reduce((acc, o) => acc + o.total, 0)
  const porRecibir = ordenes.filter((o) => o.estado === 'enviada' || o.estado === 'aprobada').length

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Proveedores y Compras" subtitulo={`${proveedores.filter((p) => p.activo).length} proveedores activos`} />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gold-500 rounded-xl p-4">
            <p className="text-2xl font-bold text-gray-900">{proveedores.filter((p) => p.activo).length}</p>
            <p className="text-xs text-gray-900/70">Proveedores activos</p>
          </div>
          <div className="bg-rojo-500 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{porRecibir}</p>
            <p className="text-xs text-white/80">Órdenes por recibir</p>
          </div>
          <div className="bg-gray-600 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{ordenes.filter((o) => o.estado !== 'cancelada').length}</p>
            <p className="text-xs text-white/70">Órdenes totales</p>
          </div>
          <div className="bg-gold-600 rounded-xl p-4">
            <p className="text-xl font-bold text-white">S/ {comprasRecibidas.toFixed(0)}</p>
            <p className="text-xs text-white/80">Compras recibidas</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(['proveedores', 'ordenes'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t === 'proveedores' ? `Proveedores (${proveedores.length})` : `Órdenes (${ordenes.length})`}
              </button>
            ))}
          </div>
          <button
            onClick={() => tab === 'proveedores' ? setModalProv({ abierto: true }) : setModalOrden({ abierto: true })}
            className="flex items-center gap-2 px-4 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-colors">
            <Plus size={15} /> {tab === 'proveedores' ? 'Nuevo proveedor' : 'Nueva orden'}
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {!cargado && !error && <div className="flex justify-center py-10 text-gray-300"><Loader2 className="animate-spin" /></div>}

        {/* ── Tab Proveedores ── */}
        {cargado && tab === 'proveedores' && (
          <>
            <div className="flex gap-3 flex-wrap">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre o RUC..."
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

            {provFiltrados.length === 0 && (
              <div className="text-center py-12 text-gray-300 bg-white rounded-xl border border-gray-100">
                <Building2 size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">{proveedores.length === 0 ? 'Todavía no hay proveedores: crea el primero' : 'Sin resultados'}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {provFiltrados.map((prov) => {
                const cat = CATEGORIAS_PROV.find((c) => c.valor === prov.categoria)
                return (
                  <div key={prov.id} className={`bg-white rounded-xl border border-gray-200 p-4 ${!prov.activo ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-gold-500 rounded-xl flex items-center justify-center text-xl shrink-0">{cat?.emoji}</div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-gray-800 text-sm truncate">{prov.nombre}</h3>
                          <p className="text-xs text-gray-400">{prov.ruc ? `RUC ${prov.ruc}` : 'Sin RUC'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => toggleActivo(prov.id).catch((e) => alert(errorDe(e)))}
                          title={prov.activo ? 'Desactivar' : 'Activar'} className={prov.activo ? 'text-gold-500' : 'text-gray-400'}>
                          {prov.activo ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                        </button>
                        <button onClick={() => setModalProv({ abierto: true, proveedor: prov })} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      {prov.contacto && (
                        <div className="flex items-center gap-2 text-xs text-gray-500"><Building2 size={12} className="text-gray-400 shrink-0" />{prov.contacto}</div>
                      )}
                      {prov.telefono && (
                        <a href={`tel:${prov.telefono}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gold-600"><Phone size={12} className="text-gray-400 shrink-0" />{prov.telefono}</a>
                      )}
                      {prov.email && (
                        <a href={`mailto:${prov.email}`} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gold-600"><Mail size={12} className="text-gray-400 shrink-0" />{prov.email}</a>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Estrellas n={prov.calificacion} />
                      {prov.activo && (
                        <button onClick={() => { setModalOrden({ abierto: true, proveedorId: prov.id }); setTab('ordenes') }}
                          className="flex items-center gap-1 text-xs text-gold-600 hover:text-gold-700 font-medium">
                          <ShoppingCart size={12} /> Nueva orden
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── Tab Órdenes ── */}
        {cargado && tab === 'ordenes' && (
          <>
            <div className="flex gap-2 flex-wrap">
              {(['todas', 'borrador', 'enviada', 'aprobada', 'recibida', 'cancelada'] as const).map((estado) => {
                const count = estado === 'todas' ? ordenes.length : ordenes.filter((o) => o.estado === estado).length
                return (
                  <button key={estado} onClick={() => setEstadoFiltroOrden(estado)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      estadoFiltroOrden === estado ? 'bg-gold-600 text-white border-gold-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gold-300'
                    }`}>
                    {estado === 'todas' ? 'Todas' : ESTADO_ORDEN[estado].label} ({count})
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
        <ModalProveedor proveedor={modalProv.proveedor} onCerrar={() => setModalProv({ abierto: false })} />
      )}
      {modalOrden.abierto && (
        <ModalNuevaOrden proveedorInicial={modalOrden.proveedorId} onCerrar={() => setModalOrden({ abierto: false })} />
      )}
    </div>
  )
}
