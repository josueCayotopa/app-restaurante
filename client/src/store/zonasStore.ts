import { create } from 'zustand'
import { apiFetch } from '../lib/api'

export interface Zona {
  id: string
  nombre: string
}

interface ZonasState {
  zonas: Zona[]
  cargando: boolean
  cargarZonas: () => Promise<void>
  agregarZona: (nombre: string) => Promise<void>
  eliminarZona: (id: string) => Promise<void>
}

export const useZonasStore = create<ZonasState>((set, get) => ({
  zonas: [],
  cargando: false,

  cargarZonas: async () => {
    if (get().cargando) return
    set({ cargando: true })
    try {
      const zonas = await apiFetch<Zona[]>('/api/zonas')
      set({ zonas, cargando: false })
    } catch (e) {
      console.error('[zonas] Error cargando:', e)
      set({ cargando: false })
    }
  },

  agregarZona: async (nombre) => {
    const zona = await apiFetch<Zona>('/api/zonas', {
      method: 'POST',
      body: JSON.stringify({ nombre }),
    })
    set((s) => ({ zonas: [...s.zonas, zona].sort((a, b) => a.nombre.localeCompare(b.nombre)) }))
  },

  eliminarZona: async (id) => {
    await apiFetch(`/api/zonas/${id}`, { method: 'DELETE' })
    set((s) => ({ zonas: s.zonas.filter((z) => z.id !== id) }))
  },
}))
