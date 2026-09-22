import { create } from 'zustand'
import { apiFetch } from '../lib/api'

export interface UsuarioSesion {
  id: string
  nombre: string
  email: string
  rol: string
}

interface AuthState {
  usuario: UsuarioSesion | null
  token: string | null
  cargando: boolean

  iniciarSesion: (email: string, password: string) => Promise<void>
  cerrarSesion: () => void
  verificarToken: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  token: localStorage.getItem('sgr_token'),
  cargando: false,

  iniciarSesion: async (email, password) => {
    set({ cargando: true })
    try {
      const { token, usuario } = await apiFetch<{ token: string; usuario: UsuarioSesion }>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) }
      )
      localStorage.setItem('sgr_token', token)
      set({ token, usuario, cargando: false })
    } catch (e) {
      set({ cargando: false })
      throw e
    }
  },

  cerrarSesion: () => {
    localStorage.removeItem('sgr_token')
    set({ token: null, usuario: null })
  },

  verificarToken: async () => {
    const token = localStorage.getItem('sgr_token')
    if (!token) { set({ usuario: null }); return }
    try {
      const usuario = await apiFetch<UsuarioSesion>('/api/auth/me')
      set({ usuario, token })
    } catch {
      localStorage.removeItem('sgr_token')
      set({ token: null, usuario: null })
    }
  },
}))
