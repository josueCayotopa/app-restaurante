import { create } from 'zustand'
import { apiFetch } from '../lib/api'

// Debe coincidir con los roles reales del backend (server/prisma/schema.prisma y lib/permisos.ts)
export type Rol = 'admin' | 'cajero' | 'mozo' | 'cocinero' | 'bartender'

export interface Usuario {
  id: string
  nombre: string
  email: string      // usuario de ingreso: "maria" se guarda como "maria@cade.pe"
  cargo?: string | null   // puesto real (ej. "Encargada de salón"); el rol define los permisos
  rol: Rol
  activo: boolean
  zonas: string[]    // zonas del local que atiende (ej. mozo -> ["Salón","Terraza"])
  creadoEn?: string
}

export type DatosUsuario = Omit<Usuario, 'id' | 'creadoEn'> & { password?: string }

interface UsuariosState {
  usuarios: Usuario[]
  cargando: boolean
  cargarUsuarios:    () => Promise<void>
  agregarUsuario:    (datos: DatosUsuario) => Promise<void>
  actualizarUsuario: (id: string, datos: Partial<DatosUsuario>) => Promise<void>
}

export const useUsuariosStore = create<UsuariosState>((set) => ({
  usuarios: [],
  cargando: false,

  cargarUsuarios: async () => {
    set({ cargando: true })
    try {
      const usuarios = await apiFetch<Usuario[]>('/api/usuarios')
      set({ usuarios })
    } catch (e) {
      console.error('[usuarios] Error cargando:', e)
    } finally {
      set({ cargando: false })
    }
  },

  agregarUsuario: async (datos) => {
    const u = await apiFetch<Usuario>('/api/usuarios', { method: 'POST', body: JSON.stringify(datos) })
    set((s) => ({ usuarios: [...s.usuarios, u].sort((a, b) => a.nombre.localeCompare(b.nombre)) }))
  },

  actualizarUsuario: async (id, datos) => {
    const u = await apiFetch<Usuario>(`/api/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(datos) })
    set((s) => ({ usuarios: s.usuarios.map((x) => (x.id === id ? u : x)) }))
  },
}))
