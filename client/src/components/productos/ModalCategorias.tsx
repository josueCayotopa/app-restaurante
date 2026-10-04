import { useState } from 'react'
import { X, Plus, Check, Edit2, Trash2, Loader2, ChefHat, Beer } from 'lucide-react'
import { ApiError } from '../../lib/api'
import { useCartaStore } from '../../store/cartaStore'
import {
  useCategoriasStore, COLOR_CATEGORIA,
  type Categoria, type DatosCategoria, type ColorCategoria,
} from '../../store/categoriasStore'

const EMOJIS = ['🍽️', '🥗', '🥩', '🍖', '🐟', '🍗', '🍲', '🍳', '🍚', '🌽', '🍟', '🥤', '🍺', '🍷', '☕', '🍮', '🍰', '⭐']

const VACIO: DatosCategoria = { nombre: '', emoji: '🍽️', color: 'gold', area: 'cocina' }

export default function ModalCategorias({ onCerrar }: { onCerrar: () => void }) {
  const { categorias, agregarCategoria, actualizarCategoria, eliminarCategoria } = useCategoriasStore()
  const productos = useCartaStore((s) => s.productos)
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [form, setForm]         = useState<DatosCategoria>(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]       = useState('')

  const usos = (id: string) => productos.filter((p) => p.categoria === id).length

  const empezarEdicion = (c: Categoria) => {
    setEditando(c); setError('')
    setForm({ nombre: c.nombre, emoji: c.emoji, color: c.color, area: c.area })
  }
  const cancelarEdicion = () => { setEditando(null); setForm(VACIO); setError('') }

  const ejecutar = async (accion: () => Promise<void>) => {
    setGuardando(true); setError('')
    try { await accion(); cancelarEdicion() }
    catch (err) { setError(err instanceof ApiError ? err.message : 'No se pudo guardar') }
    finally { setGuardando(false) }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    ejecutar(() => (editando ? actualizarCategoria(editando.id, form) : agregarCategoria(form)))
  }

  const handleEliminar = (c: Categoria) => {
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return
    ejecutar(() => eliminarCategoria(c.id))
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-800">Categorías de productos</h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 overflow-y-auto md:overflow-hidden">
          {/* ── Lista ── */}
          <div className="p-5 md:overflow-y-auto md:border-r border-gray-100 space-y-1.5">
            {categorias.map((c) => (
              <div key={c.id}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 ${COLOR_CATEGORIA[c.color]?.clases ?? COLOR_CATEGORIA.gris.clases} ${
                  editando?.id === c.id ? 'ring-2 ring-offset-2 ring-gold-500' : ''
                }`}>
                <span className="text-lg">{c.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{c.nombre}</p>
                  <p className="text-[11px] opacity-75">
                    {c.area === 'bar' ? 'Va a Bar' : 'Va a Cocina'} · {usos(c.id)} producto(s)
                  </p>
                </div>
                <button onClick={() => empezarEdicion(c)} className="p-1.5 rounded-lg bg-black/10 hover:bg-black/20" title="Editar">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => handleEliminar(c)} disabled={guardando} className="p-1.5 rounded-lg bg-black/10 hover:bg-black/20" title="Eliminar">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {categorias.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Sin categorías</p>}
          </div>

          {/* ── Formulario ── */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
              {editando ? `Editar "${editando.nombre}"` : 'Nueva categoría'}
            </p>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="ej. Pescados"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">¿A dónde va el pedido?</label>
              <div className="grid grid-cols-2 gap-2">
                {([['cocina', 'Cocina', ChefHat], ['bar', 'Bar', Beer]] as const).map(([valor, label, Icon]) => (
                  <button key={valor} type="button" onClick={() => setForm({ ...form, area: valor })}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      form.area === valor ? 'bg-gold-500 text-gray-900' : 'border border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ícono</label>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map((em) => (
                  <button key={em} type="button" onClick={() => setForm({ ...form, emoji: em })}
                    className={`w-8 h-8 rounded-lg text-base flex items-center justify-center border transition-colors ${
                      form.emoji === em ? 'border-gold-500 bg-gold-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(COLOR_CATEGORIA) as ColorCategoria[]).map((c) => (
                  <button key={c} type="button" title={COLOR_CATEGORIA[c].label} onClick={() => setForm({ ...form, color: c })}
                    className={`w-7 h-7 rounded-full ${COLOR_CATEGORIA[c].clases} ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-800' : ''}`} />
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1">
              {editando && (
                <button type="button" onClick={cancelarEdicion}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
              )}
              <button type="submit" disabled={guardando}
                className="flex-1 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {guardando ? <Loader2 size={15} className="animate-spin" /> : editando ? <Check size={15} /> : <Plus size={15} />}
                {editando ? 'Guardar cambios' : 'Crear categoría'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
