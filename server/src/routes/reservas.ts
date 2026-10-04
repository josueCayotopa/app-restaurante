import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

const ESTADOS = ['pendiente', 'confirmada', 'cancelada', 'completada']
const PUEDEN_EDITAR = ['admin', 'mozo', 'cajero']

// "2026-09-30" → límites del día en hora local del servidor (la PC del restaurante)
function limitesDia(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  return { gte: new Date(y, m - 1, d, 0, 0, 0, 0), lte: new Date(y, m - 1, d, 23, 59, 59, 999) }
}
const esFecha = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

function datosReserva(body: Record<string, unknown>) {
  const clienteNombre = typeof body.clienteNombre === 'string' ? body.clienteNombre.trim() : ''
  const fecha = new Date(String(body.fecha ?? ''))
  const personas = Number(body.personas)
  if (!clienteNombre) return { error: 'El nombre del cliente es obligatorio' }
  if (isNaN(fecha.getTime())) return { error: 'Fecha u hora inválida' }
  if (!(Number.isInteger(personas) && personas > 0 && personas <= 100)) return { error: 'Número de personas inválido' }
  return {
    data: {
      clienteNombre,
      clienteTel: typeof body.clienteTel === 'string' ? body.clienteTel.trim() || null : null,
      fecha,
      personas,
      duracionMin: Number(body.duracionMin) > 0 ? Number(body.duracionMin) : 90,
      mesaId: typeof body.mesaId === 'string' && body.mesaId ? body.mesaId : null,
      notas: typeof body.notas === 'string' ? body.notas.trim() || null : null,
    },
  }
}

// GET /api/reservas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD (por defecto: hoy en adelante, 60 días)
router.get('/', autenticar, async (req: Request, res: Response) => {
  const hoy = new Date()
  const desde = esFecha(req.query.desde) ? limitesDia(req.query.desde).gte : new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const hasta = esFecha(req.query.hasta) ? limitesDia(req.query.hasta).lte : new Date(desde.getTime() + 60 * 86400000)
  const reservas = await prisma.reserva.findMany({
    where: { fecha: { gte: desde, lte: hasta } },
    include: { mesa: { select: { id: true, numero: true, zona: true } } },
    orderBy: { fecha: 'asc' },
  })
  res.json(reservas)
})

// POST /api/reservas
router.post('/', autenticar, requerirRol(...PUEDEN_EDITAR), async (req: Request, res: Response): Promise<void> => {
  const r = datosReserva(req.body)
  if ('error' in r) { res.status(400).json({ error: r.error }); return }
  const reserva = await prisma.reserva.create({
    data: { ...r.data!, usuarioId: req.usuario?.id ?? null },
    include: { mesa: { select: { id: true, numero: true, zona: true } } },
  })
  res.status(201).json(reserva)
})

// PATCH /api/reservas/:id  (datos completos, o solo { estado })
router.patch('/:id', autenticar, requerirRol(...PUEDEN_EDITAR), async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  let data: Record<string, unknown>
  if (Object.keys(req.body).length === 1 && req.body.estado !== undefined) {
    if (!ESTADOS.includes(req.body.estado)) { res.status(400).json({ error: 'Estado inválido' }); return }
    data = { estado: req.body.estado }
  } else {
    const r = datosReserva(req.body)
    if ('error' in r) { res.status(400).json({ error: r.error }); return }
    data = r.data!
    if (req.body.estado !== undefined) {
      if (!ESTADOS.includes(req.body.estado)) { res.status(400).json({ error: 'Estado inválido' }); return }
      data.estado = req.body.estado
    }
  }
  const reserva = await prisma.reserva.update({
    where: { id }, data,
    include: { mesa: { select: { id: true, numero: true, zona: true } } },
  })
  res.json(reserva)
})

// DELETE /api/reservas/:id  (borra de verdad; para anular sin borrar, usar estado "cancelada")
router.delete('/:id', autenticar, requerirRol(...PUEDEN_EDITAR), async (req: Request, res: Response) => {
  await prisma.reserva.delete({ where: { id: String(req.params.id) } })
  res.status(204).send()
})

export default router
