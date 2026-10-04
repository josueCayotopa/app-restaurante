import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'
import { imprimir, obtenerHistorial, reintentar, invalidarImpresoras, type Area } from '../lib/impresion/servicio'
import { ticketComanda, ticketCobro, ticketCierre, ticketPrueba, type ItemTicket } from '../lib/impresion/tickets'

const router = Router()
const prisma = new PrismaClient()

const AREAS = ['cocina', 'bar', 'caja']
const TIPOS = ['red', 'equipo']
const IP_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

function datosImpresora(body: Record<string, unknown>) {
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  const area = String(body.area ?? '')
  const tipo = String(body.tipo ?? 'red')
  const ip = typeof body.ip === 'string' ? body.ip.trim() : ''
  const puerto = Number(body.puerto ?? 9100)
  const ancho = Number(body.ancho ?? 80)
  const copias = Number(body.copias ?? 1)
  if (!nombre) return { error: 'El nombre es obligatorio' }
  if (!AREAS.includes(area)) return { error: 'Área inválida' }
  if (!TIPOS.includes(tipo)) return { error: 'Tipo de conexión inválido' }
  if (tipo === 'red') {
    const m = ip.match(IP_RE)
    if (!m || m.slice(1).some((x) => Number(x) > 255)) return { error: 'Escribe una IP válida, ej. 192.168.1.100' }
    if (!(Number.isInteger(puerto) && puerto > 0 && puerto < 65536)) return { error: 'Puerto inválido (normalmente 9100)' }
  }
  if (![58, 80].includes(ancho)) return { error: 'El ancho debe ser 58 u 80 mm' }
  if (!(Number.isInteger(copias) && copias >= 1 && copias <= 5)) return { error: 'Copias: entre 1 y 5' }
  return {
    data: {
      nombre, area, tipo, ancho, copias,
      ip: tipo === 'red' ? ip : null,
      puerto: tipo === 'red' ? puerto : 9100,
      activa: body.activa === undefined ? true : Boolean(body.activa),
      autoImprimir: body.autoImprimir === undefined ? true : Boolean(body.autoImprimir),
      abrirGaveta: area === 'caja' && Boolean(body.abrirGaveta),
    },
  }
}

// Comanda con sus ítems listos para el ticket (guarniciones JSON → lista)
async function comandaParaTicket(id: string) {
  const c = await prisma.comanda.findUnique({ where: { id }, include: { items: true, cuentas: { orderBy: { numero: 'asc' } } } })
  if (!c) return null
  return {
    ...c,
    mesasUnidas: c.mesasUnidas ? (JSON.parse(c.mesasUnidas) as number[]) : null,
    items: c.items.map((i) => ({ ...i, guarniciones: i.guarniciones ? (JSON.parse(i.guarniciones) as string[]) : null })),
  }
}

// ── Impresoras (CRUD) ─────────────────────────────────────────────────────

// GET /api/impresoras — cualquier usuario (cada equipo elige en Configuración cuáles tiene conectadas)
router.get('/impresoras', autenticar, async (_req: Request, res: Response) => {
  res.json(await prisma.impresora.findMany({ orderBy: [{ area: 'asc' }, { nombre: 'asc' }] }))
})

router.post('/impresoras', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const r = datosImpresora(req.body)
  if ('error' in r) { res.status(400).json({ error: r.error }); return }
  res.status(201).json(await prisma.impresora.create({ data: r.data! }))
  invalidarImpresoras()
})

router.patch('/impresoras/:id', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  // Cambio rápido de un solo interruptor (activa / autoImprimir / abrirGaveta)
  const claves = Object.keys(req.body)
  if (claves.length === 1 && ['activa', 'autoImprimir', 'abrirGaveta'].includes(claves[0])) {
    res.json(await prisma.impresora.update({ where: { id }, data: { [claves[0]]: Boolean(req.body[claves[0]]) } }))
    invalidarImpresoras()
    return
  }
  const r = datosImpresora(req.body)
  if ('error' in r) { res.status(400).json({ error: r.error }); return }
  res.json(await prisma.impresora.update({ where: { id }, data: r.data! }))
  invalidarImpresoras()
})

