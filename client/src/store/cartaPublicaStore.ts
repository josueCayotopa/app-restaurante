import { create } from 'zustand'
import { apiFetch } from '../lib/api'

// Los platos de la carta salen de los productos (ver lib/carta.ts); aquí solo viven las promociones.

export type ColorPromo = 'gold' | 'rojo' | 'steel' | 'green'

export interface Promocion {
  id: string          // se guarda en Comanda.tipoDescuento
  nombre: string
  emoji: string
  porcentaje: number
  condicion?: string | null
  requisito?: string | null
  color: ColorPromo
  activa: boolean
}

export type DatosPromo = Omit<Promocion, 'id'>

interface CartaPublicaState {
  promociones: Promocion[]
  cargarCarta:     () => Promise<void>
  agregarPromo:    (datos: DatosPromo) => Promise<void>
  actualizarPromo: (id: string, datos: DatosPromo) => Promise<void>
  eliminarPromo:   (id: string) => Promise<void>
}

export const useCartaPublicaStore = create<CartaPublicaState>((set) => ({
  promociones: [],

  cargarCarta: async () => {
    try {
      const promociones = await apiFetch<Promocion[]>('/api/carta/promociones')
      set({ promociones })
    } catch (e) {
      console.error('[carta] Error cargando promociones:', e)
    }
  },

  agregarPromo: async (datos) => {
    const promo = await apiFetch<Promocion>('/api/carta/promociones', { method: 'POST', body: JSON.stringify(datos) })
    set((s) => ({ promociones: [...s.promociones, promo] }))
  },
  actualizarPromo: async (id, datos) => {
    const promo = await apiFetch<Promocion>(`/api/carta/promociones/${id}`, { method: 'PATCH', body: JSON.stringify(datos) })
    set((s) => ({ promociones: s.promociones.map((p) => (p.id === id ? promo : p)) }))
  },
  eliminarPromo: async (id) => {
    await apiFetch(`/api/carta/promociones/${id}`, { method: 'DELETE' })
    set((s) => ({ promociones: s.promociones.filter((p) => p.id !== id) }))
  },
}))
