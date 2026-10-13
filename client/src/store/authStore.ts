import { create } from 'zustand'
import { apiFetch, ApiError } from '../lib/api'

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

// Último usuario confirmado por el servidor: permite seguir trabajando si al abrir la app
// no hay WiFi (la sesión solo se cierra cuando el servidor dice que ya no es válida)
const CLAVE_USUARIO = 'sgr_usuario'
const guardarUsuario = (u: UsuarioSesion | null) => {
  try { u ? localStorage.setItem(CLAVE_USUARIO, JSON.stringify(u)) : localStorage.removeItem(CLAVE_USUARIO) } catch { /* sin almacenamiento */ }
}
const usuarioGuardado = (): UsuarioSesion | null => {
  try { return JSON.parse(localStorage.getItem(CLAVE_USUARIO) ?? 'null') } catch { return null }
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
      guardarUsuario(usuario)
      set({ token, usuario, cargando: false })
    } catch (e) {
      set({ cargando: false })
      throw e
    }
  },

  cerrarSesion: () => {
    localStorage.removeItem('sgr_token')
    guardarUsuario(null)
    set({ token: null, usuario: null })
  },

  verificarToken: async () => {
    const token = localStorage.getItem('sgr_token')
    if (!token) { set({ usuario: null }); return }
    try {
      const usuario = await apiFetch<UsuarioSesion>('/api/auth/me')
      guardarUsuario(usuario)
      set({ usuario, token })
    } catch (e) {
      // Sesión vencida o usuario desactivado → al login
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        localStorage.removeItem('sgr_token')
        guardarUsuario(null)
        set({ token: null, usuario: null })
        return
      }
      // Sin red / servidor lento: se sigue con el último usuario conocido (se revalida al volver la conexión)
      const previo = usuarioGuardado()
      set(previo ? { usuario: previo, token } : { token: null, usuario: null })
    }
  },
}))
