import { texto, fila, separador, espacio, type Documento, type Linea } from './documento'

// Tipos mínimos que necesitan los tickets (lo que devuelven las rutas ya "mapeado")
export interface ItemTicket {
  cantidad: number; nombre: string; precioUnitario: number; estado?: string
  nota?: string | null; tipoPlato?: string | null; guarniciones?: string[] | null
}
export interface ComandaTicket {
  numeroMesa: number; mesasUnidas?: number[] | null; mozo: string; notaGeneral?: string | null
  tipo?: string; numero?: number; clienteNombre?: string | null; clienteTelefono?: string | null
  modalidad?: string; paraLlevar?: boolean; descartable?: number; horaRecojo?: Date | string | null
  creadaEn: Date | string; items: ItemTicket[]
  subtotal?: number | null; descuentoPct?: number; descuentoMonto?: number; propina?: number
  totalCobrado?: number | null; total: number; metodoPago?: string | null
  montoRecibido?: number | null; vuelto?: number | null; montoEfectivo?: number | null; metodoResto?: string | null
  cobradaEn?: Date | string | null; cobradaPor?: string | null
  cuentas?: { numero: number; metodoPago?: string | null; total: number }[]
}
export interface SesionTicket {
  abiertaEn: Date | string; abiertaPor: string; cerradaEn?: Date | string | null; cerradaPor?: string | null
  montoInicial: number; efectivoCobrado?: number | null; ingresos?: number | null; retiros?: number | null
  efectivoEsperado?: number | null; efectivoContado?: number | null; diferencia?: number | null
  ventasNetas?: number | null; propinas?: number | null; tarjeta?: number | null; yapePlin?: number | null
  pedidos?: number | null; conteo?: string | null; observaciones?: string | null
  movimientos?: { tipo: string; monto: number; concepto: string }[]
}

const METODO: Record<string, string> = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta', yape_plin: 'Yape / Plin', mixto: 'Mixto', dividida: 'Cuenta dividida',
}
const S = (n: number | null | undefined) => `S/ ${(n ?? 0).toFixed(2)}`
// Formato 24 h (más corto: entra en la misma línea que el mozo en papel de 58 mm)
const horaCorta = (d: Date | string) => new Date(d).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
const fechaHora = (d: Date | string) => {
  const f = new Date(d)
  return `${f.toLocaleDateString('es-PE')} ${horaCorta(f)}`
}
// Pedidos: cómo se entrega (los antiguos solo tienen paraLlevar)
const modalidadDe = (c: { modalidad?: string; paraLlevar?: boolean }) =>
  c.modalidad === 'delivery' ? 'delivery' : c.modalidad === 'llevar' || (c.modalidad !== 'local' && c.paraLlevar) ? 'llevar' : 'local'
const MODALIDAD_TICKET = { local: 'PEDIDO - COMER AQUI', llevar: 'PARA LLEVAR', delivery: 'DELIVERY' }
const CARGO_TICKET = { local: 'Cargo', llevar: 'Descartable', delivery: 'Delivery' }
const mesaLabel = (c: { numeroMesa: number; mesasUnidas?: number[] | null }) =>
  `${c.numeroMesa}${c.mesasUnidas?.length ? ` + ${c.mesasUnidas.join(' + ')}` : ''}`
// "Mesa 4 + 5" o "Pedido #12 · Juan" (pedidos por teléfono)
export const etiquetaComanda = (c: { tipo?: string; numero?: number; clienteNombre?: string | null; numeroMesa: number; mesasUnidas?: number[] | null }) =>
  c.tipo === 'pedido' ? `Pedido #${c.numero ?? ''}${c.clienteNombre ? ` · ${c.clienteNombre}` : ''}` : `Mesa ${mesaLabel(c)}`
const encabezado = (titulo: string): Linea[] => [
  { t: 'logo' },
  texto('CHICHARRONERIA CADE', { alinear: 'centro', negrita: true, tam: 'alto' }),
  texto(titulo, { alinear: 'centro' }),
  separador(),
]

