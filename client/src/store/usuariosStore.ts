import { create } from 'zustand'

// Debe coincidir con los roles reales del backend (server/prisma/schema.prisma
// y lib/permisos.ts), para que el preview de permisos de esta pantalla sea fiel
// a lo que el usuario realmente puede ver al iniciar sesión.
export type Rol = 'admin' | 'cajero' | 'mozo' | 'cocinero' | 'bartender'
export type EstadoUsuario = 'activo' | 'inactivo' | 'en_turno'

export interface Permiso {
  modulo: string
  ver: boolean
  editar: boolean
}

export interface Turno {
  id: string
  usuarioId: string
  entrada: string
  salida?: string
  totalVentas?: number
  totalComandas?: number
}

export interface Usuario {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono: string
  rol: Rol
  estado: EstadoUsuario
  avatar?: string
  fechaIngreso: string
  pin: string
}

// Debe reflejar exactamente lib/permisos.ts (RUTAS_POR_ROL) — misma idea, en
// términos de "módulos" en vez de rutas, para el preview de esta pantalla.
const PERMISOS_POR_ROL: Record<Rol, string[]> = {
  admin: ['mesas', 'comandas', 'cocina', 'bar', 'caja', 'carta', 'menu', 'reservas', 'inventario', 'proveedores', 'usuarios', 'reportes'],
  mozo: ['mesas', 'comandas', 'reservas', 'carta'],
  cocinero: ['cocina'],
  bartender: ['bar'],
  cajero: ['caja'],
}

const usuariosIniciales: Usuario[] = [
  { id: 'u1', nombre: 'Miguel', apellido: 'Rodríguez', email: 'admin@restaurante.pe', telefono: '987654321', rol: 'admin', estado: 'en_turno', fechaIngreso: '2024-01-15', pin: '1234' },
  { id: 'u2', nombre: 'Carlos', apellido: 'Pérez', email: 'carlos@restaurante.pe', telefono: '976543210', rol: 'mozo', estado: 'en_turno', fechaIngreso: '2024-03-01', pin: '2345' },
  { id: 'u3', nombre: 'Ana', apellido: 'García', email: 'ana@restaurante.pe', telefono: '965432109', rol: 'mozo', estado: 'en_turno', fechaIngreso: '2024-03-15', pin: '3456' },
  { id: 'u4', nombre: 'Luis', apellido: 'Martínez', email: 'luis@restaurante.pe', telefono: '954321098', rol: 'mozo', estado: 'activo', fechaIngreso: '2024-04-01', pin: '4567' },
  { id: 'u5', nombre: 'María', apellido: 'Torres', email: 'maria@restaurante.pe', telefono: '943210987', rol: 'mozo', estado: 'activo', fechaIngreso: '2024-05-10', pin: '5678' },
  { id: 'u6', nombre: 'Pedro', apellido: 'Sánchez', email: 'pedro@restaurante.pe', telefono: '932109876', rol: 'cocinero', estado: 'en_turno', fechaIngreso: '2024-02-01', pin: '6789' },
  { id: 'u7', nombre: 'Rosa', apellido: 'Flores', email: 'rosa@restaurante.pe', telefono: '921098765', rol: 'cocinero', estado: 'en_turno', fechaIngreso: '2024-02-15', pin: '7890' },
  { id: 'u8', nombre: 'Jorge', apellido: 'López', email: 'jorge@restaurante.pe', telefono: '910987654', rol: 'cajero', estado: 'en_turno', fechaIngreso: '2024-01-20', pin: '8901' },
  { id: 'u9', nombre: 'Elena', apellido: 'Vargas', email: 'elena@restaurante.pe', telefono: '909876543', rol: 'bartender', estado: 'activo', fechaIngreso: '2024-06-01', pin: '9012' },
]

const turnosIniciales: Turno[] = [
  { id: 't1', usuarioId: 'u1', entrada: new Date(Date.now() - 8 * 3600000).toISOString(), totalComandas: 12, totalVentas: 840 },
  { id: 't2', usuarioId: 'u2', entrada: new Date(Date.now() - 6 * 3600000).toISOString(), totalComandas: 8, totalVentas: 520 },
  { id: 't3', usuarioId: 'u3', entrada: new Date(Date.now() - 6 * 3600000).toISOString(), totalComandas: 7, totalVentas: 460 },
  { id: 't4', usuarioId: 'u6', entrada: new Date(Date.now() - 8 * 3600000).toISOString() },
  { id: 't5', usuarioId: 'u8', entrada: new Date(Date.now() - 7 * 3600000).toISOString() },
]

interface UsuariosState {
  usuarios: Usuario[]
  turnos: Turno[]
  usuarioActual: Usuario | null
  agregarUsuario: (u: Usuario) => void
  actualizarUsuario: (id: string, datos: Partial<Usuario>) => void
  cambiarEstado: (id: string, estado: EstadoUsuario) => void
  iniciarTurno: (usuarioId: string) => void
  cerrarTurno: (usuarioId: string) => void
  getPermisos: (rol: Rol) => string[]
}

export const useUsuariosStore = create<UsuariosState>((set) => ({
  usuarios: usuariosIniciales,
  turnos: turnosIniciales,
  usuarioActual: usuariosIniciales[0],
  agregarUsuario: (u) => set((s) => ({ usuarios: [...s.usuarios, u] })),
  actualizarUsuario: (id, datos) =>
    set((s) => ({ usuarios: s.usuarios.map((u) => (u.id === id ? { ...u, ...datos } : u)) })),
  cambiarEstado: (id, estado) =>
    set((s) => ({ usuarios: s.usuarios.map((u) => (u.id === id ? { ...u, estado } : u)) })),
  iniciarTurno: (usuarioId) => {
    const turno: Turno = { id: `t${Date.now()}`, usuarioId, entrada: new Date().toISOString() }
    set((s) => ({
      turnos: [...s.turnos, turno],
      usuarios: s.usuarios.map((u) => (u.id === usuarioId ? { ...u, estado: 'en_turno' } : u)),
    }))
  },
  cerrarTurno: (usuarioId) =>
    set((s) => ({
      turnos: s.turnos.map((t) =>
        t.usuarioId === usuarioId && !t.salida ? { ...t, salida: new Date().toISOString() } : t
      ),
      usuarios: s.usuarios.map((u) => (u.id === usuarioId ? { ...u, estado: 'activo' } : u)),
    })),
  getPermisos: (rol) => PERMISOS_POR_ROL[rol] ?? [],
}))

export { PERMISOS_POR_ROL }
