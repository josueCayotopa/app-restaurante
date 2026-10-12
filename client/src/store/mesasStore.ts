import { create } from 'zustand'
import { apiFetch } from '../lib/api'
import type { Mesa, EstadoMesa, Zona } from '../types'
import { useToastStore } from './toastStore'
import { ApiError } from '../lib/api'

// Las uniones vienen del servidor (unidaA = mesa principal); aquí se arma principal ↔ secundarias
function conUniones(mesas: Mesa[]): Mesa[] {
  return mesas.map((m) => {
    const secundarias = mesas.filter((x) => x.unidaA === m.id).map((x) => x.id)
    return { ...m, mesaPrincipalId: m.unidaA ?? undefined, mesasUnidasIds: secundarias.length ? secundarias : undefined }
  })
}
const avisarError = (e: unknown, titulo: string) =>
  useToastStore.getState().agregar({ tipo: 'error', titulo, mensaje: e instanceof ApiError ? e.message : 'Sin conexión: intenta de nuevo', duracion: 6000 })

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
      // 'en_limpieza' ya no existe: si llega de datos antiguos se muestra como libre
      const mesas = conUniones((await apiFetch<Mesa[]>('/api/mesas')).map((m) => ((m.estado as string) === 'en_limpieza' ? { ...m, estado: 'libre' as EstadoMesa } : m)))
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

  // Cambio hecho desde otro equipo (o al cobrar). Las mesas unidas las separa el servidor (aviso mesas:actualizadas).
  aplicarEstadoRemoto: (id, estado) => {
    if ((estado as string) === 'en_limpieza') estado = 'libre'
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

  // Se ve al instante; el servidor lo guarda y avisa a todas las pantallas
  unirMesas: (principalId, secundariaId) => {
    set((s) => ({
      mesas: conUniones(s.mesas.map((m) => (m.id === secundariaId ? { ...m, estado: 'unida' as EstadoMesa, unidaA: principalId } : m))),
    }))
    apiFetch(`/api/mesas/${principalId}/unir`, { method: 'POST', body: JSON.stringify({ secundariaId }) })
      .catch((e) => { avisarError(e, 'No se pudieron unir las mesas'); get().cargarMesas() })
  },

  separarMesa: (principalId) => {
    set((s) => ({
      mesas: conUniones(s.mesas.map((m) => (m.unidaA === principalId ? { ...m, estado: 'libre' as EstadoMesa, unidaA: null } : m))),
    }))
    apiFetch(`/api/mesas/${principalId}/separar`, { method: 'POST', body: '{}' })
      .catch((e) => { avisarError(e, 'No se pudieron separar las mesas'); get().cargarMesas() })
  },
}))
