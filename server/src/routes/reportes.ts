import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'
import { desglosePorMetodo, subtotalDeItems } from '../lib/cobro'

const router = Router()
const prisma = new PrismaClient()

const r2 = (n: number) => Math.round(n * 100) / 100

// Fechas en hora local del servidor (la PC del restaurante): "2026-09-30" → inicio/fin de ese día
function inicioDia(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}
function finDia(fecha: string) {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999)
}
function claveDia(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const hoy = () => claveDia(new Date())
const esFecha = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

// GET /api/reportes/resumen?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
// Ventas = pedidos COBRADOS en el rango (por fecha de cobro, no de creación).
router.get('/resumen', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response): Promise<void> => {
  const desde = esFecha(req.query.desde) ? req.query.desde : hoy()
  const hasta = esFecha(req.query.hasta) ? req.query.hasta : desde
  const inicio = inicioDia(desde)
  const fin = finDia(hasta)
  if (inicio > fin) { res.status(400).json({ error: 'El rango de fechas es inválido' }); return }
  const dias = Math.round((inicioDia(hasta).getTime() - inicio.getTime()) / 86400000) + 1
  if (dias > 366) { res.status(400).json({ error: 'El rango máximo es de un año' }); return }

  const [comandas, canceladas, categorias, promociones] = await Promise.all([
    prisma.comanda.findMany({
      where: {
        // Cuenta por fecha de cobro: los pedidos por teléfono pueden estar pagados y aún sin entregar.
        // Un pedido cancelado (aunque se hubiera pagado) se reembolsa y no es venta.
        OR: [
          { estado: { not: 'cancelada' }, cobradaEn: { gte: inicio, lte: fin } },
          // Cerrados antes de existir cobradaEn: se usa la última actualización
          { estado: 'cerrada', cobradaEn: null, actualizadaEn: { gte: inicio, lte: fin } },
        ],
      },
      include: { items: { include: { producto: { select: { categoria: true } } } }, cuentas: true },
    }),
    prisma.comanda.findMany({
      where: { estado: 'cancelada', actualizadaEn: { gte: inicio, lte: fin } },
      include: { items: true },
    }),
    prisma.categoriaProducto.findMany({ select: { id: true, nombre: true } }),
    prisma.promocion.findMany({ select: { id: true, nombre: true } }),
  ])

  const nombreCategoria = new Map(categorias.map((c) => [c.id, c.nombre]))
  const nombrePromo = new Map(promociones.map((p) => [p.id, p.nombre]))

  // ── Totales ─────────────────────────────────────────────────────────────
  let subtotal = 0, descuentos = 0, propinas = 0, cobrado = 0, items = 0
  const porMetodo = { efectivo: 0, tarjeta: 0, yape_plin: 0 }
  const porMozo = new Map<string, { mozo: string; pedidos: number; ventas: number }>()
  const porProducto = new Map<string, { nombre: string; cantidad: number; ventas: number }>()
  const porCategoria = new Map<string, { categoria: string; cantidad: number; ventas: number }>()
  const porPromo = new Map<string, { promocion: string; pedidos: number; monto: number }>()
  const porHora = new Map<number, { hora: number; pedidos: number; ventas: number }>()
  const porDia = new Map<string, { fecha: string; pedidos: number; ventas: number }>()

  // Todos los días del rango, aunque no haya ventas (el gráfico no debe saltarse días)
  for (let i = 0; i < dias; i++) {
    const d = new Date(inicio); d.setDate(inicio.getDate() + i)
    porDia.set(claveDia(d), { fecha: claveDia(d), pedidos: 0, ventas: 0 })
  }

  for (const c of comandas) {
    const sub = c.subtotal ?? subtotalDeItems(c.items)
    const desc = c.descuentoMonto ?? 0
    const venta = r2(sub - desc)              // venta neta: sin propina
    subtotal += sub; descuentos += desc; propinas += c.propina ?? 0
    cobrado += c.totalCobrado ?? c.total

    const d = desglosePorMetodo(c)
    porMetodo.efectivo += d.efectivo; porMetodo.tarjeta += d.tarjeta; porMetodo.yape_plin += d.yape_plin

    const m = porMozo.get(c.mozo) ?? { mozo: c.mozo, pedidos: 0, ventas: 0 }
    m.pedidos++; m.ventas += venta; porMozo.set(c.mozo, m)

    const fecha = c.cobradaEn ?? c.actualizadaEn
    const h = porHora.get(fecha.getHours()) ?? { hora: fecha.getHours(), pedidos: 0, ventas: 0 }
    h.pedidos++; h.ventas += venta; porHora.set(fecha.getHours(), h)
    const dia = porDia.get(claveDia(fecha))
    if (dia) { dia.pedidos++; dia.ventas += venta }

    if (desc > 0) {
      const clave = c.tipoDescuento ?? 'manual'
      const p = porPromo.get(clave) ?? { promocion: nombrePromo.get(clave) ?? 'Descuento manual', pedidos: 0, monto: 0 }
      p.pedidos++; p.monto += desc; porPromo.set(clave, p)
    }

    for (const it of c.items) {
      if (it.estado === 'cancelado' || it.estado === 'devuelto') continue
      const importe = it.cantidad * it.precioUnitario
      items += it.cantidad
      const pr = porProducto.get(it.productoId) ?? { nombre: it.nombre, cantidad: 0, ventas: 0 }
      pr.cantidad += it.cantidad; pr.ventas += importe; porProducto.set(it.productoId, pr)
      const cat = it.producto?.categoria ?? 'sin_categoria'
      const pc = porCategoria.get(cat) ?? { categoria: nombreCategoria.get(cat) ?? 'Sin categoría', cantidad: 0, ventas: 0 }
      pc.cantidad += it.cantidad; pc.ventas += importe; porCategoria.set(cat, pc)
    }
  }

  const ventasNetas = r2(subtotal - descuentos)
  const redondearFilas = <T extends { ventas: number }>(xs: T[]) => xs.map((x) => ({ ...x, ventas: r2(x.ventas) }))

  res.json({
    desde, hasta, dias,
    totales: {
      pedidos: comandas.length,
      subtotal: r2(subtotal),
      descuentos: r2(descuentos),
      ventasNetas,
      propinas: r2(propinas),
      cobrado: r2(cobrado),
      ticketPromedio: comandas.length ? r2(ventasNetas / comandas.length) : 0,
      itemsVendidos: items,
      cancelados: canceladas.length,
      montoCancelado: r2(canceladas.reduce((a, c) => a + subtotalDeItems(c.items), 0)),
    },
    porMetodo: { efectivo: r2(porMetodo.efectivo), tarjeta: r2(porMetodo.tarjeta), yape_plin: r2(porMetodo.yape_plin) },
    porDia: redondearFilas([...porDia.values()]),
    porHora: redondearFilas([...porHora.values()].sort((a, b) => a.hora - b.hora)),
    porMozo: redondearFilas([...porMozo.values()].sort((a, b) => b.ventas - a.ventas)),
    topProductos: redondearFilas([...porProducto.values()].sort((a, b) => b.ventas - a.ventas).slice(0, 10)),
    porCategoria: redondearFilas([...porCategoria.values()].sort((a, b) => b.ventas - a.ventas)),
    descuentos: [...porPromo.values()].map((p) => ({ ...p, monto: r2(p.monto) })).sort((a, b) => b.monto - a.monto),
  })
})

export default router
