import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar } from '../middleware/auth'
import { getIo } from '../sockets/io'

const router = Router()
const prisma = new PrismaClient()

// ── Mappers JSON ─────────────────────────────────────────────────────────────

function mapItem(i: Record<string, unknown>) {
  return {
    ...i,
    guarniciones: i.guarniciones ? JSON.parse(i.guarniciones as string) : undefined,
  }
}

function mapComanda(c: Record<string, unknown> & { items?: unknown[]; cuentas?: unknown[] }) {
  return {
    ...c,
    mesasUnidas: c.mesasUnidas ? JSON.parse(c.mesasUnidas as string) : undefined,
    items: c.items?.map((i) => mapItem(i as Record<string, unknown>)),
    cuentas: c.cuentas,
  }
}

// ── Notificaciones en tiempo real (cocina / bar) ──────────────────────────────

type ItemMapeado = { area: string; cantidad: number; nombre: string; tipoPlato?: string; guarniciones?: string[] }

function emitirItemsAgregados(
  comandaMapeada: ReturnType<typeof mapComanda>,
  itemsNuevos: ItemMapeado[],
  nuevo: boolean,
  origenSocketId: string | undefined
) {
  const itemsCocina = itemsNuevos.filter((i) => i.area === 'cocina')
  const itemsBar = itemsNuevos.filter((i) => i.area === 'bar')
  if (itemsCocina.length === 0 && itemsBar.length === 0) return
  getIo().emit('comanda:items_agregados', {
    comanda: comandaMapeada,
    nuevo,
    itemsCocina: itemsCocina.map((i) => ({ cantidad: i.cantidad, nombre: i.nombre, tipoPlato: i.tipoPlato, guarniciones: i.guarniciones })),
    itemsBar: itemsBar.map((i) => ({ cantidad: i.cantidad, nombre: i.nombre })),
    origenSocketId,
  })
}

// ── GET /api/comandas ────────────────────────────────────────────────────────
router.get('/', autenticar, async (req: Request, res: Response) => {
  const { estado, mesaId } = req.query as { estado?: string; mesaId?: string }
  const where: Record<string, unknown> = {}
  if (estado) where.estado = estado
  if (mesaId) where.mesaId = mesaId
  const comandas = await prisma.comanda.findMany({
    where,
    include: { items: true, cuentas: { include: { items: true } } },
    orderBy: { creadaEn: 'desc' },
  })
  res.json(comandas.map((c) => mapComanda(c as never)))
})

// ── GET /api/comandas/activas ────────────────────────────────────────────────
router.get('/activas', autenticar, async (_req: Request, res: Response) => {
  const comandas = await prisma.comanda.findMany({
    where: { estado: { notIn: ['cerrada', 'cancelada'] } },
    include: { items: true, cuentas: { include: { items: true } } },
    orderBy: { creadaEn: 'asc' },
  })
  res.json(comandas.map((c) => mapComanda(c as never)))
})

// ── GET /api/comandas/:id ────────────────────────────────────────────────────
router.get('/:id', autenticar, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string }
  const c = await prisma.comanda.findUnique({
    where: { id },
    include: { items: true, cuentas: { include: { items: true } } },
  })
  if (!c) { res.status(404).json({ error: 'Comanda no encontrada' }); return }
  res.json(mapComanda(c as never))
})

// ── POST /api/comandas ───────────────────────────────────────────────────────
router.post('/', autenticar, async (req: Request, res: Response) => {
  const { mesaId, numeroMesa, mozo, items, tipoDescuento, notaGeneral, mesasUnidas } = req.body
  const total: number = items.reduce(
    (acc: number, i: { cantidad: number; precioUnitario: number }) =>
      acc + i.cantidad * i.precioUnitario,
    0
  )
  const comanda = await prisma.comanda.create({
    data: {
      mesaId,
      numeroMesa,
      mozo,
      total,
      estado: 'enviada_cocina',
      tipoDescuento: tipoDescuento ?? null,
      notaGeneral: notaGeneral ?? null,
      mesasUnidas: mesasUnidas?.length ? JSON.stringify(mesasUnidas) : null,
      usuarioId: req.usuario?.id ?? null,
      items: {
        create: items.map((i: {
          productoId: string; nombre: string; cantidad: number
          precioUnitario: number; nota?: string; area: string
          tipoPlato?: string; guarniciones?: string[]
        }) => ({
          productoId: i.productoId,
          nombre: i.nombre,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
          nota: i.nota ?? null,
          area: i.area,
          tipoPlato: i.tipoPlato ?? null,
          guarniciones: i.guarniciones?.length ? JSON.stringify(i.guarniciones) : null,
        })),
      },
    },
    include: { items: true },
  })
  await prisma.mesa.update({ where: { id: mesaId }, data: { estado: 'ocupada' } })
  const mapeada = mapComanda(comanda as never)
  emitirItemsAgregados(mapeada, mapeada.items as ItemMapeado[], true, req.body.socketId)
  res.status(201).json(mapeada)
})

