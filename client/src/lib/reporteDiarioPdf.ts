import { apiFetch } from './api'
import { etiquetaComanda } from './etiqueta'
import { METODO_LABEL } from './impresion'
import type { Comanda, ResumenReporte } from '../types'
import type { CajaSesion, Arqueo } from '../store/cajaStore'

// Reporte de ventas de UN día en PDF (A4): totales, métodos de pago, caja, cobros y productos.
// Se descarga como archivo (no usa la impresión del navegador: la PC de caja imprime directo a la térmica).

const soles = (n: number | null | undefined) => `S/ ${(n ?? 0).toFixed(2)}`
const hora = (d: string | Date) => new Date(d).toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false })
const diaLima = (d: string | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date(d))
const fechaLarga = (f: string) => new Date(`${f}T12:00:00-05:00`).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

async function logoDataUrl(): Promise<{ url: string; w: number; h: number } | null> {
  try {
    const blob = await (await fetch('/logo-impresion.png')).blob()
    const url = await new Promise<string>((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = mal; r.readAsDataURL(blob) })
    const dim = await new Promise<{ w: number; h: number }>((ok, mal) => { const i = new Image(); i.onload = () => ok({ w: i.width, h: i.height }); i.onerror = mal; i.src = url })
    return { url, ...dim }
  } catch {
    return null
  }
}

