import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// GET /api/zonas
router.get('/', autenticar, async (_req: Request, res: Response) => {
  const zonas = await prisma.zona.findMany({ orderBy: { nombre: 'asc' } })
  res.json(zonas)
})

// POST /api/zonas
router.post('/', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const { nombre } = req.body as { nombre?: string }
  const limpio = nombre?.trim()
  if (!limpio) { res.status(400).json({ error: 'El nombre de la zona es obligatorio' }); return }
  const existe = await prisma.zona.findUnique({ where: { nombre: limpio } })
  if (existe) { res.status(409).json({ error: 'Ya existe una zona con ese nombre' }); return }
  const zona = await prisma.zona.create({ data: { nombre: limpio } })
  res.status(201).json(zona)
})

// DELETE /api/zonas/:id
router.delete('/:id', autenticar, requerirRol('admin'), async (req: Request, res: Response) => {
  await prisma.zona.delete({ where: { id: String(req.params.id) } })
  res.status(204).send()
})

export default router
