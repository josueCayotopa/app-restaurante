import { useState, useRef } from 'react'
import Header from '../../components/layout/Header'
import { useCartaStore } from '../../store/cartaStore'
import { apiUpload, urlArchivo, ApiError } from '../../lib/api'
import type { Producto, CategoriaProducto } from '../../types'
import {
  Search, Plus, ToggleLeft, ToggleRight, Clock, Edit2, Trash2, X, Check, ImagePlus, Loader2,
} from 'lucide-react'

const CATEGORIAS: { valor: CategoriaProducto; label: string; emoji: string }[] = [
  { valor: 'entradas', label: 'Entradas', emoji: '🥗' },
  { valor: 'fondos', label: 'Fondos', emoji: '🍽️' },
  { valor: 'bebidas', label: 'Bebidas', emoji: '🥤' },
  { valor: 'cocteles', label: 'Bar / Cócteles', emoji: '🍺' },
  { valor: 'postres', label: 'Postres', emoji: '🍮' },
  { valor: 'extras', label: 'Extras', emoji: '🍟' },
]

const CATEGORIA_COLORS: Record<CategoriaProducto, string> = {
  entradas: 'bg-rojo-100 text-rojo-700',
  fondos:   'bg-gold-100 text-gold-700',
  bebidas:  'bg-gray-100 text-gray-700',
  cocteles: 'bg-gold-100 text-gold-700',
  postres:  'bg-rojo-100 text-rojo-700',
  extras: 'bg-gray-100 text-gray-600',
}

