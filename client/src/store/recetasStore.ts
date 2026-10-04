import { create } from 'zustand'
import { apiFetch } from '../lib/api'
import { socket } from '../lib/socket'

export interface LineaReceta {
  insumoId: string
  cantidad: number   // por UNA unidad del producto, en la unidad del insumo
  insumo: { id: string; nombre: string; unidad: string; stockActual: number; precioUnitario: number }
}

export interface Receta {
  lineas: LineaReceta[]
  costo: number              // costo de insumos por unidad vendida
  porciones: number | null   // cuántas alcanzan con el stock actual
  limitante: string | null   // el insumo que se acaba primero
}

interface RecetasState {
  recetas: Record<string, Receta>   // por productoId
  cargar:  () => Promise<void>
  guardar: (productoId: string, lineas: { insumoId: string; cantidad: number }[]) => Promise<void>
}

export const useRecetasStore = create<RecetasState>((set) => ({
  recetas: {},
  cargar: async () => set({ recetas: await apiFetch<Record<string, Receta>>('/api/recetas') }),
  guardar: async (productoId, lineas) => {
    const r = await apiFetch<Receta>(`/api/recetas/${productoId}`, { method: 'PUT', body: JSON.stringify({ lineas }) })
    set((s) => {
      const recetas = { ...s.recetas }
      if (r.lineas.length) recetas[productoId] = r
      else delete recetas[productoId]
      return { recetas }
    })
  },
}))

// Cada venta mueve el stock: se refrescan las porciones disponibles
socket.on('inventario:actualizado', () => { useRecetasStore.getState().cargar().catch(() => {}) })