// ── PATCH /api/comandas/:id/estado ──────────────────────────────────────────
router.patch('/:id/estado', autenticar, async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  const { estado } = req.body
  const comanda = await prisma.comanda.update({
    where: { id },
    data: { estado },
    include: { items: true },
  })
  const mapeada = mapComanda(comanda as never)
  getIo().emit('comanda:actualizada', mapeada)
  res.json(mapeada)
})

// ── PATCH /api/comandas/:id/descuento ───────────────────────────────────────
router.patch('/:id/descuento', autenticar, async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  const { tipoDescuento } = req.body
  const comanda = await prisma.comanda.update({
    where: { id },
    data: { tipoDescuento: tipoDescuento ?? null },
    include: { items: true },
  })
  const mapeada = mapComanda(comanda as never)
  getIo().emit('comanda:actualizada', mapeada)
  res.json(mapeada)
})

// ── PATCH /api/comandas/:id/nota ────────────────────────────────────────────
router.patch('/:id/nota', autenticar, async (req: Request, res: Response) => {
  const { id } = req.params as { id: string }
  const { notaGeneral } = req.body
  const comanda = await prisma.comanda.update({
    where: { id },
    data: { notaGeneral: notaGeneral ?? null },
    include: { items: true },
  })
  const mapeada = mapComanda(comanda as never)
  getIo().emit('comanda:actualizada', mapeada)
  res.json(mapeada)
})

// ── PATCH /api/comandas/:id/items/:itemId/estado ────────────────────────────
router.patch('/:id/items/:itemId/estado', autenticar, async (req: Request, res: Response) => {
  const { id, itemId } = req.params as { id: string; itemId: string }
  const { estado, socketId } = req.body
  const item = await prisma.itemComanda.update({
    where: { id: itemId },
    data: { estado },
  })

  // Cuando el primer ítem de una comanda "enviada_cocina" empieza a prepararse,
  // la comanda entera pasa a "en_preparacion" — si no, la tarjeta se queda
  // atascada en la columna "Nuevas" del KDS aunque los ítems ya estén cocinándose.
  let comanda = await prisma.comanda.findUnique({ where: { id } })
  let comandaEstado: string | undefined
  if (estado === 'en_preparacion' && comanda?.estado === 'enviada_cocina') {
    comanda = await prisma.comanda.update({ where: { id }, data: { estado: 'en_preparacion' } })
    comandaEstado = comanda.estado
  }

  const mapeada = mapItem(item as never)
  getIo().emit('comanda:item_actualizado', {
    comandaId: id,
    numeroMesa: comanda?.numeroMesa,
    item: mapeada,
    comandaEstado,
    origenSocketId: socketId,
  })
  res.json(mapeada)
})

// ── PATCH /api/comandas/:id/items/:itemId/devolver ──────────────────────────
router.patch('/:id/items/:itemId/devolver', autenticar, async (req: Request, res: Response) => {
  const { id, itemId } = req.params as { id: string; itemId: string }
  const item = await prisma.itemComanda.update({
    where: { id: itemId },
    data: { estado: 'devuelto' },
  })
  const comanda = await prisma.comanda.findUnique({ where: { id }, select: { numeroMesa: true } })
  const mapeada = mapItem(item as never)
  getIo().emit('comanda:item_devuelto', {
    comandaId: id,
    numeroMesa: comanda?.numeroMesa,
    item: mapeada,
    origenSocketId: req.body.socketId,
  })
  res.json(mapeada)
})

// ── POST /api/comandas/:id/items (un ítem) ───────────────────────────────────
router.post('/:id/items', autenticar, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string }
  const { productoId, nombre, cantidad, precioUnitario, nota, area, tipoPlato, guarniciones, socketId } = req.body
  const comanda = await prisma.comanda.findUnique({ where: { id } })
  if (!comanda) { res.status(404).json({ error: 'Comanda no encontrada' }); return }

  const item = await prisma.itemComanda.create({
    data: {
      comandaId: id, productoId, nombre, cantidad, precioUnitario,
      nota: nota ?? null, area,
      tipoPlato: tipoPlato ?? null,
      guarniciones: guarniciones?.length ? JSON.stringify(guarniciones) : null,
    },
  })
  const actualizada = await prisma.comanda.update({
    where: { id },
    data: { total: comanda.total + cantidad * precioUnitario, estado: 'enviada_cocina' },
    include: { items: true },
  })
  const mapeada = mapComanda(actualizada as never)
  emitirItemsAgregados(mapeada, [mapItem(item as never) as ItemMapeado], false, socketId)
  res.status(201).json(mapItem(item as never))
})

