import { useState, useRef } from 'react'
import { Plus, Edit2, Trash2, X, Check, ImagePlus, Loader2 } from 'lucide-react'
import Header from '../../components/layout/Header'
import { useAuthStore } from '../../store/authStore'
import { useCartaStore } from '../../store/cartaStore'
import { useCategoriasStore } from '../../store/categoriasStore'
import { apiUpload, urlArchivo, ApiError } from '../../lib/api'
import {
  SECCION_CFG, baseYTamano, nombreConTamano, filasDeSeccion, preciosDeFila,
  type SeccionCarta, type FilaCarta,
} from '../../lib/carta'
import {
  useCartaPublicaStore,
  type Promocion,
  type DatosPromo,
  type ColorPromo,
} from '../../store/cartaPublicaStore'

const SECCIONES_NAV = [
  { id: 'promos',       label: '% Promos'    },
  { id: 'platos',       label: 'Platos'      },
  { id: 'chaufas',      label: 'Chaufas'     },
  { id: 'caldos',       label: 'Caldos'      },
  { id: 'guarniciones', label: 'Guarniciones'},
  { id: 'bebidas',      label: 'Bebidas'     },
]

// Tarjeta de promo: color sólido (dorado → texto oscuro, el resto → blanco)
const COLOR_PROMO: Record<ColorPromo, { label: string; card: string; muted: string; chip: string; swatch: string }> = {
  gold:  { label: 'Dorado', card: 'bg-gold-500 text-gray-900', muted: 'text-gray-900/70', chip: 'bg-black/15', swatch: 'bg-gold-500'  },
  rojo:  { label: 'Rojo',   card: 'bg-rojo-600 text-white',    muted: 'text-white/75',    chip: 'bg-white/20', swatch: 'bg-rojo-600'  },
  steel: { label: 'Azul',   card: 'bg-steel-600 text-white',   muted: 'text-white/75',    chip: 'bg-white/20', swatch: 'bg-steel-600' },
  green: { label: 'Verde',  card: 'bg-green-600 text-white',   muted: 'text-white/75',    chip: 'bg-white/20', swatch: 'bg-green-600' },
}

const EMOJIS_PROMO = ['🏷️', '👮', '🎓', '🎂', '👨‍👩‍👧', '💳', '🎉', '⭐', '🍺', '🥩']

// ── Modal promoción ─────────────────────────────────────────────────────────

const PROMO_EMPTY: DatosPromo = {
  nombre: '', emoji: '🏷️', porcentaje: 10, condicion: '', requisito: '', color: 'gold', activa: true,
}

