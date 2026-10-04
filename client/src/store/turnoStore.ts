import { create } from 'zustand'
import { apiFetch } from '../lib/api'
import { socket } from '../lib/socket'

export interface MozoTurno { id: string; nombre: string }

interface TurnoDto {
  id: string
  estado: string
  iniciadoPor: string
  iniciadoEn: string
  cerradoEn?: string | null
  mozos: MozoTurno[]
}

interface TurnoState {
  activo: boolean
  turnoId: string | null
  iniciadoEn: string | null
  iniciadoPor: string | null
  mozosEnTurno: MozoTurno[]
  mozosDisponibles: MozoTurno[]   // usuarios reales con rol mozo y activos

  cargarTurno:  () => Promise<void>
  iniciarTurno: (mozoIds?: string[]) => Promise<void>   // lanzan error con el motivo (solo admin)
  cerrarTurno:  () => Promise<void>
  toggleMozo:   (usuarioId: string) => Promise<void>
  estaEnTurno:  (usuarioId: string) => boolean
}

const vacio = { activo: false, turnoId: null, iniciadoEn: null, iniciadoPor: null, mozosEnTurno: [] }

export const useTurnoStore = create<TurnoState>((set, get) => {
  const aplicar = (t: TurnoDto | null) =>
    set(t && t.estado === 'activo'
      ? { activo: true, turnoId: t.id, iniciadoEn: t.iniciadoEn, iniciadoPor: t.iniciadoPor, mozosEnTurno: t.mozos }
      : vacio)

  return {
    ...vacio,
    mozosDisponibles: [],

    cargarTurno: async () => {
      try {
        const [turno, disponibles] = await Promise.all([
          apiFetch<TurnoDto | null>('/api/turnos/activo'),
          apiFetch<MozoTurno[]>('/api/turnos/mozos-disponibles'),
        ])
        aplicar(turno)
        set({ mozosDisponibles: disponibles })
      } catch (e) {
        console.error('[turno] Error cargando:', e)
      }
    },

    iniciarTurno: async (mozoIds = []) =>
      aplicar(await apiFetch<TurnoDto>('/api/turnos/iniciar', { method: 'POST', body: JSON.stringify({ mozos: mozoIds }) })),

    cerrarTurno: async () => {
      await apiFetch('/api/turnos/cerrar', { method: 'POST' })
      aplicar(null)
    },

    toggleMozo: async (usuarioId) => {
      const { turnoId } = get()
      if (!turnoId) return
      aplicar(await apiFetch<TurnoDto>(`/api/turnos/${turnoId}/mozos`, { method: 'PATCH', body: JSON.stringify({ usuarioId }) }))
    },

    estaEnTurno: (usuarioId) => get().mozosEnTurno.some((m) => m.id === usuarioId),
  }
})

// Si otro equipo abre/cierra el turno o cambia los mozos, todas las tablets se enteran al momento
socket.on('turno:actualizado', () => { useTurnoStore.getState().cargarTurno() })
