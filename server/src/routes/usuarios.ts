import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// GET /api/usuarios
router.get('/', autenticar, requerirRol('admin'), async (_req: Request, res: Response) => {
  const usuarios = await prisma.usuario.findMany({
    select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true },
    orderBy: { nombre: 'asc' },
  })
  res.json(usuarios)
})

// POST /api/usuarios
router.post('/', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const { nombre, email, password, rol } = req.body
  const existe = await prisma.usuario.findUnique({ where: { email } })
  if (existe) { res.status(409).json({ error: 'Email ya registrado' }); return }
  const hash = await bcrypt.hash(password, 10)
  const usuario = await prisma.usuario.create({
    data: { nombre, email, password: hash, rol },
    select: { id: true, nombre: true, email: true, rol: true, activo: true },
  })
  res.status(201).json(usuario)
})

// PATCH /api/usuarios/:id
router.patch('/:id', autenticar, requerirRol('admin'), async (req: Request, res: Response) => {
  const { nombre, email, rol, activo, password } = req.body
  const data: Record<string, unknown> = { nombre, email, rol, activo }
  if (password) data.password = await bcrypt.hash(password, 10)
  const usuario = await prisma.usuario.update({
    where: { id: req.params.id },
    data,
    select: { id: true, nombre: true, email: true, rol: true, activo: true },
  })
  res.json(usuario)
})

// DELETE /api/usuarios/:id  (desactivar, no eliminar)
router.delete('/:id', autenticar, requerirRol('admin'), async (req: Request, res: Response) => {
  await prisma.usuario.update({ where: { id: req.params.id }, data: { activo: false } })
  res.status(204).send()
})

export default router
