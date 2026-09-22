import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// GET /api/proveedores
router.get('/', autenticar, async (_req: Request, res: Response) => {
  const proveedores = await prisma.proveedor.findMany({
    where: { activo: true },
    orderBy: { nombre: 'asc' },
  })
  res.json(proveedores)
})

// POST /api/proveedores
router.post('/', autenticar, async (req: Request, res: Response) => {
  const { nombre, ruc, contacto, telefono, email, direccion } = req.body
  const proveedor = await prisma.proveedor.create({
    data: { nombre, ruc, contacto, telefono, email, direccion },
  })
  res.status(201).json(proveedor)
})

// PATCH /api/proveedores/:id
router.patch('/:id', autenticar, async (req: Request, res: Response) => {
  const proveedor = await prisma.proveedor.update({
    where: { id: req.params.id },
    data: req.body,
  })
  res.json(proveedor)
})

// DELETE /api/proveedores/:id  (desactivar)
router.delete('/:id', autenticar, async (req: Request, res: Response) => {
  await prisma.proveedor.update({ where: { id: req.params.id }, data: { activo: false } })
  res.status(204).send()
})

// GET /api/proveedores/:id/compras
router.get('/:id/compras', autenticar, async (req: Request, res: Response) => {
  const compras = await prisma.compra.findMany({
    where: { proveedorId: req.params.id },
    include: { items: true },
    orderBy: { fecha: 'desc' },
  })
  res.json(compras)
})

// POST /api/proveedores/:id/compras
router.post('/:id/compras', autenticar, async (req: Request, res: Response) => {
  const { items, notas } = req.body
  const total: number = items.reduce(
    (acc: number, i: { subtotal: number }) => acc + i.subtotal,
    0
  )
  const compra = await prisma.compra.create({
    data: {
      proveedorId: req.params.id,
      total,
      notas,
      items: { create: items },
    },
    include: { items: true },
  })
  res.status(201).json(compra)
})

export default router
