import { useEffect, useState } from 'react'
import Header from '../../components/layout/Header'
import { useUsuariosStore, type Usuario, type Rol, type DatosUsuario } from '../../store/usuariosStore'
import { useZonasStore } from '../../store/zonasStore'
import { useAuthStore } from '../../store/authStore'
import { RUTAS_POR_ROL } from '../../lib/permisos'
import { ApiError } from '../../lib/api'
import {
  User, Mail, Plus, Edit2, X, Check, KeyRound, Eye, EyeOff, CheckCircle2, XCircle, MapPin, Loader2,
} from 'lucide-react'

// ─── Configuraciones ──────────────────────────────────────────────────────────

// Fondo SÓLIDO + texto con contraste (dorado → oscuro, el resto → blanco)
const ROL_CONFIG: Record<Rol, { label: string; badgeBg: string; badgeText: string; emoji: string }> = {
  admin:     { label: 'Administrador', badgeBg: 'bg-rojo-500',  badgeText: 'text-white',    emoji: '👑' },
  cajero:    { label: 'Cajero',        badgeBg: 'bg-gold-500',  badgeText: 'text-gray-900', emoji: '💰' },
  mozo:      { label: 'Mozo',          badgeBg: 'bg-gold-500',  badgeText: 'text-gray-900', emoji: '🍽️' },
  cocinero:  { label: 'Cocinero',      badgeBg: 'bg-rojo-500',  badgeText: 'text-white',    emoji: '👨‍🍳' },
  bartender: { label: 'Bartender',     badgeBg: 'bg-steel-500', badgeText: 'text-white',    emoji: '🍹' },
}

// Módulos por ruta, para el preview de permisos (sale de lib/permisos.ts: misma fuente que el login)
const MODULOS: { ruta: string; label: string }[] = [
  { ruta: '/', label: 'Mesas' }, { ruta: '/comandas', label: 'Comandas' }, { ruta: '/cocina', label: 'Cocina' },
  { ruta: '/bar', label: 'Bar' }, { ruta: '/caja', label: 'Caja' }, { ruta: '/carta', label: 'Carta' },
  { ruta: '/menu', label: 'Productos' }, { ruta: '/reservas', label: 'Reservas' }, { ruta: '/inventario', label: 'Inventario' },
  { ruta: '/proveedores', label: 'Proveedores' }, { ruta: '/usuarios', label: 'Usuarios' }, { ruta: '/reportes', label: 'Reportes' },
]

const ROLES: Rol[] = ['admin', 'cajero', 'mozo', 'cocinero', 'bartender']

const modulosDeRol = (rol: Rol) => MODULOS.filter((m) => (RUTAS_POR_ROL[rol] ?? []).includes(m.ruta))

// "maria@cade.pe" → "maria" (el personal entra con el usuario corto)
export const usuarioCorto = (email: string) => email.replace(/@cade\.pe$/, '')

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
}

// ─── Modal Usuario ────────────────────────────────────────────────────────────

