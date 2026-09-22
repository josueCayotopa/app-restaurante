import { create } from 'zustand'
import { apiFetch } from '../lib/api'
import type { Producto, CategoriaProducto } from '../types'

interface CartaState {
  productos: Producto[]
  cargando: boolean
  cargarProductos: () => Promise<void>
  toggleDisponibilidad: (id: string) => void
  agregarProducto: (producto: Omit<Producto, 'id'>) => Promise<void>
  actualizarProducto: (id: string, datos: Partial<Producto>) => Promise<void>
  eliminarProducto: (id: string) => Promise<void>
  getByCategoria: (categoria: CategoriaProducto) => Producto[]
}

export const useCartaStore = create<CartaState>((set, get) => ({
  productos: [],
  cargando: false,

  cargarProductos: async () => {
    if (get().cargando) return
    set({ cargando: true })
    try {
      const productos = await apiFetch<Producto[]>('/api/productos')
      set({ productos, cargando: false })
    } catch (e) {
      console.error('[carta] Error cargando productos:', e)
      set({ cargando: false })
    }
  },

  toggleDisponibilidad: (id) => {
    const producto = get().productos.find((p) => p.id === id)
    if (!producto) return
    const disponible = !producto.disponible
    set((s) => ({ productos: s.productos.map((p) => (p.id === id ? { ...p, disponible } : p)) }))
    apiFetch(`/api/productos/${id}/disponibilidad`, {
      method: 'PATCH',
      body: JSON.stringify({ disponible }),
    }).catch((e) => console.error('[carta] Error actualizando disponibilidad:', e))
  },

  agregarProducto: async (producto) => {
    const creado = await apiFetch<Producto>('/api/productos', {
      method: 'POST',
      body: JSON.stringify(producto),
    })
    set((s) => ({ productos: [...s.productos, creado] }))
  },

  actualizarProducto: async (id, datos) => {
    const actualizado = await apiFetch<Producto>(`/api/productos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(datos),
    })
    set((s) => ({ productos: s.productos.map((p) => (p.id === id ? actualizado : p)) }))
  },

  eliminarProducto: async (id) => {
    await apiFetch(`/api/productos/${id}`, { method: 'DELETE' })
    set((s) => ({ productos: s.productos.filter((p) => p.id !== id) }))
  },

  getByCategoria: (categoria) =>
    get().productos.filter((p) => p.categoria === categoria),
}))