function ModalProducto({
  producto,
  onGuardar,
  onCerrar,
}: {
  producto?: Producto
  onGuardar: (datos: Omit<Producto, 'id'>) => void
  onCerrar: () => void
}) {
  const [form, setForm] = useState({
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    precio: producto?.precio ?? 0,
    categoria: producto?.categoria ?? ('fondos' as CategoriaProducto),
    disponible: producto?.disponible ?? true,
    tiempoPreparacion: producto?.tiempoPreparacion ?? 15,
    esAlcoholico: producto?.esAlcoholico ?? false,
    imagen: producto?.imagen ?? '',
  })
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [errorImagen, setErrorImagen] = useState('')
  const inputImagenRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGuardar(form)
  }

  const handleSeleccionarImagen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorImagen('')
    setSubiendoImagen(true)
    try {
      const { url } = await apiUpload<{ url: string }>('/api/uploads/imagen', file)
      setForm((f) => ({ ...f, imagen: url }))
    } catch (err) {
      setErrorImagen(err instanceof ApiError ? err.message : 'Error subiendo la imagen')
    } finally {
      setSubiendoImagen(false)
      if (inputImagenRef.current) inputImagenRef.current.value = ''
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">
            {producto ? 'Editar producto' : 'Nuevo producto'}
          </h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
              placeholder="Nombre del producto"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500 resize-none"
              placeholder="Descripción opcional"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Imagen</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                {subiendoImagen ? (
                  <Loader2 size={18} className="text-gray-400 animate-spin" />
                ) : form.imagen ? (
                  <img src={urlArchivo(form.imagen)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus size={18} className="text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={inputImagenRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleSeleccionarImagen}
                  disabled={subiendoImagen}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-gold-50 file:text-gold-700 file:text-xs file:font-medium hover:file:bg-gold-100"
                />
                {errorImagen && <p className="text-xs text-red-500 mt-1">{errorImagen}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Precio (S/)</label>
              <input
                required
                type="number"
                min={0}
                step={0.5}
                value={form.precio}
                onChange={(e) => setForm({ ...form, precio: parseFloat(e.target.value) })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tiempo prep. (min)</label>
              <input
                type="number"
                min={0}
                value={form.tiempoPreparacion}
                onChange={(e) => setForm({ ...form, tiempoPreparacion: parseInt(e.target.value) })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
            <select
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaProducto })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
            >
              {CATEGORIAS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, disponible: !form.disponible })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                form.disponible
                  ? 'border-gold-200 bg-gold-50 text-gold-700'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            >
              {form.disponible ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              {form.disponible ? 'Disponible' : 'No disponible'}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={subiendoImagen}
              className="flex-1 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={15} />
              {producto ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TarjetaProducto({
  producto,
  onEditar,
  onEliminar,
}: {
  producto: Producto
  onEditar: () => void
  onEliminar: () => void
}) {
  const toggleDisponibilidad = useCartaStore((s) => s.toggleDisponibilidad)
  const cat = CATEGORIAS.find((c) => c.valor === producto.categoria)

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 flex gap-4 transition-opacity ${
      !producto.disponible ? 'opacity-60' : ''
    }`}>
      {/* Imagen / icono categoría */}
      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-2xl shrink-0 overflow-hidden">
        {producto.imagen ? (
          <img src={urlArchivo(producto.imagen)} alt={producto.nombre} className="w-full h-full object-cover" />
        ) : (
          cat?.emoji
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-gray-800 text-sm leading-tight">{producto.nombre}</h3>
          <span className="shrink-0 font-bold text-gold-600 text-sm">S/ {producto.precio.toFixed(2)}</span>
        </div>

        {producto.descripcion && (
          <p className="text-xs text-gray-400 mb-2 line-clamp-2">{producto.descripcion}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORIA_COLORS[producto.categoria]}`}>
            {cat?.label}
          </span>
          {producto.tiempoPreparacion && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock size={11} />
              {producto.tiempoPreparacion} min
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            producto.disponible
              ? 'bg-gold-50 text-gold-700'
              : 'bg-red-50 text-red-500'
          }`}>
            {producto.disponible ? 'Disponible' : 'No disponible'}
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <button
          onClick={() => toggleDisponibilidad(producto.id)}
          title={producto.disponible ? 'Desactivar' : 'Activar'}
          className={`p-1.5 rounded-lg transition-colors ${
            producto.disponible
              ? 'text-gold-600 hover:bg-gold-50'
              : 'text-gray-400 hover:bg-gray-100'
          }`}
        >
          {producto.disponible ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
        </button>
        <button
          onClick={onEditar}
          className="p-1.5 rounded-lg text-gold-500 hover:bg-gold-50 transition-colors"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={onEliminar}
          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function MenuPage() {
  const { productos, agregarProducto, actualizarProducto, eliminarProducto } = useCartaStore()
  const [busqueda, setBusqueda] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaProducto | 'todas'>('todas')
  const [modal, setModal] = useState<{ abierto: boolean; producto?: Producto }>({ abierto: false })

  const productosFiltrados = productos.filter((p) => {
    const matchBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
    const matchCategoria = categoriaActiva === 'todas' || p.categoria === categoriaActiva
    return matchBusqueda && matchCategoria
  })

  const handleGuardar = async (datos: Omit<Producto, 'id'>) => {
    try {
      if (modal.producto) {
        await actualizarProducto(modal.producto.id, datos)
      } else {
        await agregarProducto(datos)
      }
      setModal({ abierto: false })
    } catch (e) {
      console.error('[carta] Error guardando producto:', e)
    }
  }

  const totalDisponibles = productos.filter((p) => p.disponible).length

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Carta / Menú" subtitulo={`${totalDisponibles} de ${productos.length} productos disponibles`} />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* KPIs por categoría */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {CATEGORIAS.map((cat) => {
            const total = productos.filter((p) => p.categoria === cat.valor).length
            const disp = productos.filter((p) => p.categoria === cat.valor && p.disponible).length
            return (
              <button
                key={cat.valor}
                onClick={() => setCategoriaActiva(cat.valor === categoriaActiva ? 'todas' : cat.valor)}
                className={`rounded-xl p-3 border text-left transition-all ${
                  categoriaActiva === cat.valor
                    ? 'border-gold-400 bg-gold-50'
                    : 'border-gray-200 bg-white hover:border-gold-200'
                }`}
              >
                <div className="text-xl mb-1">{cat.emoji}</div>
                <p className="text-xs font-semibold text-gray-700">{cat.label}</p>
                <p className="text-xs text-gray-400">{disp}/{total} activos</p>
              </button>
            )
          })}
        </div>

        {/* Barra de herramientas */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold-500 bg-white"
            />
          </div>
          <button
            onClick={() => setModal({ abierto: true })}
            className="flex items-center gap-2 px-4 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-colors"
          >
            <Plus size={16} />
            Nuevo producto
          </button>
        </div>

        {/* Filtros tab por categoría */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategoriaActiva('todas')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              categoriaActiva === 'todas'
                ? 'bg-gold-600 text-white border-gold-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gold-300'
            }`}
          >
            Todos ({productos.length})
          </button>
          {CATEGORIAS.map((cat) => {
            const count = productos.filter((p) => p.categoria === cat.valor).length
            return (
              <button
                key={cat.valor}
                onClick={() => setCategoriaActiva(cat.valor === categoriaActiva ? 'todas' : cat.valor)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  categoriaActiva === cat.valor
                    ? 'bg-gold-600 text-white border-gold-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gold-300'
                }`}
              >
                {cat.emoji} {cat.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Lista de productos */}
        {productosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-gray-300">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-sm">No se encontraron productos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {productosFiltrados.map((p) => (
              <TarjetaProducto
                key={p.id}
                producto={p}
                onEditar={() => setModal({ abierto: true, producto: p })}
                onEliminar={() => eliminarProducto(p.id).catch((e) => console.error('[carta] Error eliminando producto:', e))}
              />
            ))}
          </div>
        )}
      </div>

      {modal.abierto && (
        <ModalProducto
          producto={modal.producto}
          onGuardar={handleGuardar}
          onCerrar={() => setModal({ abierto: false })}
        />
      )}
    </div>
  )
}