function ModalPromo({
  promo, onGuardar, onEliminar, onCerrar,
}: {
  promo?: Promocion
  onGuardar: (datos: DatosPromo) => Promise<void>
  onEliminar?: () => Promise<void>
  onCerrar: () => void
}) {
  const [form, setForm] = useState<DatosPromo>(promo ? { ...promo } : PROMO_EMPTY)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const ejecutar = async (accion: () => Promise<void>) => {
    setGuardando(true); setError('')
    try { await accion(); onCerrar() }
    catch (err) { setError(err instanceof ApiError ? err.message : 'No se pudo guardar') }
    finally { setGuardando(false) }
  }

  const cfg = COLOR_PROMO[form.color]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">{promo ? 'Editar descuento' : 'Nuevo descuento'}</h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={17} /></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); ejecutar(() => onGuardar(form)) }} className="p-5 space-y-4">
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <CampoTexto label="Nombre" value={form.nombre} onChange={(v) => setForm((f) => ({ ...f, nombre: v }))} placeholder="ej. Familia numerosa" required />
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Descuento % *</label>
              <input type="number" min={1} max={100} required value={form.porcentaje}
                onChange={(e) => setForm((f) => ({ ...f, porcentaje: parseFloat(e.target.value) || 0 }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
          </div>

          <CampoTexto label="Cuándo aplica" value={form.condicion ?? ''} onChange={(v) => setForm((f) => ({ ...f, condicion: v }))} placeholder="ej. Lunes a viernes" />
          <CampoTexto label="Requisito" value={form.requisito ?? ''} onChange={(v) => setForm((f) => ({ ...f, requisito: v }))} placeholder="ej. Presentar DNI" />

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Ícono</label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJIS_PROMO.map((em) => (
                <button key={em} type="button" onClick={() => setForm((f) => ({ ...f, emoji: em }))}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center border transition-colors ${
                    form.emoji === em ? 'border-gold-500 bg-gold-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Color</label>
              <div className="flex gap-2">
                {(Object.keys(COLOR_PROMO) as ColorPromo[]).map((c) => (
                  <button key={c} type="button" title={COLOR_PROMO[c].label} onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={`w-7 h-7 rounded-full ${COLOR_PROMO[c].swatch} ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-800' : ''}`} />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input type="checkbox" checked={form.activa} onChange={(e) => setForm((f) => ({ ...f, activa: e.target.checked }))}
                className="w-4 h-4 accent-gold-600" />
              Activo en comandas
            </label>
          </div>

          {/* Vista previa */}
          <div className={`rounded-xl px-3 py-2 flex items-center gap-2 ${cfg.card}`}>
            <span className="text-lg">{form.emoji}</span>
            <span className="font-bold text-sm flex-1 truncate">{form.nombre || 'Nombre del descuento'}</span>
            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${cfg.chip}`}>{form.porcentaje}%</span>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            {onEliminar && (
              <button type="button" disabled={guardando}
                onClick={() => { if (confirm(`¿Eliminar el descuento "${promo?.nombre}"?`)) ejecutar(onEliminar) }}
                className="px-3 py-2.5 border border-red-200 text-red-500 rounded-xl hover:bg-red-50" title="Eliminar">
                <Trash2 size={15} />
              </button>
            )}
            <button type="button" onClick={onCerrar}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={guardando}
              className="flex-1 py-2.5 bg-gold-600 text-white rounded-xl text-sm font-bold hover:bg-gold-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {guardando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {promo ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal plato de la carta (edita los productos reales de cada tamaño) ─────

function CampoTexto({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}{required && ' *'}</label>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
      />
    </div>
  )
}

type Variante = { id?: string; tamano: string; precio: string }

function variantesIniciales(seccion: SeccionCarta, fila?: FilaCarta): Variante[] {
  if (fila) {
    return fila.productos.map((p) => ({ id: p.id, tamano: baseYTamano(p.nombre).tamano ?? '', precio: String(p.precio) }))
  }
  const cols = SECCION_CFG[seccion].columnas
  return cols ? cols.map((c) => ({ tamano: c, precio: '' })) : [{ tamano: '', precio: '' }]
}

function ModalFilaCarta({
  fila,
  seccionDefault,
  onCerrar,
}: {
  fila?: FilaCarta
  seccionDefault: SeccionCarta
  onCerrar: () => void
}) {
  const { agregarProducto, actualizarProducto } = useCartaStore()
  const categorias = useCategoriasStore((s) => s.categorias)

  const imagenInicial = fila?.imagen ?? ''
  const [seccion, setSeccion]     = useState<SeccionCarta>(fila?.seccion ?? seccionDefault)
  const [nombre, setNombre]       = useState(fila?.nombre ?? '')
  const [imagen, setImagen]       = useState(imagenInicial)
  const [variantes, setVariantes] = useState<Variante[]>(variantesIniciales(fila?.seccion ?? seccionDefault, fila))
  const [subiendo, setSubiendo]   = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState('')
  const inputFoto = useRef<HTMLInputElement>(null)

  const columnas = SECCION_CFG[seccion].columnas

  const handleSeccion = (s: SeccionCarta) => {
    setSeccion(s)
    // Plato nuevo: proponer los tamaños típicos de la sección
    if (!fila) setVariantes(variantesIniciales(s))
  }

  const setVariante = (i: number, cambios: Partial<Variante>) =>
    setVariantes((vs) => vs.map((v, j) => (j === i ? { ...v, ...cambios } : v)))

  const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSubiendo(true); setError('')
    try {
      const { url } = await apiUpload<{ url: string }>('/api/uploads/imagen', file)
      setImagen(url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error subiendo la foto')
    } finally {
      setSubiendo(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const conPrecio = variantes.filter((v) => v.precio.trim() !== '')
    if (conPrecio.length === 0) { setError('Pon el precio de al menos un tamaño'); return }
    if (conPrecio.some((v) => !(parseFloat(v.precio) >= 0))) { setError('Hay un precio inválido'); return }

    setGuardando(true); setError('')
    try {
      const cambioFoto = imagen !== imagenInicial
      const modelo = fila?.productos[0]   // los tamaños nuevos heredan guarniciones/alcohol del plato
      const categoriaSeccion = SECCION_CFG[seccion].categoria
      const categoria = modelo?.categoria
        ?? (categorias.some((c) => c.id === categoriaSeccion) ? categoriaSeccion : categorias[0]?.id ?? categoriaSeccion)

      for (const v of conPrecio) {
        const datos = {
          nombre: nombreConTamano(nombre, v.tamano),
          precio: parseFloat(v.precio),
          seccionCarta: seccion,
          ...(cambioFoto ? { imagen } : {}),
        }
        if (v.id) {
          await actualizarProducto(v.id, datos)
        } else {
          await agregarProducto({
            ...datos,
            categoria,
            disponible: true,
            imagen: imagen || undefined,
            tiempoPreparacion: modelo?.tiempoPreparacion ?? 15,
            esAlcoholico: modelo?.esAlcoholico ?? false,
            tieneGuarnicion: modelo?.tieneGuarnicion ?? false,
            guarnicionesDisponibles: modelo?.guarnicionesDisponibles,
          })
        }
      }
      // Tamaños quitados: salen de la carta pero el producto sigue en Productos
      const quitados = (fila?.productos ?? []).filter((p) => !conPrecio.some((v) => v.id === p.id))
      for (const p of quitados) await actualizarProducto(p.id, { seccionCarta: null })
      onCerrar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar')
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-800">
            {fila ? 'Editar plato de la carta' : 'Agregar a la carta'}
          </h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">

          {/* Sección */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Sección *</label>
            <select
              value={seccion}
              onChange={(e) => handleSeccion(e.target.value as SeccionCarta)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
            >
              {(Object.keys(SECCION_CFG) as SeccionCarta[]).map((s) => (
                <option key={s} value={s}>{SECCION_CFG[s].label}</option>
              ))}
            </select>
          </div>

          {/* Foto + Nombre */}
          <div className="flex gap-3 items-end">
            <div className="shrink-0">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Foto</label>
              <input ref={inputFoto} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFoto} className="hidden" />
              <div className="relative">
                <button type="button" onClick={() => inputFoto.current?.click()} disabled={subiendo}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 hover:border-gold-500 overflow-hidden flex items-center justify-center text-gray-400 hover:text-gold-600 transition-colors"
                  title={imagen ? 'Cambiar foto' : 'Subir foto'}>
                  {subiendo ? <Loader2 size={20} className="animate-spin" />
                    : imagen ? <img src={urlArchivo(imagen)} alt="" className="w-full h-full object-cover" />
                    : <ImagePlus size={22} />}
                </button>
                {imagen && !subiendo && (
                  <button type="button" onClick={() => setImagen('')}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                    title="Quitar foto">
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1">
              <CampoTexto label="Nombre del plato" value={nombre} onChange={setNombre} placeholder="ej. Chicharrón" required />
            </div>
          </div>

          {/* Tamaños y precios = productos */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Tamaños y precios (S/)</label>
            <datalist id="tamanos-carta">
              {(columnas ?? ['Chico', 'Grande']).map((c) => <option key={c} value={c} />)}
            </datalist>
            <div className="space-y-1.5">
              {variantes.map((v, i) => (
                <div key={v.id ?? `nuevo-${i}`} className="flex gap-2 items-center">
                  <input
                    list="tamanos-carta"
                    value={v.tamano}
                    onChange={(e) => setVariante(i, { tamano: e.target.value })}
                    placeholder="Tamaño (opcional)"
                    className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500"
                  />
                  <input
                    type="number" min={0} step={0.5}
                    value={v.precio}
                    onChange={(e) => setVariante(i, { precio: e.target.value })}
                    placeholder="0.00"
                    className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:border-gold-500"
                  />
                  <button type="button" onClick={() => setVariantes((vs) => vs.filter((_, j) => j !== i))}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Quitar tamaño">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setVariantes((vs) => [...vs, { tamano: '', precio: '' }])}
              className="mt-2 flex items-center gap-1 text-xs font-semibold text-gold-700 hover:text-gold-800">
              <Plus size={12} /> Agregar tamaño
            </button>
            <p className="text-[11px] text-gray-400 mt-2">
              Cada tamaño es un producto: el precio que pongas aquí es el mismo que se cobra al tomar el pedido.
            </p>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* Acciones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCerrar}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || subiendo}
              className="flex-1 py-2.5 bg-gold-600 text-white rounded-xl text-sm font-bold hover:bg-gold-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {guardando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {fila ? 'Guardar cambios' : 'Agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Sub-componentes de display ──────────────────────────────────────────────

function SeccionHeader({
  titulo,
  emoji,
  onAgregar,
}: {
  titulo: string
  emoji: string
  onAgregar?: () => void
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xl">{emoji}</span>
      <h2 className="text-sm font-black tracking-widest text-black uppercase shrink-0">{titulo}</h2>
      <div className="flex-1 h-px bg-gold-400" />
      {onAgregar && <BotonAgregar onClick={onAgregar} />}
    </div>
  )
}

function SubSeccionHeader({ titulo, onAgregar }: { titulo: string; onAgregar?: () => void }) {
  return (
    <div className="flex items-center gap-2 mb-2 px-1">
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">{titulo}</h3>
      <div className="flex-1 h-px bg-gray-200" />
      {onAgregar && <BotonAgregar onClick={onAgregar} />}
    </div>
  )
}

function BotonAgregar({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-gold-50 border border-gold-300 text-gold-700 rounded-lg text-xs font-semibold hover:bg-gold-100 transition-colors"
    >
      <Plus size={12} />
      Agregar
    </button>
  )
}

function Miniatura({ fila }: { fila: FilaCarta }) {
  if (!fila.imagen) return null
  return (
    <a href={urlArchivo(fila.imagen)} target="_blank" rel="noreferrer" title="Ver foto" className="shrink-0 mr-2.5">
      <img src={urlArchivo(fila.imagen)} alt={fila.nombre} className="w-9 h-9 rounded-lg object-cover border border-gray-100" />
    </a>
  )
}

function AccionesFila({ onEditar, onQuitar }: { onEditar?: () => void; onQuitar?: () => void }) {
  if (!onEditar || !onQuitar) return null
  return (
    <div className="flex gap-0.5 ml-1 shrink-0">
      <button
        onClick={onEditar}
        className="p-1.5 text-gold-500 hover:bg-gold-50 rounded-lg transition-colors"
        title="Editar"
      >
        <Edit2 size={13} />
      </button>
      <button
        onClick={onQuitar}
        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
        title="Quitar de la carta"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// Tabla de una sección: encabezado de tamaños (si tiene) + una fila por plato
function TablaSeccion({
  filas, seccion, vacio, onEditar, onQuitar,
}: {
  filas: FilaCarta[]
  seccion: SeccionCarta
  vacio: string
  onEditar?: (f: FilaCarta) => void
  onQuitar?: (f: FilaCarta) => void
}) {
  const columnas = SECCION_CFG[seccion].columnas
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {columnas && (
        <div className="flex items-center px-3 pt-1 pb-0.5 mb-0.5">
          <span className="flex-1" />
          {columnas.map((c) => (
            <span key={c} className="w-24 text-right text-xs font-bold text-gray-400 uppercase tracking-wide">{c}</span>
          ))}
          {onEditar && <span className="w-16" />}
        </div>
      )}
      {filas.map((fila, i) => (
        <div key={fila.clave}
          className={`flex items-center px-3 py-2 text-sm ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'} ${fila.disponible ? '' : 'opacity-50'}`}>
          <Miniatura fila={fila} />
          <span className="flex-1 text-gray-800 min-w-0 pr-2">
            {fila.nombre}
            {!fila.disponible && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-semibold">Agotado</span>}
          </span>
          {preciosDeFila(fila).map((precio, j) => (
            <span key={j} className={`${columnas ? 'w-24' : ''} text-right font-semibold text-gold-700 shrink-0`}>{precio}</span>
          ))}
          <AccionesFila
            onEditar={onEditar ? () => onEditar(fila) : undefined}
            onQuitar={onQuitar ? () => onQuitar(fila) : undefined}
          />
        </div>
      ))}
      {filas.length === 0 && <p className="text-xs text-gray-300 text-center py-6">{vacio}</p>}
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────────────────────

type ModalState =
  | { abierto: false }
  | { abierto: true; fila?: FilaCarta; seccionDefault: SeccionCarta }

type ModalPromoState = { abierto: false } | { abierto: true; promo?: Promocion }

export default function CartaPublicaPage() {
  const { promociones, agregarPromo, actualizarPromo, eliminarPromo } = useCartaPublicaStore()
  const { productos, actualizarProducto } = useCartaStore()
  const esAdmin = useAuthStore((s) => s.usuario?.rol === 'admin')
  const [navActiva, setNavActiva]   = useState<string | null>(null)
  const [modal, setModal]           = useState<ModalState>({ abierto: false })
  const [modalPromo, setModalPromo] = useState<ModalPromoState>({ abierto: false })

  const scrollTo = (id: string) => {
    setNavActiva(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Solo admin puede editar (el backend lo exige); al resto se le ocultan los controles
  const agregarEn = (seccion: SeccionCarta) =>
    esAdmin ? () => setModal({ abierto: true, seccionDefault: seccion }) : undefined
  const editar = esAdmin ? (fila: FilaCarta) => setModal({ abierto: true, fila, seccionDefault: fila.seccion }) : undefined
  const quitar = esAdmin
    ? async (fila: FilaCarta) => {
        if (!confirm(`¿Quitar "${fila.nombre}" de la carta?\n\nEl producto sigue existiendo en Productos (para borrarlo del todo, hazlo desde allí).`)) return
        try {
          for (const p of fila.productos) await actualizarProducto(p.id, { seccionCarta: null })
        } catch (e) {
          alert(e instanceof ApiError ? e.message : 'No se pudo quitar')
        }
      }
    : undefined

  const tabla = (seccion: SeccionCarta, vacio: string) => (
    <TablaSeccion filas={filasDeSeccion(productos, seccion)} seccion={seccion} vacio={vacio} onEditar={editar} onQuitar={quitar} />
  )

  const totalPlatos = (Object.keys(SECCION_CFG) as SeccionCarta[])
    .reduce((acc, s) => acc + filasDeSeccion(productos, s).length, 0)

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Carta" subtitulo={`${totalPlatos} platos en la carta`} />

      {/* Nav de secciones */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex gap-1 px-4 py-2 overflow-x-auto">
          {SECCIONES_NAV.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                navActiva === s.id
                  ? 'bg-gold-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gold-100 hover:text-gold-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-24">

        {/* ── PROMOCIONES ────────────────────────────── */}
        <section id="promos">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🏷️</span>
            <h2 className="text-sm font-black tracking-widest text-black uppercase shrink-0">Promociones</h2>
            <div className="flex-1 h-px bg-gold-400" />
            {esAdmin && (
              <button
                onClick={() => setModalPromo({ abierto: true })}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-gold-50 border border-gold-300 text-gold-700 rounded-lg text-xs font-semibold hover:bg-gold-100 transition-colors"
              >
                <Plus size={12} />
                Nuevo descuento
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {promociones.map((p) => {
              const c = COLOR_PROMO[p.color] ?? COLOR_PROMO.gold
              return (
                <div
                  key={p.id}
                  className={`group relative rounded-xl px-3 py-2.5 flex items-start gap-2.5 ${c.card} ${p.activa ? '' : 'opacity-50'}`}
                  title={p.requisito ? `Requisito: ${p.requisito}` : undefined}
                >
                  <span className="text-xl leading-none mt-0.5">{p.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{p.nombre}</p>
                    {p.condicion && <p className={`text-[11px] truncate ${c.muted}`}>{p.condicion}</p>}
                    {p.requisito && <p className={`text-[11px] truncate ${c.muted}`}>{p.requisito}</p>}
                    {!p.activa && <p className="text-[11px] font-semibold">Inactivo</p>}
                  </div>
                  <span className={`shrink-0 text-sm font-black px-2 py-0.5 rounded-full ${c.chip}`}>{p.porcentaje}%</span>
                  {esAdmin && (
                    <button
                      onClick={() => setModalPromo({ abierto: true, promo: p })}
                      className={`absolute bottom-1.5 right-1.5 p-1 rounded-md ${c.chip} opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity`}
                      title="Editar descuento"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                </div>
              )
            })}
            {promociones.length === 0 && (
              <p className="text-xs text-gray-300 py-4 col-span-full text-center">Sin promociones</p>
            )}
          </div>
        </section>

        {/* ── PLATOS DE LA CASA ──────────────────────── */}
        <section id="platos">
          <SeccionHeader titulo="Platos de la Casa" emoji="🍽️" onAgregar={agregarEn('plato')} />
          {tabla('plato', 'Sin platos')}
        </section>

        {/* ── CHAUFAS ────────────────────────────────── */}
        <section id="chaufas">
          <SeccionHeader titulo="Chaufas" emoji="🍳" onAgregar={agregarEn('chaufa')} />
          {tabla('chaufa', 'Sin chaufas')}
        </section>

        {/* ── CALDOS ─────────────────────────────────── */}
        <section id="caldos">
          <SeccionHeader titulo="Caldos" emoji="🥣" onAgregar={agregarEn('caldo')} />
          {tabla('caldo', 'Sin caldos')}
        </section>

        {/* ── GUARNICIONES ───────────────────────────── */}
        <section id="guarniciones">
          <SeccionHeader titulo="Guarniciones" emoji="🌽" onAgregar={agregarEn('guarnicion')} />
          {tabla('guarnicion', 'Sin guarniciones')}

          <div className="mt-4">
            <SubSeccionHeader titulo="Extras" onAgregar={agregarEn('guarnicion_extra')} />
            {tabla('guarnicion_extra', 'Sin extras')}
          </div>
        </section>

        {/* ── BEBIDAS ────────────────────────────────── */}
        <section id="bebidas">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🥤</span>
            <h2 className="text-sm font-black tracking-widest text-black uppercase shrink-0">Bebidas</h2>
            <div className="flex-1 h-px bg-gold-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <SubSeccionHeader titulo="☕ Calientes" onAgregar={agregarEn('bebida_caliente')} />
              {tabla('bebida_caliente', 'Sin bebidas')}
            </div>
            <div>
              <SubSeccionHeader titulo="🫙 Jarras (1 Lt)" onAgregar={agregarEn('bebida_fria_jarra')} />
              {tabla('bebida_fria_jarra', 'Sin bebidas')}
            </div>
          </div>

          <div className="mt-4">
            <SubSeccionHeader titulo="🧃 Gaseosas y otros" onAgregar={agregarEn('bebida_fria_gaseosa')} />
            {tabla('bebida_fria_gaseosa', 'Sin bebidas')}
          </div>
        </section>

      </div>

      {/* FAB global */}
      {esAdmin && (
        <button
          onClick={() => setModal({ abierto: true, seccionDefault: 'plato' })}
          className="fixed bottom-20 right-5 lg:bottom-6 lg:right-6 z-30 w-12 h-12 bg-gold-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gold-700 transition-colors"
          title="Agregar plato a la carta"
        >
          <Plus size={22} />
        </button>
      )}

      {/* Modal */}
      {modal.abierto && (
        <ModalFilaCarta
          fila={modal.fila}
          seccionDefault={modal.seccionDefault}
          onCerrar={() => setModal({ abierto: false })}
        />
      )}

      {modalPromo.abierto && (
        <ModalPromo
          promo={modalPromo.promo}
          onGuardar={(datos) => {
            const promo = modalPromo.promo
            return promo ? actualizarPromo(promo.id, datos) : agregarPromo(datos)
          }}
          onEliminar={modalPromo.promo ? () => eliminarPromo(modalPromo.promo!.id) : undefined}
          onCerrar={() => setModalPromo({ abierto: false })}
        />
      )}
    </div>
  )
}
