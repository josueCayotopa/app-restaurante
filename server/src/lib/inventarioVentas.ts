import { PrismaClient } from '@prisma/client'
import { getIo } from '../sockets/io'

const prisma = new PrismaClient()
const r3 = (n: number) => Math.round(n * 1000) / 1000

// Descuento de inventario por ventas, según la receta de cada producto.
//  · Se descuenta al ENVIAR el pedido (el inventario queda al día durante el servicio).
//  · Si un ítem se cancela estando aún "pendiente", el stock vuelve.
//  · Si ya se estaba preparando / estaba listo / fue devuelto, NO vuelve: la comida se usó.
//  · Nunca bloquea una venta: el stock puede quedar negativo (Inventario lo marca crítico).
// Cada movimiento guarda el itemComandaId, así nada se descuenta ni devuelve dos veces.
// Todo va en UNA transacción con una sola actualización por insumo (la base es remota:
// cada ida y vuelta cuenta).

interface ItemVendido { id: string; productoId: string; cantidad: number; nombre: string }
interface Movimiento { insumoId: string; cantidad: number; motivo: string; itemComandaId: string }

// Aplica movimientos (signo: -1 salida, +1 entrada) y registra cada uno con el stock que dejó
async function aplicar(movs: Movimiento[], tipo: 'salida' | 'entrada') {
  if (movs.length === 0) return
  const signo = tipo === 'salida' ? -1 : 1
  const totalPorInsumo = new Map<string, number>()
  for (const m of movs) totalPorInsumo.set(m.insumoId, (totalPorInsumo.get(m.insumoId) ?? 0) + m.cantidad)

  await prisma.$transaction(async (tx) => {
    const final = new Map<string, number>()
    for (const [insumoId, total] of totalPorInsumo) {
      // Suma y redondeo en la misma sentencia (atómico): evita restos como 4.850000000000001
      const [fila] = await tx.$queryRaw<{ stockActual: number }[]>`
        UPDATE "Insumo"
        SET "stockActual" = ROUND(("stockActual" + ${signo * r3(total)})::numeric, 3)::double precision,
            "actualizadoEn" = NOW()
        WHERE id = ${insumoId}
        RETURNING "stockActual"`
      if (fila) final.set(insumoId, Number(fila.stockActual))
    }
    // Stock que dejó cada movimiento: se reconstruye hacia atrás desde el final de cada insumo
    const restante = new Map(final)
    const resultantes = [...movs].reverse().map((m) => {
      const despues = restante.get(m.insumoId) ?? 0
      restante.set(m.insumoId, despues - signo * m.cantidad)
      return r3(despues)
    }).reverse()
    await tx.movimientoStock.createMany({
      data: movs.map((m, i) => ({ ...m, tipo, cantidad: r3(m.cantidad), stockResultante: resultantes[i], usuario: 'Sistema' })),
    })
  }, { timeout: 15000 })
  getIo().emit('inventario:actualizado')
}

export async function descontarVenta(items: ItemVendido[], numeroMesa: number) {
  if (items.length === 0) return
  const recetas = await prisma.recetaItem.findMany({ where: { productoId: { in: [...new Set(items.map((i) => i.productoId))] } } })
  if (recetas.length === 0) return
  // Reenvío del mismo pedido (WiFi): lo ya descontado no se descuenta otra vez
  const yaDescontados = new Set((await prisma.movimientoStock.findMany({
    where: { itemComandaId: { in: items.map((i) => i.id) }, tipo: 'salida' }, select: { itemComandaId: true },
  })).map((m) => m.itemComandaId))

  const movs: Movimiento[] = []
  for (const item of items) {
    if (yaDescontados.has(item.id)) continue
    for (const r of recetas.filter((x) => x.productoId === item.productoId)) {
      movs.push({ insumoId: r.insumoId, cantidad: r.cantidad * item.cantidad, motivo: `Venta · Mesa ${numeroMesa} · ${item.cantidad}× ${item.nombre}`, itemComandaId: item.id })
    }
  }
  await aplicar(movs, 'salida')
}

// Devuelve al stock lo descontado por uno o varios ítems (lo que no se haya devuelto ya)
export async function devolverVenta(itemComandaIds: string | string[], motivo: string | ((itemId: string) => string)) {
  const ids = Array.isArray(itemComandaIds) ? itemComandaIds : [itemComandaIds]
  if (ids.length === 0) return
  const previos = await prisma.movimientoStock.findMany({ where: { itemComandaId: { in: ids } } })
  const devueltos = new Set(previos.filter((m) => m.tipo === 'entrada').map((m) => m.itemComandaId))
  const movs = previos
    .filter((m) => m.tipo === 'salida' && !devueltos.has(m.itemComandaId))
    .map((m) => ({ insumoId: m.insumoId, cantidad: m.cantidad, itemComandaId: m.itemComandaId!, motivo: typeof motivo === 'function' ? motivo(m.itemComandaId!) : motivo }))
  await aplicar(movs, 'entrada')
}

// Estados en los que el plato todavía no se empezó: cancelarlo devuelve los insumos
export const SIN_PREPARAR = ['pendiente']

// Para no frenar ni romper un pedido si algo falla con el inventario
export function enSegundoPlano(p: Promise<unknown>, contexto: string) {
  p.catch((e) => console.error(`[inventario] ${contexto}:`, e))
}
