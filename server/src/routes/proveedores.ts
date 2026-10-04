import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'
import { nombreDeUsuario } from '../lib/usuario'

const router = Router()
const prisma = new PrismaClient()
const r2 = (n: number) => Math.round(n * 100) / 100
const r3 = (n: number) => Math.round(n * 1000) / 1000

const CATEGORIAS = ['carnes', 'pescados', 'verduras', 'bebidas', 'abarrotes', 'descartables', 'general']
// Flujo de la orden de compra: a qué estados se puede pasar desde cada uno
const TRANSICIONES: Record<string, string[]> = {
  borrador: ['enviada', 'cancelada'],
  enviada:  ['aprobada', 'cancelada'],
  aprobada: ['recibida', 'cancelada'],
  recibida: [],
  cancelada: [],
}

const soloAdmin = [autenticar, requerirRol('admin')]

function datosProveedor(body: Record<string, unknown>) {
  const texto = (v: unknown) => (typeof v === 'string' ? v.trim() || null : null)
  const nombre = texto(body.nombre)
  const ruc = texto(body.ruc)
  const calificacion = Number(body.calificacion ?? 3)
  if (!nombre) return { error: 'La razón social es obligatoria' }
  if (ruc && !/^\d{11}$/.test(ruc)) return { error: 'El RUC debe tener 11 dígitos' }
  if (!(Number.isInteger(calificacion) && calificacion >= 1 && calificacion <= 5)) return { error: 'Calificación inválida' }
  return {
    data: {
      nombre, ruc, calificacion,
      contacto: texto(body.contacto), telefono: texto(body.telefono), email: texto(body.email), direccion: texto(body.direccion),
      categoria: typeof body.categoria === 'string' && CATEGORIAS.includes(body.categoria) ? body.categoria : 'general',
      ...(body.activo !== undefined ? { activo: Boolean(body.activo) } : {}),
    },
  }
}

const INCLUDE_COMPRA = { items: true, proveedor: { select: { id: true, nombre: true } } }

// ── Proveedores ───────────────────────────────────────────────────────────

// GET /api/proveedores (activos e inactivos)
router.get('/', ...soloAdmin, async (_req: Request, res: Response) => {
  res.json(await prisma.proveedor.findMany({ orderBy: { nombre: 'asc' } }))
})

// POST /api/proveedores
router.post('/', ...soloAdmin, async (req: Request, res: Response): Promise<void> => {
  const r = datosProveedor(req.body)
  if ('error' in r) { res.status(400).json({ error: r.error }); return }
  if (r.data!.ruc && await prisma.proveedor.findUnique({ where: { ruc: r.data!.ruc } })) {
    res.status(409).json({ error: 'Ya existe un proveedor con ese RUC' }); return
  }
  res.status(201).json(await prisma.proveedor.create({ data: r.data! }))
})

// PATCH /api/proveedores/:id  (datos completos, o solo { activo })
router.patch('/:id', ...soloAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  if (Object.keys(req.body).length === 1 && req.body.activo !== undefined) {
    res.json(await prisma.proveedor.update({ where: { id }, data: { activo: Boolean(req.body.activo) } }))
    return
  }
  const r = datosProveedor(req.body)
  if ('error' in r) { res.status(400).json({ error: r.error }); return }
  if (r.data!.ruc) {
    const otro = await prisma.proveedor.findUnique({ where: { ruc: r.data!.ruc } })
    if (otro && otro.id !== id) { res.status(409).json({ error: 'Ya existe un proveedor con ese RUC' }); return }
  }
  res.json(await prisma.proveedor.update({ where: { id }, data: r.data! }))
})

// ── Órdenes de compra ─────────────────────────────────────────────────────

// GET /api/proveedores/compras  (todas las órdenes, más recientes primero)
router.get('/compras', ...soloAdmin, async (_req: Request, res: Response) => {
  res.json(await prisma.compra.findMany({ include: INCLUDE_COMPRA, orderBy: { fecha: 'desc' }, take: 300 }))
})

