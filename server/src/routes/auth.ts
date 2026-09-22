import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { firmarToken, autenticar } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body
  if (!email || !password) {
    res.status(400).json({ error: 'Email y contraseña requeridos' })
    return
  }
  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario || !usuario.activo) {
    res.status(401).json({ error: 'Credenciales inválidas' })
    return
  }
  const ok = await bcrypt.compare(password, usuario.password)
  if (!ok) {
    res.status(401).json({ error: 'Credenciales inválidas' })
    return
  }
  const token = firmarToken({ id: usuario.id, email: usuario.email, rol: usuario.rol })
  res.json({
    token,
    usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
  })
})

// GET /api/auth/me
router.get('/me', autenticar, async (req: Request, res: Response): Promise<void> => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario!.id },
    select: { id: true, nombre: true, email: true, rol: true, activo: true },
  })
  if (!usuario) { res.status(404).json({ error: 'Usuario no encontrado' }); return }
  res.json(usuario)
})

export default router
