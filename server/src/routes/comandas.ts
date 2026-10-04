import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'
import { getIo } from '../sockets/io'
import { subtotalDeItems, validarPago, calcularTotales, DESCARTABLE_LLEVAR } from '../lib/cobro'
import { etiquetaComanda } from '../lib/impresion/tickets'
import { hayCajaAbierta } from './caja'
import { imprimirComandaAuto } from './impresion'
import { resolverMozo } from './turnos'
import { descontarVenta, devolverVenta, enSegundoPlano, SIN_PREPARAR } from '../lib/inventarioVentas'

const router = Router()
const prisma = new PrismaClient()

// ── Mappers JSON ─────────────────────────────────────────────────────────────

const INCLUDE_CUENTAS = { include: { items: { include: { itemComanda: true } } }, orderBy: { numero: 'asc' as const } }
const INCLUDE_COMPLETO = { items: true, cuentas: INCLUDE_CUENTAS }

type CuentaDb = Record<string, unknown> & {
  items?: { itemComandaId: string; cantidad: number; subtotal: number; itemComanda?: { nombre: string; precioUnitario: number } }[]
}
function mapCuenta(c: CuentaDb) {
  return {
    ...c,
    items: (c.items ?? []).map((i) => ({
      itemComandaId: i.itemComandaId,
      cantidad: i.cantidad,
      subtotal: i.subtotal,
      nombre: i.itemComanda?.nombre ?? '',
      precioUnitario: i.itemComanda?.precioUnitario ?? 0,
    })),
  }
}

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
    cuentas: (c.cuentas as CuentaDb[] | undefined)?.map(mapCuenta),
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
  // Ticket automático en las impresoras de Cocina / Bar (los ítems vienen completos: nota, precio…)
  imprimirComandaAuto(comandaMapeada as never, itemsNuevos as never, nuevo)
  // Inventario: descuenta los insumos según la receta de cada producto
  enSegundoPlano(descontarVenta(itemsNuevos as never, etiquetaComanda(comandaMapeada as never)), 'descontar venta')
}

// ── GET /api/comandas ────────────────────────────────────────────────────────
router.get('/', autenticar, async (req: Request, res: Response) => {
  const { estado, mesaId, cobradaDesde, cobradaHasta, tipo, creadaDesde } = req.query as Record<string, string | undefined>
  const where: Record<string, unknown> = {}
  if (estado) where.estado = estado
  else if (cobradaDesde || cobradaHasta) where.estado = { not: 'cancelada' }
  if (tipo) where.tipo = tipo
  if (creadaDesde) where.creadaEn = { gte: new Date(creadaDesde) }
  if (mesaId) where.mesaId = mesaId
  // ?cobradaDesde=ISO&cobradaHasta=ISO → pedidos cobrados en ese rango
  if (cobradaDesde || cobradaHasta) {
    where.cobradaEn = {
      ...(cobradaDesde ? { gte: new Date(cobradaDesde) } : {}),
      ...(cobradaHasta ? { lte: new Date(cobradaHasta) } : {}),
    }
  }
  const comandas = await prisma.comanda.findMany({
    where,
    include: { items: true, cuentas: INCLUDE_CUENTAS },
    orderBy: { creadaEn: 'desc' },
  })
  res.json(comandas.map((c) => mapComanda(c as never)))
})

// ── GET /api/comandas/activas ────────────────────────────────────────────────
router.get('/activas', autenticar, async (_req: Request, res: Response) => {
  const comandas = await prisma.comanda.findMany({
    where: { estado: { notIn: ['cerrada', 'cancelada'] } },
    include: { items: true, cuentas: INCLUDE_CUENTAS },
    orderBy: { creadaEn: 'asc' },
  })
  res.json(comandas.map((c) => mapComanda(c as never)))
})

// ── GET /api/comandas/:id ────────────────────────────────────────────────────
router.get('/:id', autenticar, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string }
  const c = await prisma.comanda.findUnique({
    where: { id },
    include: { items: true, cuentas: INCLUDE_CUENTAS },
  })
  if (!c) { res.status(404).json({ error: 'Comanda no encontrada' }); return }
  res.json(mapComanda(c as never))
})

