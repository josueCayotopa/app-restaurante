import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react'
import { esErrorDeRed } from '../../lib/api'

const CREDENCIALES_KEY = 'sgr_credenciales'

function leerCredencialesGuardadas(): { email: string; password: string } | null {
  try {
    const raw = localStorage.getItem(CREDENCIALES_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function LoginPage() {
  const { iniciarSesion, cargando, usuario } = useAuthStore()
  const navigate = useNavigate()
  const guardadas = leerCredencialesGuardadas()
  const [form, setForm] = useState({ email: guardadas?.email ?? '', password: guardadas?.password ?? '' })
  const [recordar, setRecordar] = useState(!!guardadas)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (usuario) navigate('/', { replace: true })
  }, [usuario, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await iniciarSesion(form.email, form.password)
      if (recordar) {
        localStorage.setItem(CREDENCIALES_KEY, JSON.stringify({ email: form.email, password: form.password }))
      } else {
        localStorage.removeItem(CREDENCIALES_KEY)
      }
      navigate('/', { replace: true })
    } catch (err) {
      // Sin respuesta del servidor (caído, sin internet, certificado) → mensaje claro, no el error técnico
      setError(esErrorDeRed(err)
        ? 'No se puede conectar con el servidor. Revisa tu conexión o avisa al administrador.'
        : err instanceof Error ? err.message : 'Error al iniciar sesión')
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <img
            src="/logo.jpeg"
            alt="Chicharronería CADE"
            className="w-full h-24 object-contain"
          />
          </div>
        </div>

  
     

       
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 shadow-2xl">
          <h2 className="text-white text-lg font-bold mb-6 text-center">Iniciar sesión</h2>

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-950/60 border border-red-800 rounded-lg px-3 py-2.5 text-sm mb-4">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                Usuario
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-gold-500 transition-colors"
                  placeholder="ej. maria"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                Contraseña
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-gold-500 transition-colors"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-400 select-none cursor-pointer">
              <input
                type="checkbox"
                checked={recordar}
                onChange={(e) => setRecordar(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-gray-700 bg-gray-800 accent-gold-500"
              />
              Recordar contraseña
            </label>

            <button
              type="submit"
              disabled={cargando}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gold-500 hover:bg-gold-400 disabled:bg-gray-700 disabled:text-gray-500 text-gray-900 font-bold rounded-lg text-sm transition-colors mt-2"
            >
              {cargando ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-700 text-xs mt-4">
          Sistema de Gestión — CADE v1.0
        </p>
      </div>
    </div>
  )
}
