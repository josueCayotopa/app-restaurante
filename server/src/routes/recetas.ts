import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()
const r2 = (n: number) => Math.round(n * 100) / 100

const INCLUDE = { insumo: { select: { id: true, nombre: true, unidad: true, stockActual: true, precioUnitario: true } } }

type Linea = { insumoId: string; cantidad: number; insumo: { id: string; nombre: string; unidad: string; stockActual: number; precioUnitario: number } }

// Costo por unidad y cuántas unidades alcanzan con el stock actual (el insumo que se acaba primero)
function resumen(lineas: Linea[]) {
  const costo = r2(lineas.reduce((a, l) => a + l.cantidad * l.insumo.precioUnitario, 0))
  const porciones = lineas.length
    ? Math.max(0, Math.floor(Math.min(...lineas.map((l) => (l.cantidad > 0 ? l.insumo.stockActual / l.cantidad : Infinity)))))
    : null
  const limitante = lineas.length
    ? lineas.reduce((a, l) => (l.insumo.stockActual / l.cantidad < a.insumo.stockActual / a.cantidad ? l : a)).insumo.nombre
    : null
  return { costo, porciones: porciones === Infinity ? null : porciones, limitante }
}

// GET /api/recetas → { [productoId]: { lineas, costo, porciones, limitante } }
router.get('/', autenticar, async (_req: Request, res: Response) => {
  const todas = await prisma.recetaItem.findMany({ include: INCLUDE, orderBy: { insumo: { nombre: 'asc' } } })
  const porProducto: Record<string, Linea[]> = {}
  for (const l of todas) (porProducto[l.productoId] ??= []).push(l)
  res.json(Object.fromEntries(Object.entries(porProducto).map(([id, lineas]) => [id, { lineas, ...resumen(lineas) }])))
})

// PUT /api/recetas/:productoId { lineas: [{ insumoId, cantidad }] } → reemplaza la receta
router.put('/:productoId', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const productoId = String(req.params.productoId)
  const producto = await prisma.producto.findUnique({ where: { id: productoId } })
  if (!producto) { res.status(404).json({ error: 'Producto no encontrado' }); return }
  const lineas: { insumoId: string; cantidad: number }[] = Array.isArray(req.body.lineas) ? req.body.lineas : []

  const ids = lineas.map((l) => String(l.insumoId))
  if (new Set(ids).size !== ids.length) { res.status(400).json({ error: 'Hay un insumo repetido en la receta' }); return }
  if (lineas.some((l) => !(Number(l.cantidad) > 0))) { res.status(400).json({ error: 'Cada insumo debe tener una cantidad mayor que 0' }); return }
  const existentes = await prisma.insumo.count({ where: { id: { in: ids } } })
  if (existentes !== ids.length) { res.status(400).json({ error: 'Alguno de los insumos ya no existe' }); return }

  await prisma.$transaction([
    prisma.recetaItem.deleteMany({ where: { productoId } }),
    ...lineas.map((l) => prisma.recetaItem.create({
      data: { productoId, insumoId: String(l.insumoId), cantidad: Math.round(Number(l.cantidad) * 1000) / 1000 },
    })),
  ])
  const nuevas = await prisma.recetaItem.findMany({ where: { productoId }, include: INCLUDE })
  res.json({ lineas: nuevas, ...resumen(nuevas) })
})

export default router