function ModalUsuario({ usuario, onCerrar }: { usuario?: Usuario; onCerrar: () => void }) {
  const { agregarUsuario, actualizarUsuario } = useUsuariosStore()
  const zonasDisponibles = useZonasStore((s) => s.zonas)
  const [form, setForm] = useState({
    nombre:   usuario?.nombre ?? '',
    email:    usuario ? usuarioCorto(usuario.email) : '',
    cargo:    usuario?.cargo ?? '',
    rol:      usuario?.rol ?? ('mozo' as Rol),
    zonas:    usuario?.zonas ?? ([] as string[]),
    password: '',
  })
  const [mostrarPass, setMostrarPass] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const toggleZona = (nombre: string) => {
    setForm((f) => ({
      ...f,
      zonas: f.zonas.includes(nombre) ? f.zonas.filter((z) => z !== nombre) : [...f.zonas, nombre],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardando(true); setError('')
    try {
      const { password, ...resto } = form
      if (usuario) {
        // Contraseña vacía al editar = no se cambia
        await actualizarUsuario(usuario.id, password ? { ...resto, password } : resto)
      } else {
        const datos: DatosUsuario = { ...resto, password, activo: true }
        await agregarUsuario(datos)
      }
      onCerrar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar')
      setGuardando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">{usuario ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>
        <form className="overflow-y-auto flex-1 p-6 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="ej. María"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cargo</label>
              <input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                placeholder="ej. Encargada de salón"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Usuario para ingresar *</label>
              <input required value={form.email} autoCapitalize="none" autoCorrect="off"
                onChange={(e) => setForm({ ...form, email: e.target.value.replace(/\s/g, '').toLowerCase() })}
                placeholder="ej. maria (sin tildes ni espacios)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Rol *</label>
              <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500">
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROL_CONFIG[r].emoji} {ROL_CONFIG[r].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {usuario ? 'Nueva contraseña' : 'Contraseña *'}
              </label>
              <div className="relative">
                <input required={!usuario} minLength={4} type={mostrarPass ? 'text' : 'password'}
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={usuario ? 'Dejar vacío = no cambia' : 'Mínimo 4 caracteres'}
                  autoComplete="new-password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500 pr-9" />
                <button type="button" onClick={() => setMostrarPass(!mostrarPass)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  {mostrarPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {/* Preview permisos según rol */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Lo que verá un <strong>{ROL_CONFIG[form.rol].label}</strong></p>
            <div className="flex flex-wrap gap-1.5">
              {MODULOS.map((m) => {
                const tiene = (RUTAS_POR_ROL[form.rol] ?? []).includes(m.ruta)
                return (
                  <span key={m.ruta} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                    tiene ? 'bg-gold-500 text-gray-900' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {tiene ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                    {m.label}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Zonas asignadas */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
              <MapPin size={12} /> Zonas que atiende
            </p>
            {zonasDisponibles.length === 0 ? (
              <p className="text-xs text-gray-400">No hay zonas creadas todavía (se gestionan desde Mesas → Zonas).</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {zonasDisponibles.map((z) => {
                  const activa = form.zonas.includes(z.nombre)
                  return (
                    <button key={z.id} type="button" onClick={() => toggleZona(z.nombre)}
                      className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold border transition-colors ${
                        activa ? 'bg-gold-500 border-gold-500 text-gray-900' : 'border-gray-200 text-gray-500 hover:border-gold-300'
                      }`}>
                      {activa && <Check size={10} />}
                      {z.nombre}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCerrar}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={guardando}
              className="flex-1 py-2.5 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 flex items-center justify-center gap-2 disabled:opacity-60">
              {guardando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {usuario ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Tarjeta Usuario ──────────────────────────────────────────────────────────

function TarjetaUsuario({ usuario, esYo, onEditar }: { usuario: Usuario; esYo: boolean; onEditar: () => void }) {
  const actualizarUsuario = useUsuariosStore((s) => s.actualizarUsuario)
  const rolCfg = ROL_CONFIG[usuario.rol] ?? ROL_CONFIG.mozo
  const modulos = modulosDeRol(usuario.rol)
  const [cambiando, setCambiando] = useState(false)

  const toggleActivo = async () => {
    const accion = usuario.activo ? 'desactivar' : 'activar'
    if (usuario.activo && !confirm(`¿Desactivar a ${usuario.nombre}? Ya no podrá iniciar sesión.`)) return
    setCambiando(true)
    try {
      await actualizarUsuario(usuario.id, { activo: !usuario.activo })
    } catch (err) {
      alert(err instanceof ApiError ? err.message : `No se pudo ${accion}`)
    } finally {
      setCambiando(false)
    }
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 ${usuario.activo ? '' : 'opacity-60'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
            usuario.activo ? `${rolCfg.badgeBg} ${rolCfg.badgeText}` : 'bg-gray-300 text-white'
          }`}>
            {iniciales(usuario.nombre)}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-800 text-sm truncate">
              {usuario.nombre} {esYo && <span className="text-xs font-normal text-gray-400">(tú)</span>}
            </h3>
            {usuario.cargo && <p className="text-xs text-gray-500 truncate">{usuario.cargo}</p>}
            <p className="flex items-center gap-1 text-xs text-gray-500 truncate">
              <Mail size={11} className="text-gray-400 shrink-0" />usuario: <strong className="font-semibold">{usuarioCorto(usuario.email)}</strong>
            </p>
          </div>
        </div>
        <button onClick={onEditar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400" title="Editar">
          <Edit2 size={14} />
        </button>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${rolCfg.badgeBg} ${rolCfg.badgeText}`}>
          <span>{rolCfg.emoji}</span> {rolCfg.label}
        </span>
        {!usuario.activo && (
          <span className="text-xs px-2 py-1 rounded-full font-semibold bg-red-500 text-white">Inactivo</span>
        )}
        {usuario.zonas.map((z) => (
          <span key={z} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
            <MapPin size={10} /> {z}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        {modulos.slice(0, 5).map((m) => (
          <span key={m.ruta} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">{m.label}</span>
        ))}
        {modulos.length > 5 && (
          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">+{modulos.length - 5} más</span>
        )}
      </div>

      {!esYo && (
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button onClick={toggleActivo} disabled={cambiando}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-60 ${
              usuario.activo ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-600 text-white hover:bg-green-700'
            }`}>
            {usuario.activo ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const { usuarios, cargando, cargarUsuarios } = useUsuariosStore()
  const miId = useAuthStore((s) => s.usuario?.id)
  const [rolFiltro, setRolFiltro] = useState<Rol | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<{ abierto: boolean; usuario?: Usuario }>({ abierto: false })

  useEffect(() => { cargarUsuarios() }, [cargarUsuarios])

  const usuariosFiltrados = usuarios.filter((u) => {
    const matchRol = rolFiltro === 'todos' || u.rol === rolFiltro
    const matchBusq = `${u.nombre} ${u.email}`.toLowerCase().includes(busqueda.toLowerCase())
    return matchRol && matchBusq
  })

  const activos = usuarios.filter((u) => u.activo).length

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Usuarios y Roles" subtitulo={`${activos} activos de ${usuarios.length} usuarios`} />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* KPIs por rol (también filtran) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {ROLES.map((rol) => {
            const cfg = ROL_CONFIG[rol]
            const count = usuarios.filter((u) => u.rol === rol && u.activo).length
            return (
              <button key={rol} onClick={() => setRolFiltro(rol === rolFiltro ? 'todos' : rol)}
                className={`rounded-xl px-3 py-2.5 text-left transition-all ${cfg.badgeBg} ${
                  rolFiltro === rol ? 'ring-2 ring-offset-2 ring-gold-500' : 'hover:brightness-105'
                }`}>
                <p className={`text-sm font-semibold ${cfg.badgeText}`}>{cfg.emoji} {cfg.label}</p>
                <p className={`text-xs ${cfg.badgeText} opacity-80`}>{count} activo{count !== 1 ? 's' : ''}</p>
              </button>
            )
          })}
        </div>

        {/* Barra de herramientas */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar usuario..."
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold-500 bg-white" />
          </div>
          {rolFiltro !== 'todos' && (
            <button onClick={() => setRolFiltro('todos')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gold-600 text-white">
              {ROL_CONFIG[rolFiltro].label} <X size={12} />
            </button>
          )}
          <button onClick={() => setModal({ abierto: true })}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-colors">
            <Plus size={15} /> Nuevo usuario
          </button>
        </div>

        {/* Grid de usuarios */}
        {cargando && usuarios.length === 0 ? (
          <div className="flex justify-center py-12 text-gray-300"><Loader2 className="animate-spin" /></div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-300">
            <User size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Sin usuarios</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {usuariosFiltrados.map((u) => (
              <TarjetaUsuario key={u.id} usuario={u} esYo={u.id === miId}
                onEditar={() => setModal({ abierto: true, usuario: u })} />
            ))}
          </div>
        )}

        <p className="flex items-center gap-1.5 text-xs text-gray-400">
          <KeyRound size={12} /> Cada persona entra con su email y contraseña. Desactivar a alguien le quita el acceso sin borrar su historial.
        </p>
      </div>

      {modal.abierto && (
        <ModalUsuario usuario={modal.usuario} onCerrar={() => setModal({ abierto: false })} />
      )}
    </div>
  )
}
