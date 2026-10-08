import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

const COLORES = ['gold', 'rojo', 'steel', 'green']

// Los ítems de la carta ya no viven aquí: la carta se arma desde /api/productos (seccionCarta).

// ── Promociones ───────────────────────────────────────────────────────────

// GET /api/carta/promociones
router.get('/promociones', autenticar, async (_req: Request, res: Response) => {
  const promos = await prisma.promocion.findMany({ orderBy: { creadaEn: 'asc' } })
  res.json(promos)
})

function datosPromo(body: Record<string, unknown>) {
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const porcentaje = Number(body.porcentaje)
  if (!nombre) return { error: 'El nombre es obligatorio' }
  if (!Number.isFinite(porcentaje) || porcentaje <= 0 || porcentaje > 100) {
    return { error: 'El porcentaje debe estar entre 1 y 100' }
  }
  const color = typeof body.color === 'string' && COLORES.includes(body.color) ? body.color : 'gold'
  return {
    data: {
      nombre,
      porcentaje,
      color,
      emoji:     typeof body.emoji === 'string' && body.emoji.trim() ? body.emoji.trim() : '🏷️',
      condicion: typeof body.condicion === 'string' ? body.condicion.trim() || null : null,
      requisito: typeof body.requisito === 'string' ? body.requisito.trim() || null : null,
      activa:    body.activa === undefined ? true : Boolean(body.activa),
    },
  }
}

// POST /api/carta/promociones
router.post('/promociones', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response): Promise<void> => {
  const r = datosPromo(req.body)
  if ('error' in r) { res.status(400).json({ error: r.error }); return }
  const promo = await prisma.promocion.create({ data: r.data! })
  res.status(201).json(promo)
})

// PATCH /api/carta/promociones/:id
router.patch('/promociones/:id', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response): Promise<void> => {
  const r = datosPromo(req.body)
  if ('error' in r) { res.status(400).json({ error: r.error }); return }
  const promo = await prisma.promocion.update({ where: { id: String(req.params.id) }, data: r.data! })
  res.json(promo)
})

// DELETE /api/carta/promociones/:id
router.delete('/promociones/:id', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response) => {
  await prisma.promocion.delete({ where: { id: String(req.params.id) } })
  res.status(204).send()
})

export default router
