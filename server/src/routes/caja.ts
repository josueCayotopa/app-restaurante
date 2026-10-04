import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'
import { desglosePorMetodo, subtotalDeItems } from '../lib/cobro'
import { nombreDeUsuario } from '../lib/usuario'
import { getIo } from '../sockets/io'

const router = Router()
const prisma = new PrismaClient()
const r2 = (n: number) => Math.round(n * 100) / 100

// Denominaciones en soles (billetes y monedas) para el conteo del arqueo
const DENOMINACIONES = [200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1]

// Resumen en vivo de una sesión: lo cobrado desde que se abrió (hasta el cierre o ahora)
async function calcularArqueo(sesion: { id: string; abiertaEn: Date; cerradaEn: Date | null; montoInicial: number }) {
  const hasta = sesion.cerradaEn ?? new Date()
  const [comandas, movimientos, pendientes] = await Promise.all([
    prisma.comanda.findMany({
      where: { estado: 'cerrada', cobradaEn: { gte: sesion.abiertaEn, lte: hasta } },
      include: { cuentas: true, items: true },
    }),
    prisma.movimientoCaja.findMany({ where: { sesionId: sesion.id }, orderBy: { creadoEn: 'asc' } }),
    prisma.comanda.count({ where: { estado: { notIn: ['cerrada', 'cancelada'] } } }),
  ])
  const metodos = { efectivo: 0, tarjeta: 0, yape_plin: 0 }
  let ventasNetas = 0, propinas = 0
  for (const c of comandas) {
    const d = desglosePorMetodo(c)
    metodos.efectivo += d.efectivo; metodos.tarjeta += d.tarjeta; metodos.yape_plin += d.yape_plin
    ventasNetas += (c.subtotal ?? subtotalDeItems(c.items)) - (c.descuentoMonto ?? 0)
    propinas += c.propina ?? 0
  }
  const ingresos = movimientos.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0)
  const retiros = movimientos.filter((m) => m.tipo === 'retiro').reduce((a, m) => a + m.monto, 0)
  return {
    pedidos: comandas.length,
    ventasNetas: r2(ventasNetas),
    propinas: r2(propinas),
    efectivoCobrado: r2(metodos.efectivo),
    tarjeta: r2(metodos.tarjeta),
    yapePlin: r2(metodos.yape_plin),
    ingresos: r2(ingresos),
    retiros: r2(retiros),
    efectivoEsperado: r2(sesion.montoInicial + metodos.efectivo + ingresos - retiros),
    pedidosSinCobrar: pendientes,
    movimientos,
  }
}

const sesionAbierta = () => prisma.cajaSesion.findFirst({ where: { estado: 'abierta' }, orderBy: { abiertaEn: 'desc' } })

// GET /api/caja/actual → { sesion: null } o la sesión abierta con su arqueo en vivo
router.get('/actual', autenticar, requerirRol('admin', 'cajero'), async (_req: Request, res: Response) => {
  const sesion = await sesionAbierta()
  if (!sesion) { res.json({ sesion: null }); return }
  res.json({ sesion, arqueo: await calcularArqueo(sesion), denominaciones: DENOMINACIONES })
})

// POST /api/caja/abrir { montoInicial }
router.post('/abrir', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response): Promise<void> => {
  const montoInicial = Number(req.body.montoInicial ?? 0)
  if (!(montoInicial >= 0)) { res.status(400).json({ error: 'El fondo inicial no puede ser negativo' }); return }
  const abierta = await sesionAbierta()
  if (abierta) { res.status(409).json({ error: `La caja ya está abierta (desde ${abierta.abiertaEn.toLocaleTimeString('es-PE')} por ${abierta.abiertaPor})` }); return }
  const sesion = await prisma.cajaSesion.create({
    data: { montoInicial: r2(montoInicial), abiertaPor: (await nombreDeUsuario(req.usuario?.id)) ?? 'Desconocido' },
  })
  getIo().emit('caja:actualizada')
  res.status(201).json({ sesion, arqueo: await calcularArqueo(sesion), denominaciones: DENOMINACIONES })
})

