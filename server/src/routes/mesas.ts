import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'
import { getIo } from '../sockets/io'

const router = Router()
// "en limpieza" ya no existe: al cobrar la mesa pasa directo a libre
const ESTADOS_MESA = ['libre', 'ocupada', 'reservada', 'esperando_pago', 'unida']
const prisma = new PrismaClient()

// GET /api/mesas
router.get('/', autenticar, async (_req: Request, res: Response) => {
  const mesas = await prisma.mesa.findMany({ orderBy: { numero: 'asc' } })
  res.json(mesas)
})

// GET /api/mesas/:id
router.get('/:id', autenticar, async (req: Request, res: Response): Promise<void> => {
  const mesa = await prisma.mesa.findUnique({ where: { id: String(req.params.id) } })
  if (!mesa) { res.status(404).json({ error: 'Mesa no encontrada' }); return }
  res.json(mesa)
})

// POST /api/mesas
router.post('/', autenticar, requerirRol('admin'), async (req: Request, res: Response) => {
  const { numero, capacidad, zona, posX, posY } = req.body
  const mesa = await prisma.mesa.create({
    data: { numero, capacidad, zona, posX: posX ?? 0, posY: posY ?? 0 },
  })
  res.status(201).json(mesa)
})

// PATCH /api/mesas/:id/estado
router.patch('/:id/estado', autenticar, async (req: Request, res: Response): Promise<void> => {
  const { estado } = req.body
  if (!ESTADOS_MESA.includes(estado)) { res.status(400).json({ error: 'Estado de mesa inválido' }); return }
  const mesa = await prisma.mesa.update({
    where: { id: String(req.params.id) },
    data: { estado },
  })
  getIo().emit('mesa:estado_actualizado', mesa)
  res.json(mesa)
})

// PATCH /api/mesas/:id
router.patch('/:id', autenticar, requerirRol('admin'), async (req: Request, res: Response) => {
  const { numero, capacidad, zona, posX, posY } = req.body
  const mesa = await prisma.mesa.update({
    where: { id: String(req.params.id) },
    data: { numero, capacidad, zona, posX, posY },
  })
  res.json(mesa)
})

// DELETE /api/mesas/:id
router.delete('/:id', autenticar, requerirRol('admin'), async (req: Request, res: Response) => {
  await prisma.mesa.delete({ where: { id: String(req.params.id) } })
  res.status(204).send()
})

export default router