// ── POST /api/comandas/:id/items/batch (múltiples ítems) ────────────────────
router.post('/:id/items/batch', autenticar, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string }
  type ItemDto = {
    productoId: string; nombre: string; cantidad: number; precioUnitario: number
    nota?: string; area: string; tipoPlato?: string; guarniciones?: string[]
  }
  const { items, socketId }: { items: ItemDto[]; socketId?: string } = req.body
  const comanda = await prisma.comanda.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!comanda) { res.status(404).json({ error: 'Comanda no encontrada' }); return }

  await prisma.$transaction(
    items.map((i) =>
      prisma.itemComanda.create({
        data: {
          comandaId: id,
          productoId: i.productoId,
          nombre: i.nombre,
          cantidad: i.cantidad,
          precioUnitario: i.precioUnitario,
          nota: i.nota ?? null,
          area: i.area,
          tipoPlato: i.tipoPlato ?? null,
          guarniciones: i.guarniciones?.length ? JSON.stringify(i.guarniciones) : null,
        },
      })
    )
  )

  const addedTotal = items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0)
  const updatedComanda = await prisma.comanda.update({
    where: { id },
    data: { total: comanda.total + addedTotal, estado: 'enviada_cocina' },
    include: { items: true, cuentas: { include: { items: true } } },
  })

  const mapeada = mapComanda(updatedComanda as never)
  const idsPrevios = new Set(comanda.items.map((i) => i.id))
  const itemsNuevos = (mapeada.items as (ItemMapeado & { id: string })[]).filter((i) => !idsPrevios.has(i.id))
  emitirItemsAgregados(mapeada, itemsNuevos, false, socketId)

  res.json(mapeada)
})

// ── DELETE /api/comandas/:id/items/:itemId ──────────────────────────────────
router.delete('/:id/items/:itemId', autenticar, async (req: Request, res: Response) => {
  const { id, itemId } = req.params as { id: string; itemId: string }
  const item = await prisma.itemComanda.findUnique({ where: { id: itemId } })
  if (item) {
    const actualizado = await prisma.itemComanda.update({ where: { id: item.id }, data: { estado: 'cancelado' } })
    await prisma.comanda.update({
      where: { id },
      data: { total: { decrement: item.cantidad * item.precioUnitario } },
    })
    getIo().emit('comanda:item_actualizado', { comandaId: id, item: mapItem(actualizado as never), origenSocketId: req.body?.socketId })
  }
  res.status(204).send()
})

// ── POST /api/comandas/:id/cuentas ──────────────────────────────────────────
router.post('/:id/cuentas', autenticar, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string }
  const { cuentas } = req.body as {
    cuentas: {
      numero: number
      items: { itemComandaId: string; cantidad: number; subtotal: number }[]
      subtotal: number
    }[]
  }
  const comanda = await prisma.comanda.findUnique({ where: { id } })
  if (!comanda) { res.status(404).json({ error: 'Comanda no encontrada' }); return }

  const creadas = await prisma.$transaction(
    cuentas.map((c) =>
      prisma.cuentaParcial.create({
        data: {
          comandaId: id,
          numero: c.numero,
          subtotal: c.subtotal,
          total: c.subtotal,
          items: { create: c.items },
        },
        include: { items: true },
      })
    )
  )
  res.status(201).json(creadas)
})

// ── PATCH /api/comandas/:id/cuentas/:cuentaId/pagar ─────────────────────────
router.patch('/:id/cuentas/:cuentaId/pagar', autenticar, async (req: Request, res: Response) => {
  const { id, cuentaId } = req.params as { id: string; cuentaId: string }
  const { metodoPago, descuento, propina } = req.body
  const cuenta = await prisma.cuentaParcial.findUnique({ where: { id: cuentaId } })
  if (!cuenta) { res.status(404).json({ error: 'Cuenta no encontrada' }); return }
  const total = cuenta.subtotal * (1 - (descuento ?? 0) / 100) + (propina ?? 0)

  const cuentaActualizada = await prisma.cuentaParcial.update({
    where: { id: cuentaId },
    data: { metodoPago, descuento: descuento ?? 0, propina: propina ?? 0, total, estado: 'pagada', pagadoEn: new Date() },
  })

  const cuentasPendientes = await prisma.cuentaParcial.count({
    where: { comandaId: id, estado: 'pendiente' },
  })
  if (cuentasPendientes === 0) {
    await prisma.comanda.update({ where: { id }, data: { estado: 'cerrada' } })
    const comanda = await prisma.comanda.findUnique({ where: { id } })
    if (comanda) {
      await prisma.mesa.update({ where: { id: comanda.mesaId }, data: { estado: 'en_limpieza' } })
    }
  }
  res.json(cuentaActualizada)
})

export default router