// ── Comanda para Cocina / Bar ───────────────────────────────────────────────
// Pensada para leerse de lejos: mesa enorme, cantidades y platos en negrita doble alto.
export function ticketComanda(c: ComandaTicket, items: ItemTicket[], area: 'cocina' | 'bar', nuevo: boolean, reimpresion = false): Documento {
  const l: Linea[] = [
    texto(area === 'cocina' ? 'COCINA' : 'BAR', { alinear: 'centro', negrita: true, invertido: true }),
    ...(c.tipo === 'pedido'
      ? [
          texto(MODALIDAD_TICKET[modalidadDe(c)], { alinear: 'centro', negrita: true, tam: 2 }),
          texto(`#${c.numero ?? ''} ${c.clienteNombre ?? ''}`.trim(), { alinear: 'centro', negrita: true, tam: 'alto' }),
          ...(c.horaRecojo ? [texto(`Recoge: ${horaCorta(c.horaRecojo)}`, { alinear: 'centro', negrita: true })] : []),
        ]
      : [texto(`MESA ${mesaLabel(c)}`, { alinear: 'centro', negrita: true, tam: 2 })]),
    texto(reimpresion ? '** REIMPRESION **' : nuevo ? 'PEDIDO NUEVO' : '** ADICION **', { alinear: 'centro', negrita: true }),
    fila(`${c.tipo === 'pedido' ? 'Tomó' : 'Mozo'}: ${c.mozo}`, horaCorta(new Date())),
    separador(true),
  ]
  for (const i of items) {
    l.push(texto(`${i.cantidad} x ${i.nombre}`, { negrita: true, tam: 'alto' }))
    const detalle = [i.tipoPlato ? (i.tipoPlato === 'plato' ? 'Plato' : 'Fuente') : '', i.guarniciones?.length ? i.guarniciones.join(', ') : '']
      .filter(Boolean).join(' - ')
    if (detalle) l.push(texto(`   ${detalle}`))
    if (i.nota) l.push(texto(`   >> ${i.nota}`, { negrita: true }))
  }
  if (c.notaGeneral) l.push(separador(), texto(`NOTA: ${c.notaGeneral}`, { negrita: true }))
  l.push(separador(true))
  return { titulo: `${area === 'cocina' ? 'Cocina' : 'Bar'} · ${etiquetaComanda(c)}${nuevo ? '' : ' (adición)'}`, lineas: l }
}

// ── Boleta de cobro ─────────────────────────────────────────────────────────
export function ticketCobro(c: ComandaTicket, abrirGaveta = false): Documento {
  const subtotal = c.subtotal ?? c.total
  const descuento = c.descuentoMonto ?? 0
  const propina = c.propina ?? 0
  const total = c.totalCobrado ?? subtotal - descuento + propina
  const metodo = c.metodoPago ?? 'efectivo'
  const l: Linea[] = [
    ...encabezado('Ticket de consumo'),
    ...(c.tipo === 'pedido'
      ? [fila('Pedido', `#${c.numero ?? ''} (${({ local: 'local', llevar: 'para llevar', delivery: 'delivery' })[modalidadDe(c)]})`), fila('Cliente', c.clienteNombre ?? '-'),
         ...(c.clienteTelefono ? [fila('Teléfono', c.clienteTelefono)] : [])]
      : [fila('Mesa', mesaLabel(c)), fila('Mozo', c.mozo)]),
    ...(c.cobradaPor ? [fila('Cajero', c.cobradaPor)] : []),
    fila('Fecha', fechaHora(c.cobradaEn ?? new Date())),
    separador(),
  ]
  for (const i of c.items.filter((x) => x.estado !== 'cancelado' && x.estado !== 'devuelto')) {
    l.push(fila(`${i.cantidad} x ${i.nombre}`, S(i.cantidad * i.precioUnitario)))
  }
  const descartable = c.descartable ?? 0
  if (descartable > 0) l.push(fila(CARGO_TICKET[modalidadDe(c)], S(descartable)))
  l.push(separador(), fila('Subtotal', S(subtotal)))
  if (descuento > 0) l.push(fila(`Descuento${c.descuentoPct ? ` (${c.descuentoPct}%)` : ''}`, `-${S(descuento)}`))
  if (propina > 0) l.push(fila('Propina', S(propina)))
  l.push(separador(), fila('TOTAL', S(total), { negrita: true, tam: 'alto' }), separador())
  l.push(fila('Pago', METODO[metodo] ?? metodo))
  if (metodo === 'efectivo' && c.montoRecibido != null) {
    l.push(fila('Recibido', S(c.montoRecibido)))
    if ((c.vuelto ?? 0) > 0) l.push(fila('Vuelto', S(c.vuelto), { negrita: true }))
  }
  if (metodo === 'mixto') {
    l.push(fila('  Efectivo', S(c.montoEfectivo)), fila(`  ${METODO[c.metodoResto ?? ''] ?? 'Otro'}`, S(total - (c.montoEfectivo ?? 0))))
  }
  if (metodo === 'dividida') for (const ct of c.cuentas ?? []) l.push(fila(`  Cuenta ${ct.numero} - ${METODO[ct.metodoPago ?? ''] ?? '-'}`, S(ct.total)))
  l.push(espacio, texto('¡Gracias por su visita!', { alinear: 'centro', negrita: true }), texto('Un restaurante para la familia', { alinear: 'centro' }), texto('Ebenezer', { alinear: 'centro', negrita: true, tam: 'alto' }), espacio, espacio)
  return {
    titulo: `Cobro · ${etiquetaComanda(c)} · ${S(total)}`,
    lineas: l,
    // La gaveta se abre solo si entró efectivo
    abrirGaveta: abrirGaveta && (metodo === 'efectivo' || metodo === 'mixto' || (c.montoEfectivo ?? 0) > 0),
  }
}

