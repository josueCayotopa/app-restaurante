import { create } from 'zustand'
import { apiFetch } from '../lib/api'
import type { AreaProduccion } from '../types'

export type ColorCategoria = 'gold' | 'gold_osc' | 'rojo' | 'rojo_osc' | 'steel' | 'gris' | 'verde'

// Fondo sólido + texto con contraste (dorado claro → texto oscuro, el resto → blanco)
export const COLOR_CATEGORIA: Record<ColorCategoria, { label: string; clases: string }> = {
  gold:     { label: 'Dorado',        clases: 'bg-gold-500 text-gray-900' },
  gold_osc: { label: 'Dorado oscuro', clases: 'bg-gold-600 text-white'    },
  rojo:     { label: 'Rojo',          clases: 'bg-rojo-500 text-white'    },
  rojo_osc: { label: 'Rojo oscuro',   clases: 'bg-rojo-600 text-white'    },
  steel:    { label: 'Azul',          clases: 'bg-steel-500 text-white'   },
  gris:     { label: 'Gris',          clases: 'bg-gray-500 text-white'    },
  verde:    { label: 'Verde',         clases: 'bg-green-600 text-white'   },
}

export interface Categoria {
  id: string          // se guarda en Producto.categoria
  nombre: string
  emoji: string
  color: ColorCategoria
  area: AreaProduccion
}

export type DatosCategoria = Omit<Categoria, 'id'>

interface CategoriasState {
  categorias: Categoria[]
  cargarCategorias:   () => Promise<void>
  agregarCategoria:   (datos: DatosCategoria) => Promise<void>
  actualizarCategoria:(id: string, datos: DatosCategoria) => Promise<void>
  eliminarCategoria:  (id: string) => Promise<void>
}

export const useCategoriasStore = create<CategoriasState>((set) => ({
  categorias: [],

  cargarCategorias: async () => {
    try {
      const categorias = await apiFetch<Categoria[]>('/api/categorias')
      set({ categorias })
    } catch (e) {
      console.error('[categorias] Error cargando:', e)
    }
  },

  agregarCategoria: async (datos) => {
    const cat = await apiFetch<Categoria>('/api/categorias', { method: 'POST', body: JSON.stringify(datos) })
    set((s) => ({ categorias: [...s.categorias, cat] }))
  },
  actualizarCategoria: async (id, datos) => {
    const cat = await apiFetch<Categoria>(`/api/categorias/${id}`, { method: 'PATCH', body: JSON.stringify(datos) })
    set((s) => ({ categorias: s.categorias.map((c) => (c.id === id ? cat : c)) }))
  },
  eliminarCategoria: async (id) => {
    await apiFetch(`/api/categorias/${id}`, { method: 'DELETE' })
    set((s) => ({ categorias: s.categorias.filter((c) => c.id !== id) }))
  },
}))

// Área (cocina/bar) de un producto según su categoría; sin categoría conocida → cocina
export function areaDeCategoria(categorias: Categoria[], id: string): AreaProduccion {
  return categorias.find((c) => c.id === id)?.area ?? 'cocina'
}
