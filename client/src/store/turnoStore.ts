import { create } from 'zustand'
import { apiFetch } from '../lib/api'

const MOZOS_DISPONIBLES = ['Carlos', 'Ana', 'Luis', 'María', 'Pedro']

interface TurnoState {
  activo: boolean
  turnoId: string | null
  iniciadoEn: string | null
  iniciadoPor: string | null
  mozosEnTurno: string[]
  mozosDisponibles: string[]

  cargarTurno:  () => Promise<void>
  iniciarTurno: (admin: string) => Promise<void>
  cerrarTurno:  () => Promise<void>
  toggleMozo:   (nombre: string) => void
  esMozoActivo: (nombre: string) => boolean
}

interface TurnoDto {
  id: string
  estado: string
  iniciadoPor: string
  mozos: string[]
  iniciadoEn: string
  cerradoEn?: string | null
}

export const useTurnoStore = create<TurnoState>((set, get) => ({
  activo: false,
  turnoId: null,
  iniciadoEn: null,
  iniciadoPor: null,
  mozosEnTurno: [],
  mozosDisponibles: MOZOS_DISPONIBLES,

  cargarTurno: async () => {
    try {
      const turno = await apiFetch<TurnoDto | null>('/api/turnos/activo')
      if (turno) {
        set({
          activo: true,
          turnoId: turno.id,
          iniciadoEn: turno.iniciadoEn,
          iniciadoPor: turno.iniciadoPor,
          mozosEnTurno: turno.mozos,
        })
      } else {
        set({ activo: false, turnoId: null, iniciadoEn: null, iniciadoPor: null, mozosEnTurno: [] })
      }
    } catch (e) {
      console.error('[turno] Error cargando:', e)
    }
  },

  iniciarTurno: async (admin) => {
    try {
      const turno = await apiFetch<TurnoDto>('/api/turnos/iniciar', {
        method: 'POST',
        body: JSON.stringify({ iniciadoPor: admin, mozos: [] }),
      })
      set({
        activo: true,
        turnoId: turno.id,
        iniciadoEn: turno.iniciadoEn,
        iniciadoPor: turno.iniciadoPor,
        mozosEnTurno: turno.mozos,
      })
    } catch (e) {
      console.error('[turno] Error iniciando:', e)
      // Fallback local
      set({ activo: true, turnoId: null, iniciadoEn: new Date().toISOString(), iniciadoPor: admin, mozosEnTurno: [] })
    }
  },

  cerrarTurno: async () => {
    const { turnoId } = get()
    try {
      if (turnoId) {
        await apiFetch('/api/turnos/cerrar', { method: 'POST' })
      }
    } catch (e) {
      console.error('[turno] Error cerrando:', e)
    } finally {
      set({ activo: false, turnoId: null, iniciadoEn: null, iniciadoPor: null, mozosEnTurno: [] })
    }
  },

  toggleMozo: (nombre) => {
    const { turnoId, mozosEnTurno } = get()
    const prevMozos = mozosEnTurno
    set((s) => ({
      mozosEnTurno: s.mozosEnTurno.includes(nombre)
        ? s.mozosEnTurno.filter((m) => m !== nombre)
        : [...s.mozosEnTurno, nombre],
    }))
    if (!turnoId) return
    apiFetch<TurnoDto>(`/api/turnos/${turnoId}/mozos`, {
      method: 'PATCH',
      body: JSON.stringify({ nombre }),
    })
      .then((turno) => set({ mozosEnTurno: turno.mozos }))
      .catch((e) => {
        console.error('[turno] Error toggle mozo:', e)
        set({ mozosEnTurno: prevMozos })
      })
  },

  esMozoActivo: (nombre) => get().mozosEnTurno.includes(nombre),
}))