// POST /api/caja/movimientos { tipo: ingreso|retiro, monto, concepto }
router.post('/movimientos', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response): Promise<void> => {
  const sesion = await sesionAbierta()
  if (!sesion) { res.status(409).json({ error: 'La caja está cerrada' }); return }
  const tipo = String(req.body.tipo ?? '')
  const monto = Number(req.body.monto)
  const concepto = typeof req.body.concepto === 'string' ? req.body.concepto.trim() : ''
  if (!['ingreso', 'retiro'].includes(tipo)) { res.status(400).json({ error: 'Tipo inválido' }); return }
  if (!(monto > 0)) { res.status(400).json({ error: 'El monto debe ser mayor que 0' }); return }
  if (!concepto) { res.status(400).json({ error: 'Indica el motivo (ej. pago a proveedor, sencillo)' }); return }
  if (tipo === 'retiro') {
    const { efectivoEsperado } = await calcularArqueo(sesion)
    if (monto > efectivoEsperado + 0.001) { res.status(400).json({ error: `No hay tanto efectivo en caja (esperado S/ ${efectivoEsperado.toFixed(2)})` }); return }
  }
  await prisma.movimientoCaja.create({
    data: { sesionId: sesion.id, tipo, monto: r2(monto), concepto, usuario: await nombreDeUsuario(req.usuario?.id) },
  })
  getIo().emit('caja:actualizada')
  res.status(201).json({ sesion, arqueo: await calcularArqueo(sesion), denominaciones: DENOMINACIONES })
})

// POST /api/caja/cerrar { efectivoContado, conteo?, observaciones? }
router.post('/cerrar', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response): Promise<void> => {
  const sesion = await sesionAbierta()
  if (!sesion) { res.status(409).json({ error: 'La caja ya está cerrada' }); return }
  const efectivoContado = Number(req.body.efectivoContado)
  if (!(efectivoContado >= 0)) { res.status(400).json({ error: 'Indica el efectivo contado' }); return }
  const conteo = req.body.conteo && typeof req.body.conteo === 'object' ? JSON.stringify(req.body.conteo) : null
  const observaciones = typeof req.body.observaciones === 'string' ? req.body.observaciones.trim() || null : null

  const cerradaEn = new Date()
  const a = await calcularArqueo({ ...sesion, cerradaEn })
  const diferencia = r2(efectivoContado - a.efectivoEsperado)
  if (Math.abs(diferencia) >= 0.01 && !observaciones) {
    res.status(400).json({ error: `${diferencia < 0 ? 'Falta' : 'Sobra'} S/ ${Math.abs(diferencia).toFixed(2)}: escribe una observación para cerrar` })
    return
  }
  const cerrada = await prisma.cajaSesion.update({
    where: { id: sesion.id },
    data: {
      estado: 'cerrada', cerradaEn, cerradaPor: await nombreDeUsuario(req.usuario?.id),
      efectivoCobrado: a.efectivoCobrado, ingresos: a.ingresos, retiros: a.retiros,
      efectivoEsperado: a.efectivoEsperado, efectivoContado: r2(efectivoContado), diferencia,
      ventasNetas: a.ventasNetas, propinas: a.propinas, tarjeta: a.tarjeta, yapePlin: a.yapePlin,
      pedidos: a.pedidos, conteo, observaciones,
    },
    include: { movimientos: true },
  })
  getIo().emit('caja:actualizada')
  res.json(cerrada)
})

// GET /api/caja/historial?limite=20 → cierres anteriores (más recientes primero)
router.get('/historial', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response) => {
  const limite = Math.min(Number(req.query.limite) || 20, 100)
  const sesiones = await prisma.cajaSesion.findMany({
    where: { estado: 'cerrada' },
    include: { movimientos: true },
    orderBy: { cerradaEn: 'desc' },
    take: limite,
  })
  res.json(sesiones)
})

export default router

// Usado por las rutas de cobro: no se cobra con la caja cerrada (el arqueo no cuadraría)
export async function hayCajaAbierta() {
  return !!(await sesionAbierta())
}
