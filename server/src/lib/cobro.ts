// Reglas de cobro compartidas por Caja (rutas de comandas) y Reportes.

export const METODOS_PAGO = ['efectivo', 'tarjeta', 'yape_plin', 'mixto'] as const
export const METODOS_RESTO = ['tarjeta', 'yape_plin'] as const

const redondear = (n: number) => Math.round(n * 100) / 100

// Ítems que cuentan para cobrar (los cancelados y devueltos no se cobran)
export function subtotalDeItems(items: { estado: string; cantidad: number; precioUnitario: number }[]) {
  return redondear(
    items
      .filter((i) => i.estado !== 'cancelado' && i.estado !== 'devuelto')
      .reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0),
  )
}

export function calcularTotales(subtotal: number, descuentoPct: number, propina: number) {
  const descuentoMonto = redondear(subtotal * (descuentoPct / 100))
  return { descuentoMonto, totalCobrado: redondear(subtotal - descuentoMonto + propina) }
}

type DatosPago = {
  metodoPago?: unknown; descuentoPct?: unknown; propina?: unknown
  montoRecibido?: unknown; montoEfectivo?: unknown; metodoResto?: unknown
}

// Valida lo que manda Caja y devuelve los campos del cobro ya calculados por el servidor
export function validarPago(body: DatosPago, subtotal: number) {
  const metodoPago = String(body.metodoPago ?? '')
  if (!(METODOS_PAGO as readonly string[]).includes(metodoPago)) return { error: 'Método de pago inválido' }
  const descuentoPct = Number(body.descuentoPct ?? 0)
  const propina = Number(body.propina ?? 0)
  if (!(descuentoPct >= 0 && descuentoPct <= 100)) return { error: 'El descuento debe estar entre 0 y 100%' }
  if (!(propina >= 0)) return { error: 'La propina no puede ser negativa' }

  const { descuentoMonto, totalCobrado } = calcularTotales(subtotal, descuentoPct, propina)
  let montoEfectivo: number | null = null
  let metodoResto: string | null = null
  let montoRecibido: number | null = null
  let vuelto: number | null = null

  if (metodoPago === 'efectivo') {
    montoEfectivo = totalCobrado
    // Si no se indica cuánto entregó, se asume el monto exacto
    montoRecibido = body.montoRecibido == null || body.montoRecibido === '' ? totalCobrado : Number(body.montoRecibido)
    if (!(montoRecibido >= totalCobrado - 0.001)) return { error: `El monto recibido no cubre el total (S/ ${totalCobrado.toFixed(2)})` }
    vuelto = redondear(montoRecibido - totalCobrado)
  }
  if (metodoPago === 'mixto') {
    montoEfectivo = Number(body.montoEfectivo)
    metodoResto = String(body.metodoResto ?? '')
    if (!(montoEfectivo > 0 && montoEfectivo < totalCobrado)) return { error: 'En pago mixto, el efectivo debe ser mayor que 0 y menor que el total' }
    if (!(METODOS_RESTO as readonly string[]).includes(metodoResto)) return { error: 'Indica cómo se paga el resto (tarjeta o Yape/Plin)' }
    montoEfectivo = redondear(montoEfectivo)
  }
  return {
    datos: { metodoPago, descuentoPct, descuentoMonto, propina: redondear(propina), totalCobrado, montoEfectivo, metodoResto, montoRecibido, vuelto },
  }
}

export type DesgloseMetodos = { efectivo: number; tarjeta: number; yape_plin: number }

// Cuánto entró por cada medio de pago en un pedido cobrado (incluye propina)
export function desglosePorMetodo(c: {
  metodoPago: string | null; totalCobrado: number | null; total: number
  montoEfectivo: number | null; metodoResto: string | null
  cuentas?: { estado: string; metodoPago: string | null; total: number }[]
}): DesgloseMetodos {
  const d: DesgloseMetodos = { efectivo: 0, tarjeta: 0, yape_plin: 0 }
  const sumar = (metodo: string | null, monto: number) => {
    const m = (metodo ?? 'efectivo') as keyof DesgloseMetodos
    if (m in d) d[m] = redondear(d[m] + monto)
    else d.efectivo = redondear(d.efectivo + monto)   // métodos desconocidos de datos antiguos
  }
  const total = c.totalCobrado ?? c.total
  if (c.metodoPago === 'dividida') {
    for (const ct of c.cuentas ?? []) if (ct.estado === 'pagada') sumar(ct.metodoPago, ct.total)
  } else if (c.metodoPago === 'mixto') {
    sumar('efectivo', c.montoEfectivo ?? 0)
    sumar(c.metodoResto, redondear(total - (c.montoEfectivo ?? 0)))
  } else {
    sumar(c.metodoPago, total)
  }
  return d
}