// ── POST /api/comandas ───────────────────────────────────────────────────────
router.post('/', autenticar, async (req: Request, res: Response): Promise<void> => {
  const { id, mesaId, numeroMesa, mozo, items, tipoDescuento, notaGeneral, mesasUnidas } = req.body
  // Idempotente: la tablet genera el id; si un reenvío (WiFi cortado) llega dos veces, no se duplica
  if (id) {
    const existente = await prisma.comanda.findUnique({ where: { id }, include: { items: true } })
    if (existente) { res.status(200).json(mapComanda(existente as never)); return }
  }

  // ── Validaciones del turno y del pedido ──
  const quien = await resolverMozo(req.usuario, mozo)
  if ('error' in quien) { res.status(quien.status).json({ error: quien.error }); return }
  if (!Array.isArray(items) || items.length === 0) { res.status(400).json({ error: 'El pedido no tiene ítems' }); return }
  const mesa = await prisma.mesa.findUnique({ where: { id: String(mesaId ?? '') } })
  if (!mesa) { res.status(404).json({ error: 'La mesa no existe' }); return }
  const yaAbierta = await prisma.comanda.findFirst({ where: { mesaId: mesa.id, estado: { notIn: ['cerrada', 'cancelada'] } } })
  if (yaAbierta) { res.status(409).json({ error: `La mesa ${mesa.numero} ya tiene un pedido abierto: agrega los ítems a ese pedido` }); return }

  const total: number = items.reduce(
    (acc: number, i: { cantidad: number; precioUnitario: number }) =>
      acc + i.cantidad * i.precioUnitario,
    0
  )
  const comanda = await prisma.comanda.create({
    data: {
      ...(id ? { id } : {}),
      mesaId: mesa.id,
      numeroMesa: mesa.numero,
      mozo: quien.nombre,
      total,
      estado: 'enviada_cocina',
      tipoDescuento: tipoDescuento ?? null,
      notaGeneral: notaGeneral ?? null,
      mesasUnidas: mesasUnidas?.length ? JSON.stringify(mesasUnidas) : null,
      usuarioId: req.usuario?.id ?? null,
      items: {
        create: items.map((i: {
          id?: string; productoId: string; nombre: string; cantidad: number
          precioUnitario: number; nota?: string; area: string
          tipoPlato?: string; guarniciones?: string[]
        }) => ({
          ...(i.id ? { id: i.id } : {}),
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
router.patch('/:id/estado', autenticar, async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string }
  const { estado } = req.body
  // Cerrar solo se hace cobrando (POST /:id/cobrar), para que nunca falte el registro del pago
  if (estado === 'cerrada') { res.status(400).json({ error: 'Para cerrar la comanda hay que cobrarla en Caja' }); return }
  if (estado === 'cancelada') {
    const c = await prisma.comanda.findUnique({ where: { id }, select: { tipo: true } })
    if (c?.tipo === 'pedido') { res.status(400).json({ error: 'Cancela el pedido desde Pedidos (pide el motivo)' }); return }
  }
  if (estado === 'cancelada') {
    const pendientes = await prisma.itemComanda.findMany({ where: { comandaId: id, estado: { in: SIN_PREPARAR } } })
    const porId = new Map(pendientes.map((it) => [it.id, it]))
    enSegundoPlano(devolverVenta(pendientes.map((it) => it.id), (itemId) => {
      const it = porId.get(itemId)!
      return `Pedido cancelado · ${it.cantidad}× ${it.nombre}`
    }), 'devolver pedido cancelado')
  }
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
  const previo = await prisma.itemComanda.findUnique({ where: { id: itemId }, select: { estado: true } })
  const item = await prisma.itemComanda.update({
    where: { id: itemId },
    data: { estado },
  })
  if (estado === 'cancelado' && previo && SIN_PREPARAR.includes(previo.estado)) {
    enSegundoPlano(devolverVenta(item.id, `Anulado antes de preparar · ${item.cantidad}× ${item.nombre}`), 'devolver ítem')
  }

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
    id?: string; productoId: string; nombre: string; cantidad: number; precioUnitario: number
    nota?: string; area: string; tipoPlato?: string; guarniciones?: string[]
  }
  const { items, socketId }: { items: ItemDto[]; socketId?: string } = req.body
  const comanda = await prisma.comanda.findUnique({
    where: { id },
    include: { items: true },
  })
  if (!comanda) { res.status(404).json({ error: 'Comanda no encontrada' }); return }

  // Idempotente: si es un reenvío, los ítems que ya existen (mismo id) no se vuelven a crear
  const yaGuardados = new Set(comanda.items.map((i) => i.id))
  const aCrear = items.filter((i) => !i.id || !yaGuardados.has(i.id))
  if (aCrear.length === 0) {
    const actual = await prisma.comanda.findUnique({ where: { id }, include: { items: true, cuentas: INCLUDE_CUENTAS } })
    res.json(mapComanda(actual as never))
    return
  }
  if (comanda.estado === 'cerrada' || comanda.estado === 'cancelada') { res.status(409).json({ error: 'La comanda ya está cerrada' }); return }
  // Un pedido ya pagado no admite más ítems: se cobraría menos de lo entregado
  if (comanda.cobradaEn) { res.status(409).json({ error: 'El pedido ya está pagado: registra lo adicional como un pedido nuevo' }); return }

  await prisma.$transaction(
    aCrear.map((i) =>
      prisma.itemComanda.create({
        data: {
          ...(i.id ? { id: i.id } : {}),
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

  const addedTotal = aCrear.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0)
  const updatedComanda = await prisma.comanda.update({
    where: { id },
    data: { total: comanda.total + addedTotal, estado: 'enviada_cocina' },
    include: { items: true, cuentas: INCLUDE_CUENTAS },
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
    if (SIN_PREPARAR.includes(item.estado)) {
      enSegundoPlano(devolverVenta(item.id, `Anulado antes de preparar · ${item.cantidad}× ${item.nombre}`), 'devolver ítem')
    }
    await prisma.comanda.update({
      where: { id },
      data: { total: { decrement: item.cantidad * item.precioUnitario } },
    })
    getIo().emit('comanda:item_actualizado', { comandaId: id, item: mapItem(actualizado as never), origenSocketId: req.body?.socketId })
  }
  res.status(204).send()
})

// ── Cobro ─────────────────────────────────────────────────────────────────────

async function nombreDe(usuarioId?: string) {
  if (!usuarioId) return null
  const u = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { nombre: true } })
  return u?.nombre ?? null
}

// Cierra el pedido, libera la mesa a "en limpieza" y avisa a todas las pantallas
async function cerrarComanda(id: string, datos: Record<string, unknown>) {
  const comanda = await prisma.comanda.update({
    where: { id },
    data: { ...datos, estado: 'cerrada', cobradaEn: new Date() },
    include: INCLUDE_COMPLETO,
  })
  if (comanda.mesaId) await prisma.mesa.update({ where: { id: comanda.mesaId }, data: { estado: 'en_limpieza' } }).catch(() => {})
  const mapeada = mapComanda(comanda as never)
  getIo().emit('comanda:actualizada', mapeada)
  return mapeada
}

// ── POST /api/comandas/:id/cobrar ───────────────────────────────────────────
// El servidor recalcula subtotal, descuento y total: no se confía en lo que manda el navegador.
router.post('/:id/cobrar', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string }
  const comanda = await prisma.comanda.findUnique({ where: { id }, include: INCLUDE_COMPLETO })
  if (!comanda) { res.status(404).json({ error: 'Comanda no encontrada' }); return }
  // Idempotente: si ya se cobró (doble clic, reintento), devuelve el cobro existente
  if (comanda.estado === 'cerrada' || comanda.cobradaEn) { res.json(mapComanda(comanda as never)); return }
  if (comanda.estado === 'cancelada') { res.status(409).json({ error: 'La comanda está cancelada' }); return }
  if (comanda.cuentas.length > 0) { res.status(409).json({ error: 'Esta cuenta está dividida: cóbrala desde "Dividir"' }); return }
  if (!(await hayCajaAbierta())) { res.status(409).json({ error: 'La caja está cerrada: ábrela antes de cobrar' }); return }

  const subtotal = subtotalDeItems(comanda.items)
  // El descartable se cobra aparte: no recibe descuento
  const r = validarPago(req.body, subtotal, comanda.descartable)
  if ('error' in r) { res.status(400).json({ error: r.error }); return }
  const datos = { ...r.datos, subtotal: subtotal + comanda.descartable, cobradaPor: await nombreDe(req.usuario?.id) }

  if (comanda.tipo === 'pedido') {
    // Pedido: queda pagado (adelantado o al recoger) pero sigue abierto hasta entregarlo
    const pagado = await prisma.comanda.update({ where: { id }, data: { ...datos, cobradaEn: new Date() }, include: INCLUDE_COMPLETO })
    const mapeada = mapComanda(pagado as never)
    getIo().emit('comanda:actualizada', mapeada)
    res.json(mapeada)
    return
  }
  const mapeada = await cerrarComanda(id, datos)
  res.json(mapeada)
})

// ── POST /api/comandas/:id/cuentas ──────────────────────────────────────────
// Divide la cuenta. Body: { cuentas: [{ numero, items: [{ itemComandaId, cantidad }] }] }
// Si ya estaba dividida y aún no se pagó ninguna cuenta, reemplaza la división.
router.post('/:id/cuentas', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string }
  const { cuentas } = req.body as { cuentas: { numero: number; items: { itemComandaId: string; cantidad: number }[] }[] }
  const comanda = await prisma.comanda.findUnique({ where: { id }, include: INCLUDE_COMPLETO })
  if (!comanda) { res.status(404).json({ error: 'Comanda no encontrada' }); return }
  if (comanda.estado === 'cerrada' || comanda.estado === 'cancelada') { res.status(409).json({ error: 'La comanda ya está cerrada' }); return }
  if (comanda.tipo === 'pedido') { res.status(409).json({ error: 'Los pedidos por teléfono no se dividen' }); return }
  if (comanda.cuentas.some((c) => c.estado === 'pagada')) { res.status(409).json({ error: 'Ya hay cuentas pagadas: no se puede volver a dividir' }); return }
  if (!Array.isArray(cuentas) || cuentas.length === 0) { res.status(400).json({ error: 'No hay cuentas' }); return }

  // Precios desde la base, y no se puede asignar más de lo que se pidió
  const itemsComanda = new Map(comanda.items.filter((i) => i.estado !== 'cancelado' && i.estado !== 'devuelto').map((i) => [i.id, i]))
  const asignado = new Map<string, number>()
  for (const c of cuentas) {
    for (const it of c.items) {
      const original = itemsComanda.get(it.itemComandaId)
      if (!original || !(it.cantidad > 0)) { res.status(400).json({ error: 'Ítem inválido en la división' }); return }
      asignado.set(it.itemComandaId, (asignado.get(it.itemComandaId) ?? 0) + it.cantidad)
      if (asignado.get(it.itemComandaId)! > original.cantidad) { res.status(400).json({ error: `Se asignó de más: ${original.nombre}` }); return }
    }
  }

  await prisma.$transaction([
    prisma.cuentaParcial.deleteMany({ where: { comandaId: id } }),
    ...cuentas.filter((c) => c.items.length > 0).map((c) => {
      const items = c.items.map((it) => ({
        itemComandaId: it.itemComandaId,
        cantidad: it.cantidad,
        subtotal: Math.round(it.cantidad * itemsComanda.get(it.itemComandaId)!.precioUnitario * 100) / 100,
      }))
      const subtotal = Math.round(items.reduce((a, it) => a + it.subtotal, 0) * 100) / 100
      return prisma.cuentaParcial.create({
        data: { comandaId: id, numero: c.numero, subtotal, total: subtotal, items: { create: items } },
      })
    }),
  ])
  const actualizada = await prisma.comanda.findUnique({ where: { id }, include: INCLUDE_COMPLETO })
  const mapeada = mapComanda(actualizada as never)
  getIo().emit('comanda:actualizada', mapeada)
  res.status(201).json(mapeada)
})

// ── PATCH /api/comandas/:id/cuentas/:cuentaId/pagar ─────────────────────────
// Body: { metodoPago: efectivo|tarjeta|yape_plin, descuento (%), propina }
// Al pagarse la última cuenta, el pedido se cierra con metodoPago "dividida" y los totales sumados.
router.patch('/:id/cuentas/:cuentaId/pagar', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response): Promise<void> => {
  const { id, cuentaId } = req.params as { id: string; cuentaId: string }
  const cuenta = await prisma.cuentaParcial.findUnique({ where: { id: cuentaId } })
  if (!cuenta || cuenta.comandaId !== id) { res.status(404).json({ error: 'Cuenta no encontrada' }); return }

  if (cuenta.estado !== 'pagada') {
    if (!(await hayCajaAbierta())) { res.status(409).json({ error: 'La caja está cerrada: ábrela antes de cobrar' }); return }
    const metodoPago = String(req.body.metodoPago ?? '')
    if (!['efectivo', 'tarjeta', 'yape_plin'].includes(metodoPago)) { res.status(400).json({ error: 'Método de pago inválido' }); return }
    const descuento = Number(req.body.descuento ?? 0)
    const propina = Number(req.body.propina ?? 0)
    if (!(descuento >= 0 && descuento <= 100) || !(propina >= 0)) { res.status(400).json({ error: 'Descuento o propina inválidos' }); return }
    const { totalCobrado } = calcularTotales(cuenta.subtotal, descuento, propina)
    await prisma.cuentaParcial.update({
      where: { id: cuentaId },
      data: { metodoPago, descuento, propina, total: totalCobrado, estado: 'pagada', pagadoEn: new Date() },
    })
  }

  const comanda = await prisma.comanda.findUnique({ where: { id }, include: INCLUDE_COMPLETO })
  if (!comanda) { res.status(404).json({ error: 'Comanda no encontrada' }); return }
  const pendientes = comanda.cuentas.filter((c) => c.estado !== 'pagada').length

  if (pendientes === 0 && comanda.estado !== 'cerrada') {
    const subtotal = comanda.cuentas.reduce((a, c) => a + c.subtotal, 0)
    const descuentoMonto = comanda.cuentas.reduce((a, c) => a + c.subtotal * (c.descuento / 100), 0)
    const propina = comanda.cuentas.reduce((a, c) => a + c.propina, 0)
    const totalCobrado = comanda.cuentas.reduce((a, c) => a + c.total, 0)
    const efectivo = comanda.cuentas.filter((c) => c.metodoPago === 'efectivo').reduce((a, c) => a + c.total, 0)
    const r2 = (n: number) => Math.round(n * 100) / 100
    const mapeada = await cerrarComanda(id, {
      metodoPago: 'dividida',
      subtotal: r2(subtotal),
      descuentoPct: subtotal > 0 ? r2((descuentoMonto / subtotal) * 100) : 0,
      descuentoMonto: r2(descuentoMonto),
      propina: r2(propina),
      totalCobrado: r2(totalCobrado),
      montoEfectivo: r2(efectivo),
      cobradaPor: await nombreDe(req.usuario?.id),
    })
    res.json(mapeada)
    return
  }
  const mapeada = mapComanda(comanda as never)
  getIo().emit('comanda:actualizada', mapeada)
  res.json(mapeada)
})


// ── Pedidos por teléfono ──────────────────────────────────────────────────────
// Sin mesa ni turno: el cliente llama, se registra con su nombre y va a Cocina/Bar como
// cualquier comanda. Se cobra (adelantado o al recoger) y luego se entrega.
// No se fía: no se entrega sin pagar.

const ROLES_PEDIDOS = ['admin', 'cajero', 'mozo']

// POST /api/comandas/pedidos
// Body: { id?, clienteNombre, clienteTelefono?, paraLlevar, horaRecojo?, notaGeneral?, tipoDescuento?, items[] }
router.post('/pedidos', autenticar, requerirRol(...ROLES_PEDIDOS), async (req: Request, res: Response): Promise<void> => {
  const { id, items, tipoDescuento, notaGeneral, horaRecojo } = req.body
  // Idempotente (WiFi): el mismo id no crea dos pedidos
  if (id) {
    const existente = await prisma.comanda.findUnique({ where: { id }, include: INCLUDE_COMPLETO })
    if (existente) { res.status(200).json(mapComanda(existente as never)); return }
  }
  const clienteNombre = typeof req.body.clienteNombre === 'string' ? req.body.clienteNombre.trim() : ''
  const clienteTelefono = typeof req.body.clienteTelefono === 'string' ? req.body.clienteTelefono.trim() || null : null
  if (!clienteNombre) { res.status(400).json({ error: 'Escribe el nombre del cliente' }); return }
  if (!Array.isArray(items) || items.length === 0) { res.status(400).json({ error: 'El pedido no tiene platos ni bebidas' }); return }
  const recojo = horaRecojo ? new Date(horaRecojo) : null
  if (recojo && isNaN(recojo.getTime())) { res.status(400).json({ error: 'Hora de recojo inválida' }); return }
  const paraLlevar = req.body.paraLlevar !== false   // por defecto, para llevar

  const comanda = await prisma.comanda.create({
    data: {
      ...(id ? { id } : {}),
      tipo: 'pedido',
      mesaId: null,
      numeroMesa: 0,
      clienteNombre, clienteTelefono, paraLlevar,
      descartable: paraLlevar ? DESCARTABLE_LLEVAR : 0,
      horaRecojo: recojo,
      mozo: (await nombreDe(req.usuario?.id)) ?? 'Caja',
      usuarioId: req.usuario?.id ?? null,
      estado: 'enviada_cocina',
      total: subtotalDeItems(items.map((i: { cantidad: number; precioUnitario: number }) => ({ ...i, estado: 'pendiente' }))),
      tipoDescuento: tipoDescuento ?? null,
      notaGeneral: notaGeneral ?? null,
      items: {
        create: items.map((i: {
          id?: string; productoId: string; nombre: string; cantidad: number
          precioUnitario: number; nota?: string; area: string; tipoPlato?: string; guarniciones?: string[]
        }) => ({
          ...(i.id ? { id: i.id } : {}),
          productoId: i.productoId, nombre: i.nombre, cantidad: i.cantidad, precioUnitario: i.precioUnitario,
          nota: i.nota ?? null, area: i.area, tipoPlato: i.tipoPlato ?? null,
          guarniciones: i.guarniciones?.length ? JSON.stringify(i.guarniciones) : null,
        })),
      },
    },
    include: INCLUDE_COMPLETO,
  })
  const mapeada = mapComanda(comanda as never)
  // Cocina/Bar, impresión automática e inventario: igual que una comanda de mesa
  emitirItemsAgregados(mapeada, mapeada.items as ItemMapeado[], true, req.body.socketId)
  res.status(201).json(mapeada)
})

// POST /api/comandas/:id/entregar → solo si está pagado
router.post('/:id/entregar', autenticar, requerirRol(...ROLES_PEDIDOS), async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const c = await prisma.comanda.findUnique({ where: { id } })
  if (!c || c.tipo !== 'pedido') { res.status(404).json({ error: 'Pedido no encontrado' }); return }
  if (c.estado === 'cancelada') { res.status(409).json({ error: 'El pedido está cancelado' }); return }
  if (c.estado === 'cerrada') { res.json(mapComanda((await prisma.comanda.findUnique({ where: { id }, include: INCLUDE_COMPLETO })) as never)); return }
  if (!c.cobradaEn) { res.status(409).json({ error: 'No se fía: cobra el pedido antes de entregarlo' }); return }
  const entregado = await prisma.comanda.update({
    where: { id }, data: { estado: 'cerrada', entregadaEn: new Date() }, include: INCLUDE_COMPLETO,
  })
  const mapeada = mapComanda(entregado as never)
  getIo().emit('comanda:actualizada', mapeada)
  res.json(mapeada)
})

// POST /api/comandas/:id/cancelar { motivo } → si estaba pagado, se devuelve el dinero
// (el cobro deja de contar en ventas y en el arqueo de caja)
router.post('/:id/cancelar', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : ''
  const c = await prisma.comanda.findUnique({ where: { id } })
  if (!c || c.tipo !== 'pedido') { res.status(404).json({ error: 'Pedido no encontrado' }); return }
  if (c.estado === 'cerrada') { res.status(409).json({ error: 'El pedido ya se entregó: no se puede cancelar' }); return }
  if (c.estado === 'cancelada') { res.json(mapComanda((await prisma.comanda.findUnique({ where: { id }, include: INCLUDE_COMPLETO })) as never)); return }
  if (!motivo) { res.status(400).json({ error: 'Indica el motivo de la cancelación' }); return }

  // Lo que la cocina no empezó vuelve al inventario
  const pendientes = await prisma.itemComanda.findMany({ where: { comandaId: id, estado: { in: SIN_PREPARAR } } })
  const porId = new Map(pendientes.map((it) => [it.id, it]))
  enSegundoPlano(devolverVenta(pendientes.map((it) => it.id), (itemId) => {
    const it = porId.get(itemId)!
    return `Pedido #${c.numero} cancelado · ${it.cantidad}× ${it.nombre}`
  }), 'devolver pedido cancelado')

  const cancelado = await prisma.comanda.update({
    where: { id }, data: { estado: 'cancelada', motivoCancelacion: motivo }, include: INCLUDE_COMPLETO,
  })
  const mapeada = mapComanda(cancelado as never)
  getIo().emit('comanda:actualizada', mapeada)
  res.json({ ...mapeada, reembolso: c.cobradaEn ? c.totalCobrado : 0 })
})


export default router