// ── Precuenta (para que el cliente revise antes de pagar) ───────────────────
// promo: el descuento elegido al tomar la comanda (Caja aún puede cambiarlo al cobrar)
export function ticketPrecuenta(c: ComandaTicket, promo?: { nombre: string; porcentaje: number } | null): Documento {
  const items = c.items.filter((x) => x.estado !== 'cancelado' && x.estado !== 'devuelto')
  const subtotal = Math.round(items.reduce((a, i) => a + i.cantidad * i.precioUnitario, 0) * 100) / 100
  const descuento = promo ? Math.round(subtotal * (promo.porcentaje / 100) * 100) / 100 : 0
  const descartable = c.descartable ?? 0
  const total = Math.round((subtotal - descuento + descartable) * 100) / 100
  const l: Linea[] = [
    ...encabezado('PRECUENTA'),
    ...(c.tipo === 'pedido'
      ? [fila('Pedido', `#${c.numero ?? ''}`), fila('Cliente', c.clienteNombre ?? '-')]
      : [fila('Mesa', mesaLabel(c)), fila('Mozo', c.mozo)]),
    fila('Fecha', fechaHora(new Date())),
    separador(),
  ]
  for (const i of items) l.push(fila(`${i.cantidad} x ${i.nombre}`, S(i.cantidad * i.precioUnitario)))
  if (descartable > 0) l.push(fila(CARGO_TICKET[modalidadDe(c)], S(descartable)))
  l.push(separador(), fila('Subtotal', S(subtotal + descartable)))
  if (descuento > 0 && promo) l.push(fila(`Dcto. ${promo.nombre} (${promo.porcentaje}%)`, `-${S(descuento)}`))
  l.push(separador(), fila('TOTAL A PAGAR', S(total), { negrita: true, tam: 'alto' }), separador())
  l.push(
    texto('Documento no válido como comprobante de pago', { alinear: 'centro' }),
    espacio,
    texto('Un restaurante para la familia', { alinear: 'centro' }),
    texto('Ebenezer', { alinear: 'centro', negrita: true, tam: 'alto' }),
    espacio, espacio,
  )
  return { titulo: `Precuenta · ${etiquetaComanda(c)} · ${S(total)}`, lineas: l }
}