export async function descargarReporteDiario(fecha: string, generadoPor: string) {
  const inicio = new Date(`${fecha}T00:00:00-05:00`).toISOString()
  const fin = new Date(`${fecha}T23:59:59.999-05:00`).toISOString()
  const [{ jsPDF }, { default: autoTable }, r, cobros, historial, actual, logo] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    apiFetch<ResumenReporte>(`/api/reportes/resumen?desde=${fecha}&hasta=${fecha}`),
    apiFetch<Comanda[]>(`/api/comandas?cobradaDesde=${encodeURIComponent(inicio)}&cobradaHasta=${encodeURIComponent(fin)}`),
    apiFetch<CajaSesion[]>('/api/caja/historial?limite=60').catch(() => [] as CajaSesion[]),
    apiFetch<{ sesion: CajaSesion | null; arqueo?: Arqueo }>('/api/caja/actual').catch(() => ({ sesion: null } as { sesion: CajaSesion | null; arqueo?: Arqueo })),
    logoDataUrl(),
  ])

  // Sesiones de caja de ese día (cerradas, y la abierta si es de ese día)
  const cajas: { s: CajaSesion; arqueo?: Arqueo }[] = historial
    .filter((s) => diaLima(s.abiertaEn) === fecha || (s.cerradaEn && diaLima(s.cerradaEn) === fecha))
    .map((s) => ({ s }))
  if (actual.sesion && diaLima(actual.sesion.abiertaEn) <= fecha) cajas.push({ s: actual.sesion, arqueo: actual.arqueo })
  cajas.sort((a, b) => a.s.abiertaEn.localeCompare(b.s.abiertaEn))

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const ancho = doc.internal.pageSize.getWidth()
  const M = 14
  const NEGRO: [number, number, number] = [26, 26, 26]
  const DORADO: [number, number, number] = [232, 180, 0]
  const estilo = { fontSize: 9, cellPadding: 1.6, lineColor: [210, 210, 210] as [number, number, number], lineWidth: 0.1 }
  const cabeza = { fillColor: NEGRO, textColor: 255, fontStyle: 'bold' as const }
  let y = M

  // ── Encabezado ──
  if (logo) {
    const h = 18, w = (logo.w / logo.h) * h
    doc.addImage(logo.url, 'PNG', M, y, w, h)
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...NEGRO)
  doc.text('CHICHARRONERÍA CADE', ancho - M, y + 6, { align: 'right' })
  doc.setFontSize(12); doc.text('Reporte de ventas del día', ancho - M, y + 12, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90)
  const fl = fechaLarga(fecha)
  doc.text(fl.charAt(0).toUpperCase() + fl.slice(1), ancho - M, y + 17, { align: 'right' })
  doc.text(`Generado: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })} · ${generadoPor}`, ancho - M, y + 21.5, { align: 'right' })
  y += 26
  doc.setDrawColor(...DORADO); doc.setLineWidth(0.8); doc.line(M, y, ancho - M, y)
  y += 5

  // ── Totales grandes ──
  const t = r.totales
  const cajasTot = [
    ['Ventas netas', soles(t.ventasNetas)],
    ['Total cobrado', soles(t.cobrado)],
    ['Pedidos cobrados', String(t.pedidos)],
  ]
  const wCaja = (ancho - 2 * M - 8) / 3
  cajasTot.forEach(([et, val], i) => {
    const x = M + i * (wCaja + 4)
    doc.setFillColor(...(i === 0 ? DORADO : [245, 245, 245] as [number, number, number]))
    doc.roundedRect(x, y, wCaja, 18, 2, 2, 'F')
    doc.setTextColor(...NEGRO); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5)
    doc.text(et, x + 4, y + 6)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
    doc.text(val, x + 4, y + 14)
  })
  y += 24

  const titulo = (txt: string) => {
    if (y > 265) { doc.addPage(); y = M }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...NEGRO)
    doc.text(txt.toUpperCase(), M, y)
    y += 2
  }
  const tabla = (head: string[], body: (string | number)[][], opciones: Record<string, unknown> = {}) => {
    autoTable(doc, { startY: y, head: [head], body, theme: 'grid', styles: estilo, headStyles: cabeza, margin: { left: M, right: M }, ...opciones })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7
  }
  const der = { halign: 'right' as const }

  // ── Resumen y métodos de pago (lado a lado) ──
  const mitad = (ancho - 2 * M - 6) / 2
  const yInicio = y
  titulo('Resumen')
  autoTable(doc, {
    startY: y, theme: 'grid', styles: estilo, headStyles: cabeza, margin: { left: M, right: ancho - M - mitad }, tableWidth: mitad,
    head: [['Concepto', 'Monto']], columnStyles: { 1: der },
    body: [
      ['Subtotal', soles(t.subtotal)],
      ['Descuentos', `- ${soles(t.descuentos)}`],
      ['Ventas netas', soles(t.ventasNetas)],
      ['Propinas', soles(t.propinas)],
      ['Total cobrado', soles(t.cobrado)],
      ['Ticket promedio', soles(t.ticketPromedio)],
      ['Ítems vendidos', String(t.itemsVendidos)],
      [`Cancelados (${t.cancelados})`, soles(t.montoCancelado)],
    ],
  })
  const finIzq = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5)
  doc.text('COBRADO POR MÉTODO DE PAGO', M + mitad + 6, yInicio)
  autoTable(doc, {
    startY: yInicio + 2, theme: 'grid', styles: estilo, headStyles: cabeza, margin: { left: M + mitad + 6, right: M }, tableWidth: mitad,
    head: [['Método', 'Monto']], columnStyles: { 1: der },
    body: [
      ['Efectivo', soles(r.porMetodo.efectivo)],
      ['Tarjeta', soles(r.porMetodo.tarjeta)],
      ['Yape / Plin', soles(r.porMetodo.yape_plin)],
      [{ content: 'TOTAL', styles: { fontStyle: 'bold' } }, { content: soles(r.porMetodo.efectivo + r.porMetodo.tarjeta + r.porMetodo.yape_plin), styles: { fontStyle: 'bold', halign: 'right' } }],
    ] as never,
  })
  y = Math.max(finIzq, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 7

  // ── Caja ──
  if (cajas.length) {
    titulo('Caja')
    tabla(['Apertura', 'Fondo', 'Efectivo cobrado', 'Ingresos', 'Retiros', 'Esperado', 'Contado', 'Diferencia', 'Cierre'],
      cajas.map(({ s, arqueo }) => {
        const abierta = s.estado === 'abierta'
        return [
          `${hora(s.abiertaEn)} · ${s.abiertaPor}`,
          soles(s.montoInicial),
          soles(abierta ? arqueo?.efectivoCobrado : s.efectivoCobrado),
          soles(abierta ? arqueo?.ingresos : s.ingresos),
          soles(abierta ? arqueo?.retiros : s.retiros),
          soles(abierta ? arqueo?.efectivoEsperado : s.efectivoEsperado),
          abierta ? '—' : soles(s.efectivoContado),
          abierta ? '—' : soles(s.diferencia),
          abierta ? 'Abierta' : `${s.cerradaEn ? hora(s.cerradaEn) : ''} · ${s.cerradaPor ?? ''}`,
        ]
      }),
      { styles: { ...estilo, fontSize: 8 }, columnStyles: { 1: der, 2: der, 3: der, 4: der, 5: der, 6: der, 7: der } })
  }

  // ── Detalle de cobros ──
  titulo(`Detalle de cobros (${cobros.length})`)
  const ordenados = [...cobros].sort((a, b) => (a.cobradaEn ?? '').localeCompare(b.cobradaEn ?? ''))
  tabla(['#', 'Hora', 'Mesa / Pedido', 'Mozo', 'Método', 'Total'],
    ordenados.length
      ? ordenados.map((c, i) => [i + 1, c.cobradaEn ? hora(c.cobradaEn) : '', etiquetaComanda(c), c.mozo, METODO_LABEL[c.metodoPago ?? ''] ?? c.metodoPago ?? '', soles(c.totalCobrado ?? c.total)])
      : [['', '', 'Sin cobros este día', '', '', '']],
    { columnStyles: { 0: { cellWidth: 9, halign: 'center' }, 1: { cellWidth: 15 }, 5: der } })

  // ── Productos y mozos ──
  if (r.topProductos.length) {
    titulo('Productos vendidos')
    tabla(['Producto', 'Cantidad', 'Ventas'], r.topProductos.map((p) => [p.nombre, p.cantidad, soles(p.ventas)]), { columnStyles: { 1: { halign: 'center', cellWidth: 22 }, 2: { ...der, cellWidth: 30 } } })
  }
  if (r.porMozo.length) {
    titulo('Ventas por mozo')
    tabla(['Mozo', 'Pedidos', 'Ventas netas'], r.porMozo.map((m) => [m.mozo, m.pedidos, soles(m.ventas)]), { columnStyles: { 1: { halign: 'center', cellWidth: 22 }, 2: { ...der, cellWidth: 30 } } })
  }

  // ── Firmas ──
  if (y > 255) { doc.addPage(); y = M + 10 }
  y += 14
  doc.setDrawColor(120); doc.setLineWidth(0.3)
  const wf = 60
  doc.line(M + 10, y, M + 10 + wf, y)
  doc.line(ancho - M - 10 - wf, y, ancho - M - 10, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(60)
  doc.text('Cajero', M + 10 + wf / 2, y + 5, { align: 'center' })
  doc.text('Administrador', ancho - M - 10 - wf / 2, y + 5, { align: 'center' })

  // Pie con número de página
  const paginas = doc.getNumberOfPages()
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setFontSize(8); doc.setTextColor(140)
    doc.text(`Chicharronería CADE · Reporte del ${fecha} · Página ${i} de ${paginas}`, ancho / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' })
  }

  doc.save(`reporte_ventas_${fecha}.pdf`)
}
