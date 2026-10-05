import { create } from 'zustand'
import { apiFetch } from '../lib/api'
import type { Mesa, EstadoMesa, Zona } from '../types'

interface MesasState {
  mesas: Mesa[]
  cargando: boolean
  mesaSeleccionada: Mesa | null
  cargarMesas: () => Promise<void>
  seleccionarMesa: (mesa: Mesa | null) => void
  cambiarEstado: (id: string, estado: EstadoMesa) => void
  actualizarMesas: (mesas: Mesa[]) => void
  aplicarEstadoRemoto: (id: string, estado: EstadoMesa) => void
  crearMesa: (datos: { numero: number; capacidad: number; zona: Zona }) => Promise<void>
  eliminarMesa: (id: string) => void
  unirMesas: (principalId: string, secundariaId: string) => void
  separarMesa: (principalId: string) => void
}

export const useMesasStore = create<MesasState>((set, get) => ({
  mesas: [],
  cargando: false,
  mesaSeleccionada: null,

  cargarMesas: async () => {
    if (get().cargando) return
    set({ cargando: true })
    try {
      const mesas = await apiFetch<Mesa[]>('/api/mesas')
      set({ mesas, cargando: false })
    } catch (e) {
      console.error('[mesas] Error cargando:', e)
      set({ cargando: false })
    }
  },

  seleccionarMesa: (mesa) => set({ mesaSeleccionada: mesa }),

  cambiarEstado: (id, estado) => {
    set((s) => ({ mesas: s.mesas.map((m) => (m.id === id ? { ...m, estado } : m)) }))
    apiFetch(`/api/mesas/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    }).catch((e) => console.error('[mesas] Error actualizando estado:', e))
  },

  actualizarMesas: (mesas) => set({ mesas }),

  // Cambio hecho desde otro equipo (o al cobrar). Si la mesa se libera, se separan las que estaban unidas.
  aplicarEstadoRemoto: (id, estado) => {
    if (estado === 'libre' && get().mesas.find((m) => m.id === id)?.mesasUnidasIds?.length) get().separarMesa(id)
    set((s) => ({ mesas: s.mesas.map((m) => (m.id === id ? { ...m, estado } : m)) }))
  },

  crearMesa: async ({ numero, capacidad, zona }) => {
    const nueva = await apiFetch<Mesa>('/api/mesas', {
      method: 'POST',
      body: JSON.stringify({ numero, capacidad, zona }),
    })
    set((s) => ({ mesas: [...s.mesas, nueva] }))
  },

  eliminarMesa: (id) => {
    set((s) => ({ mesas: s.mesas.filter((m) => m.id !== id) }))
    apiFetch(`/api/mesas/${id}`, { method: 'DELETE' })
      .catch((e) => console.error('[mesas] Error eliminando:', e))
  },

  unirMesas: (principalId, secundariaId) =>
    set((s) => ({
      mesas: s.mesas.map((m) => {
        if (m.id === principalId) {
          const yaUnidas = m.mesasUnidasIds ?? []
          if (yaUnidas.includes(secundariaId)) return m
          return { ...m, mesasUnidasIds: [...yaUnidas, secundariaId] }
        }
        if (m.id === secundariaId) {
          return { ...m, estado: 'unida', mesaPrincipalId: principalId }
        }
        return m
      }),
    })),

  separarMesa: (principalId) =>
    set((s) => {
      const principal = s.mesas.find((m) => m.id === principalId)
      const idsSecundarias = principal?.mesasUnidasIds ?? []
      return {
        mesas: s.mesas.map((m) => {
          if (m.id === principalId) {
            return { ...m, mesasUnidasIds: undefined }
          }
          if (idsSecundarias.includes(m.id)) {
            return { ...m, estado: 'libre', mesaPrincipalId: undefined }
          }
          return m
        }),
      }
    }),
}))
