import { useState } from 'react'
import Header from '../../components/layout/Header'
import {
  useUsuariosStore, type Usuario, type Rol, type EstadoUsuario, PERMISOS_POR_ROL,
} from '../../store/usuariosStore'
import {
  User, Shield, Clock, Phone, Mail, Plus, Edit2, X, Check,
  LogIn, LogOut, KeyRound, Eye, EyeOff, CheckCircle2, XCircle,
} from 'lucide-react'

// ─── Configuraciones ──────────────────────────────────────────────────────────

// `color`/`bg` (tono suave) se usan en KPIs/filtros; `badgeBg`/`badgeText`
// (fondo SÓLIDO) en la insignia de rol dentro de cada tarjeta de usuario.
const ROL_CONFIG: Record<Rol, { label: string; color: string; bg: string; badgeBg: string; badgeText: string; emoji: string }> = {
  admin:     { label: 'Administrador', color: 'text-rojo-700', bg: 'bg-rojo-100', badgeBg: 'bg-rojo-500', badgeText: 'text-white',    emoji: '👑' },
  cajero:    { label: 'Cajero',        color: 'text-gold-700', bg: 'bg-gold-100', badgeBg: 'bg-gold-500', badgeText: 'text-gray-900', emoji: '💰' },
  mozo:      { label: 'Mozo',          color: 'text-gold-700', bg: 'bg-gold-100', badgeBg: 'bg-gold-500', badgeText: 'text-gray-900', emoji: '🍽️' },
  cocinero:  { label: 'Cocinero',      color: 'text-rojo-700', bg: 'bg-rojo-100', badgeBg: 'bg-rojo-500', badgeText: 'text-white',    emoji: '👨‍🍳' },
  bartender: { label: 'Bartender',     color: 'text-gray-700', bg: 'bg-gray-100', badgeBg: 'bg-steel-500', badgeText: 'text-white',   emoji: '🍹' },
}

const ESTADO_CONFIG: Record<EstadoUsuario, { label: string; color: string; dot: string }> = {
  en_turno: { label: 'En turno', color: 'text-gold-700', dot: 'bg-gold-500' },
  activo:   { label: 'Activo',   color: 'text-gray-500',    dot: 'bg-gray-400' },
  inactivo: { label: 'Inactivo', color: 'text-red-500',     dot: 'bg-red-400' },
}

const MODULOS_LABEL: Record<string, string> = {
  mesas: 'Mesas', comandas: 'Comandas', cocina: 'Cocina', bar: 'Bar', caja: 'Caja',
  carta: 'Carta', menu: 'Productos', reservas: 'Reservas', inventario: 'Inventario',
  reportes: 'Reportes', proveedores: 'Proveedores', usuarios: 'Usuarios',
}

const ROLES: Rol[] = ['admin', 'cajero', 'mozo', 'cocinero', 'bartender']

function avatarInicial(u: Usuario) {
  return `${u.nombre[0]}${u.apellido[0]}`.toUpperCase()
}

function tiempoEnTurno(entrada: string): string {
  const diff = Math.floor((Date.now() - new Date(entrada).getTime()) / 60000)
  if (diff < 60) return `${diff}min`
  return `${Math.floor(diff / 60)}h ${diff % 60}m`
}

// ─── Modal Usuario ────────────────────────────────────────────────────────────

