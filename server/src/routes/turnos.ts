import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

function mapTurno(t: Record<string, unknown>) {
  return {
    ...t,
    mozos: JSON.parse((t.mozos as string) ?? '[]'),
  }
}

// GET /api/turnos/activo
router.get('/activo', autenticar, async (_req: Request, res: Response) => {
  const turno = await prisma.turno.findFirst({
    where: { estado: 'activo' },
    orderBy: { iniciadoEn: 'desc' },
  })
  res.json(turno ? mapTurno(turno as never) : null)
})

// POST /api/turnos/iniciar
router.post('/iniciar', autenticar, async (req: Request, res: Response) => {
  await prisma.turno.updateMany({
    where: { estado: 'activo' },
    data: { estado: 'cerrado', cerradoEn: new Date() },
  })
  const { iniciadoPor, mozos } = req.body
  const turno = await prisma.turno.create({
    data: {
      iniciadoPor: iniciadoPor ?? 'Admin',
      mozos: JSON.stringify(mozos ?? []),
      estado: 'activo',
    },
  })
  res.status(201).json(mapTurno(turno as never))
})

// POST /api/turnos/cerrar
router.post('/cerrar', autenticar, async (_req: Request, res: Response): Promise<void> => {
  const turno = await prisma.turno.findFirst({ where: { estado: 'activo' } })
  if (!turno) { res.status(404).json({ error: 'No hay turno activo' }); return }
  const cerrado = await prisma.turno.update({
    where: { id: turno.id },
    data: { estado: 'cerrado', cerradoEn: new Date() },
  })
  res.json(mapTurno(cerrado as never))
})

// PATCH /api/turnos/:id/mozos  (toggle un mozo)
router.patch('/:id/mozos', autenticar, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string }
  const { nombre } = req.body
  const turno = await prisma.turno.findUnique({ where: { id } })
  if (!turno) { res.status(404).json({ error: 'Turno no encontrado' }); return }
  const mozos: string[] = JSON.parse(turno.mozos ?? '[]')
  const nuevos = mozos.includes(nombre) ? mozos.filter((m) => m !== nombre) : [...mozos, nombre]
  const updated = await prisma.turno.update({
    where: { id },
    data: { mozos: JSON.stringify(nuevos) },
  })
  res.json(mapTurno(updated as never))
})

export default router
