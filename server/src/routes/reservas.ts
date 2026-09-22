import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// GET /api/reservas
router.get('/', autenticar, async (req: Request, res: Response) => {
  const { fecha, estado } = req.query
  const where: Record<string, unknown> = {}
  if (estado) where.estado = estado
  if (fecha) {
    const d = new Date(fecha as string)
    const inicio = new Date(d.setHours(0, 0, 0, 0))
    const fin = new Date(d.setHours(23, 59, 59, 999))
    where.fecha = { gte: inicio, lte: fin }
  }
  const reservas = await prisma.reserva.findMany({
    where,
    include: { mesa: true },
    orderBy: { fecha: 'asc' },
  })
  res.json(reservas)
})

// POST /api/reservas
router.post('/', autenticar, async (req: Request, res: Response) => {
  const { mesaId, clienteNombre, clienteTel, fecha, duracionMin, personas, notas } = req.body
  const reserva = await prisma.reserva.create({
    data: {
      mesaId,
      clienteNombre,
      clienteTel,
      fecha: new Date(fecha),
      duracionMin: duracionMin ?? 90,
      personas,
      notas,
      usuarioId: req.usuario?.id ?? null,
    },
    include: { mesa: true },
  })
  res.status(201).json(reserva)
})

// PATCH /api/reservas/:id
router.patch('/:id', autenticar, async (req: Request, res: Response) => {
  const { clienteNombre, clienteTel, fecha, duracionMin, personas, estado, notas } = req.body
  const reserva = await prisma.reserva.update({
    where: { id: req.params.id },
    data: {
      clienteNombre,
      clienteTel,
      fecha: fecha ? new Date(fecha) : undefined,
      duracionMin,
      personas,
      estado,
      notas,
    },
    include: { mesa: true },
  })
  res.json(reserva)
})

// DELETE /api/reservas/:id
router.delete('/:id', autenticar, async (req: Request, res: Response) => {
  await prisma.reserva.update({ where: { id: req.params.id }, data: { estado: 'cancelada' } })
  res.status(204).send()
})

export default router
