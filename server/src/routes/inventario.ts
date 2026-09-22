import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// GET /api/inventario
router.get('/', autenticar, async (req: Request, res: Response) => {
  const { categoria } = req.query
  const where: Record<string, unknown> = {}
  if (categoria) where.categoria = categoria
  const insumos = await prisma.insumo.findMany({ where, orderBy: { nombre: 'asc' } })
  // Añadir alerta de stock bajo
  const conAlerta = insumos.map((i) => ({
    ...i,
    stockBajo: i.stockActual <= i.stockMinimo,
  }))
  res.json(conAlerta)
})

// GET /api/inventario/alertas
router.get('/alertas', autenticar, async (_req: Request, res: Response) => {
  const insumos = await prisma.insumo.findMany()
  const bajos = insumos.filter((i) => i.stockActual <= i.stockMinimo)
  res.json(bajos)
})

// POST /api/inventario
router.post('/', autenticar, async (req: Request, res: Response) => {
  const { nombre, categoria, unidad, stockActual, stockMinimo, stockMaximo, precioUnitario, proveedor } = req.body
  const insumo = await prisma.insumo.create({
    data: { nombre, categoria, unidad, stockActual, stockMinimo, stockMaximo, precioUnitario, proveedor },
  })
  res.status(201).json(insumo)
})

// PATCH /api/inventario/:id
router.patch('/:id', autenticar, async (req: Request, res: Response) => {
  const insumo = await prisma.insumo.update({
    where: { id: req.params.id },
    data: req.body,
  })
  res.json(insumo)
})

// POST /api/inventario/:id/movimiento
router.post('/:id/movimiento', autenticar, async (req: Request, res: Response): Promise<void> => {
  const { tipo, cantidad, motivo } = req.body
  const insumo = await prisma.insumo.findUnique({ where: { id: req.params.id } })
  if (!insumo) { res.status(404).json({ error: 'Insumo no encontrado' }); return }

  const delta = tipo === 'entrada' ? cantidad : tipo === 'salida' ? -cantidad : cantidad
  const nuevoStock = insumo.stockActual + delta

  const [movimiento] = await prisma.$transaction([
    prisma.movimientoStock.create({
      data: { insumoId: req.params.id, tipo, cantidad, motivo },
    }),
    prisma.insumo.update({
      where: { id: req.params.id },
      data: { stockActual: nuevoStock },
    }),
  ])
  res.status(201).json(movimiento)
})

// DELETE /api/inventario/:id
router.delete('/:id', autenticar, async (req: Request, res: Response) => {
  await prisma.insumo.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
