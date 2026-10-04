import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'
import { normalizarLogin } from '../lib/usuario'

const router = Router()
const prisma = new PrismaClient()

const ROLES = ['admin', 'cajero', 'mozo', 'cocinero', 'bartender']
const SELECT = { id: true, nombre: true, email: true, rol: true, cargo: true, activo: true, zonas: true, creadoEn: true }

function mapUsuario(u: Record<string, unknown>) {
  return {
    ...u,
    zonas: u.zonas ? JSON.parse(u.zonas as string) : [],
  }
}

const limpiarEmail = normalizarLogin
const limpiarCargo = (c: unknown) => (typeof c === 'string' ? c.trim() || null : null)

// No dejar el sistema sin ningún administrador activo
async function quedariaSinAdmin(id: string, cambios: { rol?: string; activo?: boolean }) {
  const actual = await prisma.usuario.findUnique({ where: { id } })
  if (!actual || actual.rol !== 'admin' || !actual.activo) return false
  const dejaDeSerAdmin = (cambios.rol !== undefined && cambios.rol !== 'admin') || cambios.activo === false
  if (!dejaDeSerAdmin) return false
  const otrosAdmins = await prisma.usuario.count({ where: { rol: 'admin', activo: true, id: { not: id } } })
  return otrosAdmins === 0
}

// GET /api/usuarios
router.get('/', autenticar, requerirRol('admin'), async (_req: Request, res: Response) => {
  const usuarios = await prisma.usuario.findMany({ select: SELECT, orderBy: { nombre: 'asc' } })
  res.json(usuarios.map((u) => mapUsuario(u as never)))
})

// POST /api/usuarios
router.post('/', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const { nombre, password, rol, zonas } = req.body as { zonas?: string[] } & Record<string, string>
  const email = limpiarEmail(req.body.email)
  if (!nombre?.trim() || !email) { res.status(400).json({ error: 'Nombre y usuario son obligatorios' }); return }
  if (!password || password.length < 4) { res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' }); return }
  if (!ROLES.includes(rol)) { res.status(400).json({ error: 'Rol inválido' }); return }
  const existe = await prisma.usuario.findUnique({ where: { email } })
  if (existe) { res.status(409).json({ error: 'Ese usuario ya existe' }); return }
  const hash = await bcrypt.hash(password, 10)
  const usuario = await prisma.usuario.create({
    data: { nombre: nombre.trim(), email, password: hash, rol, cargo: limpiarCargo(req.body.cargo), zonas: zonas?.length ? JSON.stringify(zonas) : null },
    select: SELECT,
  })
  res.status(201).json(mapUsuario(usuario as never))
})

// PATCH /api/usuarios/:id  (password solo si viene; activo=false desactiva)
router.patch('/:id', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const { nombre, rol, activo, password, zonas } = req.body as { zonas?: string[] } & Record<string, unknown>
  const data: Record<string, unknown> = {}
  if (nombre !== undefined) data.nombre = String(nombre).trim()
  if (req.body.cargo !== undefined) data.cargo = limpiarCargo(req.body.cargo)
  if (activo !== undefined) data.activo = Boolean(activo)
  if (rol !== undefined) {
    if (!ROLES.includes(String(rol))) { res.status(400).json({ error: 'Rol inválido' }); return }
    data.rol = rol
  }
  if (req.body.email !== undefined) {
    const email = limpiarEmail(req.body.email)
    const otro = await prisma.usuario.findUnique({ where: { email } })
    if (otro && otro.id !== id) { res.status(409).json({ error: 'Ese usuario ya existe' }); return }
    data.email = email
  }
  if (password) {
    if (String(password).length < 4) { res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' }); return }
    data.password = await bcrypt.hash(String(password), 10)
  }
  if (zonas !== undefined) data.zonas = (zonas as string[])?.length ? JSON.stringify(zonas) : null

  if (await quedariaSinAdmin(id, { rol: data.rol as string | undefined, activo: data.activo as boolean | undefined })) {
    res.status(409).json({ error: 'Debe quedar al menos un administrador activo' })
    return
  }
  const usuario = await prisma.usuario.update({ where: { id }, data, select: SELECT })
  res.json(mapUsuario(usuario as never))
})

// DELETE /api/usuarios/:id  (desactivar, no eliminar: sus pedidos pasados lo referencian)
router.delete('/:id', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  if (await quedariaSinAdmin(id, { activo: false })) {
    res.status(409).json({ error: 'Debe quedar al menos un administrador activo' })
    return
  }
  await prisma.usuario.update({ where: { id }, data: { activo: false } })
  res.status(204).send()
})

export default router