function ModalUsuario({ usuario, onGuardar, onCerrar }: {
  usuario?: Usuario; onGuardar: (u: Omit<Usuario, 'id'>) => void; onCerrar: () => void
}) {
  const [form, setForm] = useState({
    nombre: usuario?.nombre ?? '',
    apellido: usuario?.apellido ?? '',
    email: usuario?.email ?? '',
    telefono: usuario?.telefono ?? '',
    rol: usuario?.rol ?? ('mozo' as Rol),
    estado: usuario?.estado ?? ('activo' as EstadoUsuario),
    pin: usuario?.pin ?? '',
    fechaIngreso: usuario?.fechaIngreso ?? new Date().toISOString().split('T')[0],
  })
  const [mostrarPin, setMostrarPin] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">{usuario ? 'Editar usuario' : 'Nuevo usuario'}</h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>
        <form className="overflow-y-auto flex-1 p-6 space-y-4"
          onSubmit={(e) => { e.preventDefault(); onGuardar(form) }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nombre *</label>
              <input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Apellido *</label>
              <input required value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Teléfono</label>
              <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha ingreso</label>
              <input type="date" value={form.fechaIngreso} onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })}
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
              <label className="block text-xs font-medium text-gray-500 mb-1">PIN (4 dígitos) *</label>
              <div className="relative">
                <input required type={mostrarPin ? 'text' : 'password'} maxLength={4} pattern="\d{4}"
                  value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500 pr-9"
                  placeholder="••••" />
                <button type="button" onClick={() => setMostrarPin(!mostrarPin)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                  {mostrarPin ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {/* Preview permisos según rol */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Permisos del rol <strong>{ROL_CONFIG[form.rol].label}</strong></p>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(MODULOS_LABEL).map((mod) => {
                const tiene = PERMISOS_POR_ROL[form.rol].includes(mod)
                return (
                  <span key={mod} className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                    tiene ? 'bg-gold-500 text-gray-900' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {tiene ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                    {MODULOS_LABEL[mod]}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCerrar}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit"
              className="flex-1 py-2.5 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 flex items-center justify-center gap-2">
              <Check size={15} /> {usuario ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Tarjeta Usuario ──────────────────────────────────────────────────────────

function TarjetaUsuario({ usuario, turnoActual, onEditar }: {
  usuario: Usuario
  turnoActual?: { entrada: string }
  onEditar: () => void
}) {
  const { iniciarTurno, cerrarTurno, cambiarEstado } = useUsuariosStore()
  const rolCfg = ROL_CONFIG[usuario.rol]
  const estadoCfg = ESTADO_CONFIG[usuario.estado]

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3 ${usuario.estado === 'inactivo' ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 ${
            usuario.estado === 'en_turno' ? 'bg-gold-600' : 'bg-gray-300'
          }`}>
            {avatarInicial(usuario)}
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">{usuario.nombre} {usuario.apellido}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className={`w-1.5 h-1.5 rounded-full ${estadoCfg.dot}`} />
              <span className={`text-xs font-medium ${estadoCfg.color}`}>{estadoCfg.label}</span>
            </div>
          </div>
        </div>
        <button onClick={onEditar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
          <Edit2 size={14} />
        </button>
      </div>

      {/* Rol + info */}
      <div className="flex items-center gap-2">
        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${rolCfg.badgeBg} ${rolCfg.badgeText}`}>
          <span>{rolCfg.emoji}</span> {rolCfg.label}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Mail size={11} className="text-gray-400" />{usuario.email}
        </div>
        {usuario.telefono && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone size={11} className="text-gray-400" />{usuario.telefono}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <KeyRound size={11} className="text-gray-400" />PIN: {'•'.repeat(usuario.pin.length)}
        </div>
      </div>

      {/* Turno activo */}
      {turnoActual && usuario.estado === 'en_turno' && (
        <div className="flex items-center gap-2 bg-gold-500 rounded-lg px-3 py-1.5">
          <Clock size={13} className="text-gray-900" />
          <span className="text-xs text-gray-900 font-semibold">
            En turno: {tiempoEnTurno(turnoActual.entrada)}
          </span>
        </div>
      )}

      {/* Permisos resumidos */}
      <div className="flex flex-wrap gap-1">
        {PERMISOS_POR_ROL[usuario.rol].slice(0, 5).map((mod) => (
          <span key={mod} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
            {MODULOS_LABEL[mod]}
          </span>
        ))}
        {PERMISOS_POR_ROL[usuario.rol].length > 5 && (
          <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
            +{PERMISOS_POR_ROL[usuario.rol].length - 5} más
          </span>
        )}
      </div>

      {/* Acciones de turno */}
      <div className="flex gap-2 pt-1 border-t border-gray-100">
        {usuario.estado !== 'en_turno' ? (
          <>
            <button onClick={() => iniciarTurno(usuario.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-gold-500 text-gray-900 rounded-lg text-xs font-semibold hover:bg-gold-600 transition-colors">
              <LogIn size={13} /> Iniciar turno
            </button>
            <button onClick={() => cambiarEstado(usuario.id, usuario.estado === 'activo' ? 'inactivo' : 'activo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                usuario.estado === 'inactivo'
                  ? 'bg-gray-500 text-white hover:bg-gray-600'
                  : 'bg-red-500 text-white hover:bg-red-600'
              }`}>
              {usuario.estado === 'inactivo' ? 'Activar' : 'Desactivar'}
            </button>
          </>
        ) : (
          <button onClick={() => cerrarTurno(usuario.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-rojo-500 text-white rounded-lg text-xs font-semibold hover:bg-rojo-600 transition-colors">
            <LogOut size={13} /> Cerrar turno
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Panel de Turnos ──────────────────────────────────────────────────────────

function PanelTurnos() {
  const { usuarios, turnos } = useUsuariosStore()
  const enTurno = usuarios.filter((u) => u.estado === 'en_turno')

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={16} className="text-gold-500" />
        <h3 className="font-bold text-gray-800 text-sm">Turnos activos ahora</h3>
        <span className="ml-auto text-xs bg-gold-500 text-gray-900 px-2 py-0.5 rounded-full font-semibold">
          {enTurno.length} en turno
        </span>
      </div>
      {enTurno.length === 0 ? (
        <p className="text-sm text-gray-300 text-center py-6">Sin personal en turno</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {enTurno.map((u) => {
            const turno = turnos.find((t) => t.usuarioId === u.id && !t.salida)
            const rolCfg = ROL_CONFIG[u.rol]
            return (
              <div key={u.id} className="flex items-center gap-3 py-2.5">
                <div className="w-8 h-8 bg-gold-600 text-white rounded-lg flex items-center justify-center font-bold text-xs">
                  {avatarInicial(u)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{u.nombre} {u.apellido}</p>
                  <span className={`text-xs font-medium ${rolCfg.color}`}>{rolCfg.emoji} {rolCfg.label}</span>
                </div>
                <div className="text-right">
                  {turno && (
                    <>
                      <p className="text-xs font-mono font-semibold text-gold-600">{tiempoEnTurno(turno.entrada)}</p>
                      <p className="text-xs text-gray-400">
                        desde {new Date(turno.entrada).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const { usuarios, turnos, agregarUsuario, actualizarUsuario } = useUsuariosStore()
  const [rolFiltro, setRolFiltro] = useState<Rol | 'todos'>('todos')
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState<{ abierto: boolean; usuario?: Usuario }>({ abierto: false })

  const usuariosFiltrados = usuarios.filter((u) => {
    const matchRol = rolFiltro === 'todos' || u.rol === rolFiltro
    const matchBusq = `${u.nombre} ${u.apellido} ${u.email}`.toLowerCase().includes(busqueda.toLowerCase())
    return matchRol && matchBusq
  })

  const enTurno = usuarios.filter((u) => u.estado === 'en_turno').length
  const activos = usuarios.filter((u) => u.estado === 'activo').length

  const handleGuardar = (datos: Omit<Usuario, 'id'>) => {
    if (modal.usuario) actualizarUsuario(modal.usuario.id, datos)
    else agregarUsuario({ ...datos, id: `u${Date.now()}` })
    setModal({ abierto: false })
  }

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Usuarios y Roles" subtitulo={`${usuarios.length} usuarios registrados`} />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {ROLES.map((rol) => {
            const cfg = ROL_CONFIG[rol]
            const count = usuarios.filter((u) => u.rol === rol).length
            return (
              <button key={rol} onClick={() => setRolFiltro(rol === rolFiltro ? 'todos' : rol)}
                className={`rounded-xl p-3 border text-left transition-all ${
                  rolFiltro === rol ? 'border-gold-500 bg-gold-50' : 'border-gray-200 bg-white hover:border-gold-300'
                }`}>
                <div className="text-xl mb-1">{cfg.emoji}</div>
                <p className="text-xs font-semibold text-gray-700">{cfg.label}</p>
                <p className="text-xs text-gray-400">{count} usuario{count !== 1 ? 's' : ''}</p>
              </button>
            )
          })}
        </div>

        {/* Turno + KPIs rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <PanelTurnos />
          </div>
          <div className="flex flex-col gap-3">
            <div className="bg-gold-50 border border-gold-200 rounded-xl p-4 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gold-600">{enTurno}</p>
                  <p className="text-xs text-gold-600 font-medium">En turno ahora</p>
                </div>
                <Shield size={28} className="text-gold-300" />
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-600">{activos}</p>
                  <p className="text-xs text-gray-500 font-medium">Disponibles</p>
                </div>
                <User size={28} className="text-gray-300" />
              </div>
            </div>
          </div>
        </div>

        {/* Barra de herramientas */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar usuario..."
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold-500 bg-white" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setRolFiltro('todos')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${rolFiltro === 'todos' ? 'bg-gold-600 text-white border-gold-600' : 'bg-white text-gray-600 border-gray-200'}`}>
              Todos ({usuarios.length})
            </button>
            {ROLES.map((r) => {
              const cfg = ROL_CONFIG[r]
              return (
                <button key={r} onClick={() => setRolFiltro(r === rolFiltro ? 'todos' : r)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${rolFiltro === r ? 'bg-gold-600 text-white border-gold-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {cfg.emoji} {cfg.label}
                </button>
              )
            })}
          </div>
          <button onClick={() => setModal({ abierto: true })}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-colors">
            <Plus size={15} /> Nuevo usuario
          </button>
        </div>

        {/* Grid de usuarios */}
        {usuariosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-300">
            <User size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">Sin usuarios</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {usuariosFiltrados.map((u) => {
              const turno = turnos.find((t) => t.usuarioId === u.id && !t.salida)
              return (
                <TarjetaUsuario key={u.id} usuario={u} turnoActual={turno}
                  onEditar={() => setModal({ abierto: true, usuario: u })} />
              )
            })}
          </div>
        )}
      </div>

      {modal.abierto && (
        <ModalUsuario usuario={modal.usuario} onGuardar={handleGuardar} onCerrar={() => setModal({ abierto: false })} />
      )}
    </div>
  )
}