// ── Anulación para Cocina / Bar ─────────────────────────────────────────────
// Si el ticket del plato ya salió en papel, avisa que NO se prepare.
export function ticketAnulacion(c: ComandaTicket, items: ItemTicket[], area: 'cocina' | 'bar'): Documento {
  const l: Linea[] = [
    texto('*** ANULADO ***', { alinear: 'centro', negrita: true, invertido: true, tam: 'alto' }),
    texto(c.tipo === 'pedido' ? `PEDIDO #${c.numero ?? ''} ${c.clienteNombre ?? ''}`.trim() : `MESA ${mesaLabel(c)}`, { alinear: 'centro', negrita: true, tam: 2 }),
    fila(`${c.tipo === 'pedido' ? 'Tomó' : 'Mozo'}: ${c.mozo}`, horaCorta(new Date())),
    separador(true),
  ]
  for (const i of items) l.push(texto(`${i.cantidad} x ${i.nombre}`, { negrita: true, tam: 'alto' }))
  l.push(separador(true), texto('NO PREPARAR', { alinear: 'centro', negrita: true, tam: 'alto' }), separador(true))
  return { titulo: `${area === 'cocina' ? 'Cocina' : 'Bar'} · ANULADO · ${etiquetaComanda(c)}`, lineas: l }
}

// ── Cierre de caja ──────────────────────────────────────────────────────────
export function ticketCierre(s: SesionTicket): Documento {
  const dif = s.diferencia ?? 0
  const l: Linea[] = [
    ...encabezado('CIERRE DE CAJA'),
    fila('Apertura', fechaHora(s.abiertaEn)), fila('  por', s.abiertaPor),
    fila('Cierre', s.cerradaEn ? fechaHora(s.cerradaEn) : '-'), ...(s.cerradaPor ? [fila('  por', s.cerradaPor)] : []),
    separador(),
    fila('Pedidos cobrados', String(s.pedidos ?? 0)), fila('Ventas netas', S(s.ventasNetas)), fila('Propinas', S(s.propinas)),
    fila('Tarjeta', S(s.tarjeta)), fila('Yape / Plin', S(s.yapePlin)),
    separador(),
    fila('Fondo inicial', S(s.montoInicial)), fila('+ Cobros en efectivo', S(s.efectivoCobrado)),
    fila('+ Ingresos', S(s.ingresos)), fila('- Retiros', S(s.retiros)),
  ]
  for (const m of s.movimientos ?? []) l.push(fila(`  ${m.tipo === 'ingreso' ? '+' : '-'} ${m.concepto}`, S(m.monto)))
  l.push(separador(), fila('Efectivo esperado', S(s.efectivoEsperado), { negrita: true }), fila('Efectivo contado', S(s.efectivoContado), { negrita: true }))
  const conteo: Record<string, number> = s.conteo ? JSON.parse(s.conteo) : {}
  for (const [den, n] of Object.entries(conteo).sort(([a], [b]) => Number(b) - Number(a))) {
    if (n > 0) l.push(fila(`  ${n} x S/ ${Number(den).toFixed(2)}`, S(n * Number(den))))
  }
  l.push(fila(dif === 0 ? 'CUADRA' : dif > 0 ? 'SOBRANTE' : 'FALTANTE', S(Math.abs(dif)), { negrita: true, tam: 'alto' }))
  if (s.observaciones) l.push(separador(), texto(`Obs.: ${s.observaciones}`))
  l.push(espacio, espacio, texto('_______________________', { alinear: 'centro' }), texto('Firma', { alinear: 'centro' }))
  return { titulo: `Cierre de caja · ${s.cerradaEn ? fechaHora(s.cerradaEn) : ''}`, lineas: l }
}

// ── Prueba de impresora ─────────────────────────────────────────────────────
export function ticketPrueba(imp: { nombre: string; area: string; ancho: number; tipo: string; ip?: string | null; puerto: number }): Documento {
  return {
    titulo: `Prueba · ${imp.nombre}`,
    lineas: [
      ...encabezado('PRUEBA DE IMPRESION'),
      fila('Impresora', imp.nombre), fila('Area', imp.area), fila('Papel', `${imp.ancho} mm`),
      ...(imp.tipo === 'red' ? [fila('Red', `${imp.ip}:${imp.puerto}`)] : []),
      fila('Fecha', fechaHora(new Date())),
      separador(),
      texto('Tildes: á é í ó ú ñ Ñ ¿? ¡!'),
      texto('MESA 12', { alinear: 'centro', negrita: true, tam: 2 }),
      texto('2 x Chicharrón (Personal)', { negrita: true, tam: 'alto' }),
      fila('1 x Té', 'S/ 2.00'),
      separador(true),
      texto('Si lees esto, la impresora funciona', { alinear: 'centro' }),
    ],
  }
}
