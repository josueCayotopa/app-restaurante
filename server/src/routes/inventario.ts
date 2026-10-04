import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'
import { nombreDeUsuario } from '../lib/usuario'

const router = Router()
const prisma = new PrismaClient()
const r3 = (n: number) => Math.round(n * 1000) / 1000

const TIPOS = ['entrada', 'salida', 'merma', 'ajuste']

function datosInsumo(body: Record<string, unknown>) {
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const categoria = typeof body.categoria === 'string' && body.categoria ? body.categoria : 'abarrotes'
  const unidad = typeof body.unidad === 'string' && body.unidad ? body.unidad : 'unidad'
  const stockMinimo = Number(body.stockMinimo ?? 0)
  const stockMaximo = Number(body.stockMaximo ?? 0)
  const precioUnitario = Number(body.precioUnitario ?? 0)
  if (!nombre) return { error: 'El nombre es obligatorio' }
  if (!(stockMinimo >= 0) || !(stockMaximo >= 0) || !(precioUnitario >= 0)) return { error: 'Los valores no pueden ser negativos' }
  if (stockMaximo > 0 && stockMinimo > stockMaximo) return { error: 'El stock mínimo no puede ser mayor que el máximo' }
  return {
    data: {
      nombre, categoria, unidad, stockMinimo, stockMaximo, precioUnitario,
      proveedor: typeof body.proveedor === 'string' ? body.proveedor.trim() || null : null,
    },
  }
}

// GET /api/inventario
router.get('/', autenticar, async (_req: Request, res: Response) => {
  const insumos = await prisma.insumo.findMany({ orderBy: { nombre: 'asc' } })
  res.json(insumos)
})

// GET /api/inventario/movimientos?limite=100 → últimos movimientos de todos los insumos
router.get('/movimientos', autenticar, async (req: Request, res: Response) => {
  const limite = Math.min(Number(req.query.limite) || 100, 500)
  const movimientos = await prisma.movimientoStock.findMany({
    include: { insumo: { select: { nombre: true, unidad: true } } },
    orderBy: { realizadoEn: 'desc' },
    take: limite,
  })
  res.json(movimientos)
})

// POST /api/inventario  (stockActual inicial opcional → queda registrado como entrada)
router.post('/', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const r = datosInsumo(req.body)
  if ('error' in r) { res.status(400).json({ error: r.error }); return }
  const stockInicial = Number(req.body.stockActual ?? 0)
  if (!(stockInicial >= 0)) { res.status(400).json({ error: 'El stock inicial no puede ser negativo' }); return }
  const insumo = await prisma.insumo.create({ data: { ...r.data!, stockActual: r3(stockInicial) } })
  if (stockInicial > 0) {
    await prisma.movimientoStock.create({
      data: { insumoId: insumo.id, tipo: 'entrada', cantidad: r3(stockInicial), stockResultante: r3(stockInicial), motivo: 'Stock inicial', usuario: await nombreDeUsuario(req.usuario?.id) },
    })
  }
  res.status(201).json(insumo)
})

// PATCH /api/inventario/:id  (el stock NO se edita aquí: se usa un movimiento de ajuste)
router.patch('/:id', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const r = datosInsumo(req.body)
  if ('error' in r) { res.status(400).json({ error: r.error }); return }
  const insumo = await prisma.insumo.update({ where: { id: String(req.params.id) }, data: r.data! })
  res.json(insumo)
})

// POST /api/inventario/:id/movimiento { tipo, cantidad, motivo }
//   entrada: suma · salida/merma: resta (sin dejar stock negativo) · ajuste: cantidad = stock contado
router.post('/:id/movimiento', autenticar, requerirRol('admin', 'cocinero', 'bartender'), async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const tipo = String(req.body.tipo ?? '')
  const cantidad = Number(req.body.cantidad)
  const motivo = typeof req.body.motivo === 'string' ? req.body.motivo.trim() || null : null
  if (!TIPOS.includes(tipo)) { res.status(400).json({ error: 'Tipo de movimiento inválido' }); return }
  if (tipo === 'ajuste' ? !(cantidad >= 0) : !(cantidad > 0)) { res.status(400).json({ error: 'Cantidad inválida' }); return }

  const insumo = await prisma.insumo.findUnique({ where: { id } })
  if (!insumo) { res.status(404).json({ error: 'Insumo no encontrado' }); return }

  let nuevoStock: number
  let cantidadMov = cantidad
  if (tipo === 'entrada') nuevoStock = insumo.stockActual + cantidad
  else if (tipo === 'ajuste') { nuevoStock = cantidad; cantidadMov = Math.abs(cantidad - insumo.stockActual) }
  else {
    if (cantidad > insumo.stockActual + 0.0005) {
      res.status(400).json({ error: `Solo hay ${insumo.stockActual} ${insumo.unidad} en stock` })
      return
    }
    nuevoStock = insumo.stockActual - cantidad
  }
  nuevoStock = r3(nuevoStock)

  const usuario = await nombreDeUsuario(req.usuario?.id)
  const [movimiento, actualizado] = await prisma.$transaction([
    prisma.movimientoStock.create({
      data: {
        insumoId: id, tipo, cantidad: r3(cantidadMov), stockResultante: nuevoStock, usuario,
        motivo: tipo === 'ajuste' ? (motivo ?? `Conteo físico (antes ${insumo.stockActual})`) : motivo,
      },
      include: { insumo: { select: { nombre: true, unidad: true } } },
    }),
    prisma.insumo.update({ where: { id }, data: { stockActual: nuevoStock } }),
  ])
  res.status(201).json({ movimiento, insumo: actualizado })
})

// DELETE /api/inventario/:id
router.delete('/:id', autenticar, requerirRol('admin'), async (req: Request, res: Response) => {
  const id = String(req.params.id)
  await prisma.$transaction([
    prisma.movimientoStock.deleteMany({ where: { insumoId: id } }),
    prisma.insumo.delete({ where: { id } }),
  ])
  res.status(204).send()
})

export default router
