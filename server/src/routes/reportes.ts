import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

// GET /api/reportes/ventas-dia
router.get('/ventas-dia', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response) => {
  const fecha = req.query.fecha ? new Date(req.query.fecha as string) : new Date()
  const inicio = new Date(fecha.setHours(0, 0, 0, 0))
  const fin = new Date(fecha.setHours(23, 59, 59, 999))

  const comandas = await prisma.comanda.findMany({
    where: { estado: 'cerrada', creadaEn: { gte: inicio, lte: fin } },
    include: { items: true, cuentas: true },
  })

  const totalBruto = comandas.reduce((acc, c) => {
    if (c.cuentas.length > 0) {
      return acc + c.cuentas.reduce((s, ct) => s + ct.total, 0)
    }
    return acc + c.total
  }, 0)

  const porMetodo: Record<string, number> = {}
  comandas.forEach((c) => {
    if (c.cuentas.length > 0) {
      c.cuentas.forEach((ct) => {
        const m = ct.metodoPago ?? 'efectivo'
        porMetodo[m] = (porMetodo[m] ?? 0) + ct.total
      })
    }
  })

  const productosVendidos = comandas
    .flatMap((c) => c.items)
    .filter((i) => i.estado !== 'cancelado')
    .reduce((acc: Record<string, { nombre: string; cantidad: number; total: number }>, item) => {
      if (!acc[item.productoId]) {
        acc[item.productoId] = { nombre: item.nombre, cantidad: 0, total: 0 }
      }
      acc[item.productoId].cantidad += item.cantidad
      acc[item.productoId].total += item.cantidad * item.precioUnitario
      return acc
    }, {})

  res.json({
    fecha: inicio.toISOString().split('T')[0],
    totalBruto,
    totalComandasCerradas: comandas.length,
    porMetodoPago: porMetodo,
    topProductos: Object.values(productosVendidos)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
  })
})

// GET /api/reportes/ventas-semana
router.get('/ventas-semana', autenticar, requerirRol('admin', 'cajero'), async (_req: Request, res: Response) => {
  const hoy = new Date()
  const inicio = new Date(hoy)
  inicio.setDate(hoy.getDate() - 6)
  inicio.setHours(0, 0, 0, 0)

  const comandas = await prisma.comanda.findMany({
    where: { estado: 'cerrada', creadaEn: { gte: inicio } },
    select: { creadaEn: true, total: true },
  })

  const porDia: Record<string, number> = {}
  comandas.forEach((c) => {
    const dia = c.creadaEn.toISOString().split('T')[0]
    porDia[dia] = (porDia[dia] ?? 0) + c.total
  })

  res.json({ porDia, total: Object.values(porDia).reduce((a, b) => a + b, 0) })
})

export default router
