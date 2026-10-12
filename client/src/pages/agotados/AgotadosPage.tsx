import { useMemo, useState } from 'react'
import Header from '../../components/layout/Header'
import { useCartaStore } from '../../store/cartaStore'
import { useCategoriasStore, areaDeCategoria } from '../../store/categoriasStore'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { ApiError } from '../../lib/api'
import { estaAgotado } from '../../lib/agotados'
import type { Producto } from '../../types'
import { Search, Ban, CheckCircle2, ChefHat, Beer } from 'lucide-react'

type Area = 'cocina' | 'bar'

// Cocina y Bar marcan lo que se terminó por hoy (sin crear ni editar productos).
// Al marcarlo, todas las tablets lo ven tachado al tomar pedidos y no se puede pedir.
export default function AgotadosPage() {
  const productos = useCartaStore((s) => s.productos)
  const marcarAgotado = useCartaStore((s) => s.marcarAgotado)
  const categorias = useCategoriasStore((s) => s.categorias)
  const rol = useAuthStore((s) => s.usuario?.rol)
  // Cocina ve lo suyo, Bar lo suyo; admin y caja eligen
  const areaFija: Area | null = rol === 'cocinero' ? 'cocina' : rol === 'bartender' ? 'bar' : null
  const [areaElegida, setAreaElegida] = useState<Area>('cocina')
  const area = areaFija ?? areaElegida
  const [busqueda, setBusqueda] = useState('')
  const [enviando, setEnviando] = useState<string | null>(null)

  const delArea = useMemo(
    () => productos.filter((p) => p.disponible && areaDeCategoria(categorias, p.categoria) === area),
    [productos, categorias, area],
  )
  const agotados = delArea.filter((p) => estaAgotado(p))
  const filtrados = delArea.filter((p) => !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  // Agrupados por categoría, en el orden de las categorías
  const grupos = categorias
    .filter((c) => c.area === area || (!c.area && area === 'cocina'))
    .map((c) => ({ cat: c, items: filtrados.filter((p) => p.categoria === c.id).sort((a, b) => a.nombre.localeCompare(b.nombre)) }))
    .filter((g) => g.items.length > 0)

  const cambiar = async (p: Producto) => {
    if (enviando) return
    setEnviando(p.id)
    const agotar = !estaAgotado(p)
    try {
      await marcarAgotado(p.id, agotar)
      useToastStore.getState().agregar({
        tipo: agotar ? 'error' : 'success',
        titulo: agotar ? `🚫 ${p.nombre}: se terminó` : `✅ ${p.nombre}: hay de nuevo`,
        mensaje: agotar ? 'Ya no se puede pedir por hoy' : 'Ya se puede pedir',
        duracion: 3000,
      })
    } catch (e) {
      useToastStore.getState().agregar({ tipo: 'error', titulo: 'No se pudo cambiar', mensaje: e instanceof ApiError ? e.message : 'Sin conexión: intenta de nuevo', duracion: 5000 })
    } finally {
      setEnviando(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Agotados de hoy" subtitulo="Marca lo que se terminó: los mozos lo verán tachado al instante" />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {/* Área y búsqueda */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          {!areaFija && (
            <div className="flex bg-white border border-gray-200 rounded-xl p-1 shrink-0">
              {(['cocina', 'bar'] as Area[]).map((a) => (
                <button key={a} onClick={() => setAreaElegida(a)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold ${area === a ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-800'}`}>
                  {a === 'cocina' ? <ChefHat size={15} /> : <Beer size={15} />} {a === 'cocina' ? 'Cocina' : 'Bar'}
                </button>
              ))}
            </div>
          )}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar plato o bebida..."
              className="w-full pl-9 pr-3 py-3 bg-white border border-gray-200 rounded-xl text-base focus:outline-none focus:border-gold-500" />
          </div>
        </div>

        {/* Resumen de lo agotado */}
        <div className={`rounded-xl px-4 py-3 ${agotados.length ? 'bg-red-500' : 'bg-green-600'}`}>
          <p className="text-sm font-bold text-white">
            {agotados.length ? `${agotados.length} agotado(s) hoy` : 'Hay de todo: nada agotado hoy'}
          </p>
          {agotados.length > 0 && (
            <p className="text-sm text-white/90 mt-0.5">{agotados.map((p) => p.nombre).join(' · ')}</p>
          )}
        </div>

        {grupos.length === 0 && (
          <p className="text-center py-12 text-gray-400 text-sm">No hay productos{busqueda ? ' con ese nombre' : ''}</p>
        )}

        {grupos.map(({ cat, items }) => (
          <div key={cat.id}>
            <h2 className="text-sm font-bold text-gray-600 mb-2">{cat.emoji} {cat.nombre}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {items.map((p) => {
                const agotado = estaAgotado(p)
                return (
                  <button key={p.id} onClick={() => cambiar(p)} disabled={enviando === p.id}
                    className={`flex items-center gap-3 text-left px-4 min-h-16 py-3 rounded-xl border-2 transition-colors disabled:opacity-60 ${
                      agotado ? 'bg-red-50 border-red-400' : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-base font-semibold truncate ${agotado ? 'line-through decoration-2 decoration-red-500 text-gray-500' : 'text-gray-800'}`}>
                        {p.nombre}
                      </span>
                      <span className="block text-xs text-gray-400">S/ {p.precio.toFixed(2)}</span>
                    </span>
                    {agotado ? (
                      <span className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-bold">
                        <Ban size={16} /> Agotado
                      </span>
                    ) : (
                      <span className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-bold">
                        <CheckCircle2 size={16} /> Hay
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}

        <p className="text-xs text-gray-400 text-center pt-2">
          Toca un producto para marcarlo como agotado o volver a habilitarlo. Mañana todo vuelve a estar disponible solo.
        </p>
      </div>
    </div>
  )
}