// POST /api/proveedores/compras { proveedorId, fechaEntrega?, notas?, items: [{ nombre, unidad, cantidad, precioUnit, insumoId? }] }
router.post('/compras', ...soloAdmin, async (req: Request, res: Response): Promise<void> => {
  const { proveedorId, fechaEntrega, notas } = req.body
  const items = Array.isArray(req.body.items) ? req.body.items : []
  const proveedor = await prisma.proveedor.findUnique({ where: { id: String(proveedorId ?? '') } })
  if (!proveedor || !proveedor.activo) { res.status(400).json({ error: 'Elige un proveedor activo' }); return }
  if (items.length === 0) { res.status(400).json({ error: 'La orden no tiene ítems' }); return }

  const limpios = []
  for (const i of items) {
    const nombre = typeof i.nombre === 'string' ? i.nombre.trim() : ''
    const cantidad = Number(i.cantidad), precioUnit = Number(i.precioUnit)
    if (!nombre || !(cantidad > 0) || !(precioUnit >= 0)) { res.status(400).json({ error: 'Revisa los ítems: nombre, cantidad y precio' }); return }
    limpios.push({
      nombre, cantidad: r3(cantidad), precioUnit: r2(precioUnit), subtotal: r2(cantidad * precioUnit),
      unidad: typeof i.unidad === 'string' && i.unidad ? i.unidad : 'unidad',
      insumoId: typeof i.insumoId === 'string' && i.insumoId ? i.insumoId : null,
    })
  }
  const compra = await prisma.compra.create({
    data: {
      proveedorId: proveedor.id,
      total: r2(limpios.reduce((a, i) => a + i.subtotal, 0)),
      fechaEntrega: fechaEntrega ? new Date(fechaEntrega) : null,
      notas: typeof notas === 'string' ? notas.trim() || null : null,
      creadoPor: await nombreDeUsuario(req.usuario?.id),
      items: { create: limpios },
    },
    include: INCLUDE_COMPRA,
  })
  res.status(201).json(compra)
})

// PATCH /api/proveedores/compras/:id/estado { estado }
// Al pasar a "recibida": los ítems vinculados a un insumo entran al inventario y actualizan su costo.
router.patch('/compras/:id/estado', ...soloAdmin, async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const estado = String(req.body.estado ?? '')
  const compra = await prisma.compra.findUnique({ where: { id }, include: { items: true } })
  if (!compra) { res.status(404).json({ error: 'Orden no encontrada' }); return }
  if (compra.estado === estado) { res.json(await prisma.compra.findUnique({ where: { id }, include: INCLUDE_COMPRA })); return }
  if (!(TRANSICIONES[compra.estado] ?? []).includes(estado)) {
    res.status(400).json({ error: `No se puede pasar de "${compra.estado}" a "${estado}"` }); return
  }

  const operaciones = []
  if (estado === 'recibida') {
    const usuario = await nombreDeUsuario(req.usuario?.id)
    for (const item of compra.items.filter((i) => i.insumoId)) {
      const insumo = await prisma.insumo.findUnique({ where: { id: item.insumoId! } })
      if (!insumo) continue
      const nuevoStock = r3(insumo.stockActual + item.cantidad)
      operaciones.push(
        prisma.insumo.update({ where: { id: insumo.id }, data: { stockActual: nuevoStock, precioUnitario: item.precioUnit } }),
        prisma.movimientoStock.create({
          data: {
            insumoId: insumo.id, tipo: 'entrada', cantidad: item.cantidad, stockResultante: nuevoStock,
            motivo: `Orden de compra #${compra.numero}`, usuario, compraId: compra.id,
          },
        }),
      )
    }
  }
  operaciones.push(prisma.compra.update({
    where: { id },
    data: { estado, ...(estado === 'recibida' ? { recibidaEn: new Date() } : {}) },
  }))
  await prisma.$transaction(operaciones)
  res.json(await prisma.compra.findUnique({ where: { id }, include: INCLUDE_COMPRA }))
})

export default router