router.delete('/impresoras/:id', autenticar, requerirRol('admin'), async (req: Request, res: Response) => {
  await prisma.impresora.delete({ where: { id: String(req.params.id) } })
  invalidarImpresoras()
  res.status(204).send()
})

// POST /api/impresoras/:id/prueba — imprime un ticket de prueba y espera el resultado
router.post('/impresoras/:id/prueba', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const imp = await prisma.impresora.findUnique({ where: { id: String(req.params.id) } })
  if (!imp) { res.status(404).json({ error: 'Impresora no encontrada' }); return }
  const r = await imprimir(imp.area as Area, ticketPrueba(imp), { impresoraId: imp.id, esperar: true })
  const t = obtenerHistorial().find((x) => x.id === r.trabajos[0]?.id)
  if (t?.estado === 'error') { res.status(502).json({ error: t.error }); return }
  res.json({ ok: true })
})

// ── Trabajos de impresión ─────────────────────────────────────────────────

router.get('/impresion/historial', autenticar, requerirRol('admin'), (_req: Request, res: Response) => {
  res.json(obtenerHistorial())
})

router.post('/impresion/historial/:id/reintentar', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const r = await reintentar(String(req.params.id))
  if (!r) { res.status(404).json({ error: 'Ese trabajo ya no está en el historial' }); return }
  res.json(r)
})

// Respuesta común: si el área no tiene impresoras, se devuelve el documento
// para que el navegador que lo pidió lo imprima localmente (comportamiento de siempre).
async function responder(res: Response, area: Area, doc: ReturnType<typeof ticketCobro>) {
  const r = await imprimir(area, doc)
  res.json(r.sinImpresora ? { destino: 'local', documento: doc } : { destino: 'impresora', trabajos: r.trabajos })
}

// POST /api/impresion/comanda/:id { area, itemIds? } — reimprimir desde Cocina/Bar
router.post('/impresion/comanda/:id', autenticar, async (req: Request, res: Response): Promise<void> => {
  const area = String(req.body.area ?? '')
  if (area !== 'cocina' && area !== 'bar') { res.status(400).json({ error: 'Área inválida' }); return }
  const c = await comandaParaTicket(String(req.params.id))
  if (!c) { res.status(404).json({ error: 'Comanda no encontrada' }); return }
  const ids: string[] | null = Array.isArray(req.body.itemIds) ? req.body.itemIds : null
  const items = c.items.filter((i) => i.area === area && (ids ? ids.includes(i.id) : i.estado !== 'cancelado'))
  if (items.length === 0) { res.status(400).json({ error: 'No hay ítems para imprimir' }); return }
  await responder(res, area, ticketComanda(c, items, area, false, true))
})

// POST /api/impresion/cobro/:id — boleta del cobro (y gaveta si entró efectivo)
router.post('/impresion/cobro/:id', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response): Promise<void> => {
  const c = await comandaParaTicket(String(req.params.id))
  if (!c || c.estado !== 'cerrada') { res.status(404).json({ error: 'Cobro no encontrado' }); return }
  await responder(res, 'caja', ticketCobro(c, req.body.abrirGaveta !== false))
})

// POST /api/impresion/cierre/:id — ticket de cierre de caja
router.post('/impresion/cierre/:id', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response): Promise<void> => {
  const s = await prisma.cajaSesion.findUnique({ where: { id: String(req.params.id) }, include: { movimientos: true } })
  if (!s || s.estado !== 'cerrada') { res.status(404).json({ error: 'Cierre no encontrado' }); return }
  await responder(res, 'caja', ticketCierre(s))
})

export default router

// Llamado por las rutas de comandas al llegar un pedido o una adición: un ticket por área
export function imprimirComandaAuto(
  comanda: Parameters<typeof ticketComanda>[0],
  itemsNuevos: (ItemTicket & { area: string })[],
  nuevo: boolean,
) {
  for (const area of ['cocina', 'bar'] as const) {
    const items = itemsNuevos.filter((i) => i.area === area)
    if (items.length === 0) continue
    imprimir(area, ticketComanda(comanda, items, area, nuevo), { soloAutomaticas: true })
      .catch((e) => console.error('[impresion] Error al imprimir comanda:', e))
  }
}
