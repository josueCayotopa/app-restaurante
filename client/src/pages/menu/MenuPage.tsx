import { useState, useRef, useEffect } from 'react'
import Header from '../../components/layout/Header'
import { useCartaStore } from '../../store/cartaStore'
import { useCategoriasStore, COLOR_CATEGORIA, type Categoria } from '../../store/categoriasStore'
import ModalCategorias from '../../components/productos/ModalCategorias'
import ModalReceta from '../../components/productos/ModalReceta'
import { useRecetasStore } from '../../store/recetasStore'
import { SECCION_CFG, type SeccionCarta } from '../../lib/carta'
import { apiUpload, urlArchivo, ApiError } from '../../lib/api'
import type { Producto, CategoriaProducto } from '../../types'
import {
  Search, Plus, Tags, ToggleLeft, ToggleRight, Clock, Edit2, Trash2, X, Check, ImagePlus, Loader2, ClipboardList,
} from 'lucide-react'

// Clases de color (fondo sólido) de una categoría por id
function colorDe(categorias: Categoria[], id: string) {
  const c = categorias.find((x) => x.id === id)
  return (COLOR_CATEGORIA[c?.color ?? 'gris'] ?? COLOR_CATEGORIA.gris).clases
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
  const categorias = useCategoriasStore((s) => s.categorias)
  const [form, setForm] = useState({
    nombre: producto?.nombre ?? '',
    descripcion: producto?.descripcion ?? '',
    precio: producto?.precio ?? 0,
    categoria: producto?.categoria ?? categorias[0]?.id ?? '',
    disponible: producto?.disponible ?? true,
    tiempoPreparacion: producto?.tiempoPreparacion ?? 15,
    esAlcoholico: producto?.esAlcoholico ?? false,
    imagen: producto?.imagen ?? '',
    seccionCarta: producto ? (producto.seccionCarta ?? '') : 'plato',
    tieneGuarnicion: producto?.tieneGuarnicion ?? false,
    guarnicionesDisponibles: producto?.guarnicionesDisponibles ?? [],
  })
  const [nuevaGuarnicion, setNuevaGuarnicion] = useState('')
  const agregarGuarnicion = () => {
    const g = nuevaGuarnicion.trim()
    if (!g) return
    if (!form.guarnicionesDisponibles.some((x) => x.toLowerCase() === g.toLowerCase())) {
      setForm({ ...form, guarnicionesDisponibles: [...form.guarnicionesDisponibles, g] })
    }
    setNuevaGuarnicion('')
  }
  const [subiendoImagen, setSubiendoImagen] = useState(false)
  const [errorImagen, setErrorImagen] = useState('')
  const inputImagenRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGuardar({ ...form, seccionCarta: form.seccionCarta || null })
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
          <div className="flex gap-3 items-end">
            <div className="shrink-0">
              <label className="block text-xs font-medium text-gray-600 mb-1">Foto</label>
              <input
                ref={inputImagenRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleSeleccionarImagen}
                className="hidden"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => inputImagenRef.current?.click()}
                  disabled={subiendoImagen}
                  title={form.imagen ? 'Cambiar foto' : 'Subir foto'}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 hover:border-gold-500 overflow-hidden flex items-center justify-center text-gray-400 hover:text-gold-600 transition-colors"
                >
                  {subiendoImagen ? <Loader2 size={20} className="animate-spin" />
                    : form.imagen ? <img src={urlArchivo(form.imagen)} alt="" className="w-full h-full object-cover" />
                    : <ImagePlus size={22} />}
                </button>
                {form.imagen && !subiendoImagen && (
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, imagen: '' }))}
                    title="Quitar foto"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
                placeholder="Nombre del producto"
              />
            </div>
          </div>
          {errorImagen && <p className="text-xs text-red-500 -mt-2">{errorImagen}</p>}

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
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sección en la carta</label>
            <select
              value={form.seccionCarta}
              onChange={(e) => setForm({ ...form, seccionCarta: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
            >
              <option value="">— No sale en la carta —</option>
              {(Object.keys(SECCION_CFG) as SeccionCarta[]).map((sec) => (
                <option key={sec} value={sec}>{SECCION_CFG[sec].label}</option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400 mt-1">
              Para tamaños usa el nombre con paréntesis, ej. <strong>Chicharrón (Personal)</strong> y <strong>Chicharrón (Fuente)</strong>: en la carta salen en una sola fila.
            </p>
          </div>

          {/* Guarniciones: el mozo elige entre estas al pedir el plato */}
          <div className="border border-gray-100 rounded-xl p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.tieneGuarnicion}
                onChange={(e) => setForm({ ...form, tieneGuarnicion: e.target.checked })}
                className="w-4 h-4 accent-gold-600" />
              Lleva guarniciones (el mozo las elige al pedir)
            </label>
            {form.tieneGuarnicion && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {form.guarnicionesDisponibles.map((g) => (
                    <span key={g} className="inline-flex items-center gap-1 text-xs bg-gold-500 text-gray-900 font-medium pl-2 pr-1 py-1 rounded-full">
                      {g}
                      <button type="button" title={`Quitar ${g}`}
                        onClick={() => setForm({ ...form, guarnicionesDisponibles: form.guarnicionesDisponibles.filter((x) => x !== g) })}
                        className="w-4 h-4 rounded-full hover:bg-black/15 flex items-center justify-center">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  {form.guarnicionesDisponibles.length === 0 && <span className="text-xs text-gray-400">Sin guarniciones todavía</span>}
                </div>
                <div className="flex gap-2">
                  <input value={nuevaGuarnicion} onChange={(e) => setNuevaGuarnicion(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarGuarnicion() } }}
                    placeholder="Ej: Humitas"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gold-500" />
                  <button type="button" onClick={agregarGuarnicion}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900">
                    Agregar
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, disponible: !form.disponible })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                form.disponible
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-400 text-white'
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
  onReceta,
}: {
  producto: Producto
  onEditar: () => void
  onEliminar: () => void
  onReceta: () => void
}) {
  const receta = useRecetasStore((s) => s.recetas[producto.id])
  const margen = receta && producto.precio > 0 ? Math.round(((producto.precio - receta.costo) / producto.precio) * 100) : null
  const toggleDisponibilidad = useCartaStore((s) => s.toggleDisponibilidad)
  const categorias = useCategoriasStore((s) => s.categorias)
  const actualizarProducto   = useCartaStore((s) => s.actualizarProducto)
  const cat = categorias.find((c) => c.id === producto.categoria)
  const inputFoto = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)

  // Subir la foto real directo desde la tarjeta, sin abrir el formulario
  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSubiendo(true)
    try {
      const { url } = await apiUpload<{ url: string }>('/api/uploads/imagen', file)
      await actualizarProducto(producto.id, { imagen: url })
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Error subiendo la foto')
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-2.5 flex gap-3 items-center transition-opacity ${
      !producto.disponible ? 'opacity-60' : ''
    }`}>
      {/* Foto (clic para subir/cambiar) */}
      <input ref={inputFoto} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleFoto} className="hidden" />
      <button
        onClick={() => inputFoto.current?.click()}
        disabled={subiendo}
        title={producto.imagen ? 'Cambiar foto' : 'Subir foto'}
        className="group relative w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center text-2xl shrink-0 overflow-hidden"
      >
        {subiendo ? (
          <Loader2 size={18} className="text-gray-400 animate-spin" />
        ) : producto.imagen ? (
          <img src={urlArchivo(producto.imagen)} alt={producto.nombre} className="w-full h-full object-cover" />
        ) : (
          cat?.emoji
        )}
        {!subiendo && (
          <span className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <ImagePlus size={16} />
          </span>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-800 text-sm leading-tight truncate" title={producto.nombre}>{producto.nombre}</h3>
        <p className="font-bold text-gold-600 text-sm">S/ {producto.precio.toFixed(2)}</p>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${colorDe(categorias, producto.categoria)}`}>
            {cat?.nombre}
          </span>
          {producto.tiempoPreparacion ? (
            <span className="flex items-center gap-0.5 text-[11px] text-gray-400 shrink-0">
              <Clock size={10} />
              {producto.tiempoPreparacion}′
            </span>
          ) : null}
          {!producto.disponible && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-red-500 text-white shrink-0">Agotado</span>
          )}
        </div>
        {/* Receta: costo, margen y cuántas porciones alcanzan con el stock */}
        <button onClick={onReceta} className="mt-1 block text-left text-[11px] leading-tight hover:underline" title="Ver / editar receta">
          {receta ? (
            <span className="text-gray-500">
              Costo S/ {receta.costo.toFixed(2)}{margen !== null && ` · margen ${margen}%`}
              {receta.porciones !== null && (
                <span className={receta.porciones === 0 ? 'text-red-500 font-semibold' : receta.porciones <= 5 ? 'text-rojo-600 font-semibold' : ''}>
                  {' · '}{receta.porciones === 0 ? `sin stock (${receta.limitante})` : `alcanza ${receta.porciones}`}
                </span>
              )}
            </span>
          ) : (
            <span className="text-gray-400">Sin receta · no descuenta inventario</span>
          )}
        </button>
      </div>

      {/* Acciones */}
      <div className="flex flex-col shrink-0">
        <button onClick={onReceta} title="Receta (insumos que descuenta)"
          className={`p-1 rounded-lg transition-colors hover:bg-gold-50 ${receta ? 'text-gold-600' : 'text-gray-400'}`}>
          <ClipboardList size={14} />
        </button>
        <button
          onClick={() => toggleDisponibilidad(producto.id)}
          title={producto.disponible ? 'Desactivar' : 'Activar'}
          className={`p-1 rounded-lg transition-colors ${
            producto.disponible
              ? 'text-gold-600 hover:bg-gold-50'
              : 'text-gray-400 hover:bg-gray-100'
          }`}
        >
          {producto.disponible ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
        </button>
        <button
          onClick={onEditar}
          className="p-1 rounded-lg text-gold-500 hover:bg-gold-50 transition-colors"
          title="Editar"
        >
          <Edit2 size={14} />
        </button>
        <button
          onClick={onEliminar}
          className="p-1 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
          title="Eliminar"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default function MenuPage() {
  const { productos, agregarProducto, actualizarProducto, eliminarProducto } = useCartaStore()
  const categorias = useCategoriasStore((s) => s.categorias)
  const [modalCategorias, setModalCategorias] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaProducto | 'todas'>('todas')
  const [modal, setModal] = useState<{ abierto: boolean; producto?: Producto }>({ abierto: false })
  const [recetaDe, setRecetaDe] = useState<Producto | null>(null)
  const cargarRecetas = useRecetasStore((s) => s.cargar)
  useEffect(() => { cargarRecetas().catch((e) => console.error('[recetas] Error cargando:', e)) }, [cargarRecetas])

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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
          {categorias.map((cat) => {
            const total = productos.filter((p) => p.categoria === cat.id).length
            const disp = productos.filter((p) => p.categoria === cat.id && p.disponible).length
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(cat.id === categoriaActiva ? 'todas' : cat.id)}
                className={`rounded-xl px-3 py-2 text-left transition-all ${colorDe(categorias, cat.id)} ${
                  categoriaActiva === cat.id ? 'ring-2 ring-offset-2 ring-gold-500' : 'hover:brightness-105'
                }`}
              >
                <p className="text-sm font-semibold truncate"><span className="mr-1">{cat.emoji}</span>{cat.nombre}</p>
                <p className="text-xs opacity-70">{disp}/{total} activos</p>
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
            onClick={() => setModalCategorias(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:border-gold-500 hover:text-gold-600 transition-colors bg-white"
          >
            <Tags size={16} />
            Categorías
          </button>
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
          {categorias.map((cat) => {
            const count = productos.filter((p) => p.categoria === cat.id).length
            return (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(cat.id === categoriaActiva ? 'todas' : cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  categoriaActiva === cat.id
                    ? 'bg-gold-600 text-white border-gold-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gold-300'
                }`}
              >
                {cat.emoji} {cat.nombre} ({count})
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-2">
            {productosFiltrados.map((p) => (
              <TarjetaProducto
                key={p.id}
                producto={p}
                onEditar={() => setModal({ abierto: true, producto: p })}
                onReceta={() => setRecetaDe(p)}
                onEliminar={() => {
                  if (confirm(`¿Eliminar "${p.nombre}"?`)) {
                    eliminarProducto(p.id).catch((e) => alert(e instanceof ApiError ? e.message : 'No se pudo eliminar'))
                  }
                }}
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

      {modalCategorias && <ModalCategorias onCerrar={() => setModalCategorias(false)} />}
      {recetaDe && <ModalReceta producto={recetaDe} onCerrar={() => setRecetaDe(null)} />}
    </div>
  )
}
