import * as XLSX from 'xlsx'
import type { ResumenReporte } from '../types'

const METODOS: [keyof ResumenReporte['porMetodo'], string][] = [
  ['efectivo', 'Efectivo'], ['tarjeta', 'Tarjeta'], ['yape_plin', 'Yape / Plin'],
]

function hoja(wb: XLSX.WorkBook, nombre: string, filas: (string | number)[][], anchos: number[]) {
  const ws = XLSX.utils.aoa_to_sheet(filas)
  ws['!cols'] = anchos.map((wch) => ({ wch }))
  XLSX.utils.book_append_sheet(wb, ws, nombre)
}

// Excel del reporte con los mismos datos que muestra la pantalla de Reportes
export function exportarExcel(r: ResumenReporte) {
  const wb = XLSX.utils.book_new()
  const t = r.totales
  const periodo = r.desde === r.hasta ? r.desde : `${r.desde} al ${r.hasta}`

  hoja(wb, 'Resumen', [
    ['CHICHARRONERÍA CADE - Reporte de ventas'],
    [`Periodo: ${periodo}`],
    [`Generado: ${new Date().toLocaleString('es-PE')}`],
    [],
    ['Indicador', 'Valor'],
    ['Pedidos cobrados', t.pedidos],
    ['Subtotal (S/)', t.subtotal],
    ['Descuentos (S/)', t.descuentos],
    ['Ventas netas (S/)', t.ventasNetas],
    ['Propinas (S/)', t.propinas],
    ['Total cobrado (S/)', t.cobrado],
    ['Ticket promedio (S/)', t.ticketPromedio],
    ['Ítems vendidos', t.itemsVendidos],
    ['Pedidos cancelados', t.cancelados],
    ['Monto cancelado (S/)', t.montoCancelado],
    [],
    ['Cobrado por método (incluye propinas)', 'S/'],
    ...METODOS.map(([k, label]) => [label, r.porMetodo[k]]),
  ], [38, 16])

  hoja(wb, 'Por día', [['Fecha', 'Pedidos', 'Ventas netas (S/)'], ...r.porDia.map((d) => [d.fecha, d.pedidos, d.ventas])], [12, 10, 18])
  hoja(wb, 'Por hora', [['Hora', 'Pedidos', 'Ventas netas (S/)'], ...r.porHora.map((h) => [`${String(h.hora).padStart(2, '0')}:00`, h.pedidos, h.ventas])], [8, 10, 18])
  hoja(wb, 'Productos', [['#', 'Producto', 'Cantidad', 'Ventas (S/)'], ...r.topProductos.map((p, i) => [i + 1, p.nombre, p.cantidad, p.ventas])], [5, 34, 10, 14])
  hoja(wb, 'Categorías', [['Categoría', 'Cantidad', 'Ventas (S/)'], ...r.porCategoria.map((c) => [c.categoria, c.cantidad, c.ventas])], [22, 10, 14])
  hoja(wb, 'Mozos', [['Mozo', 'Pedidos', 'Ventas netas (S/)'], ...r.porMozo.map((m) => [m.mozo, m.pedidos, m.ventas])], [22, 10, 18])
  hoja(wb, 'Descuentos', [['Promoción', 'Pedidos', 'Monto (S/)'], ...r.descuentos.map((d) => [d.promocion, d.pedidos, d.monto])], [24, 10, 14])

  XLSX.writeFile(wb, `reporte_cade_${r.desde}${r.desde === r.hasta ? '' : `_a_${r.hasta}`}.xlsx`)
}

// ── Kardex del almacén ────────────────────────────────────────────────────────

export interface KardexInsumo {
  nombre: string; categoria: string; unidad: string; costoUnitario: number
  saldoInicial: number; entradas: number; salidas: number; saldoFinal: number
  movimientos: { fecha: string; tipo: string; motivo: string | null; usuario: string | null; entrada: number; salida: number; saldo: number }[]
}
const TIPO_MOV: Record<string, string> = { entrada: 'Entrada', salida: 'Salida', merma: 'Merma', ajuste: 'Ajuste' }

export function exportarKardex(k: { desde: string; hasta: string; kardex: KardexInsumo[] }) {
  const wb = XLSX.utils.book_new()
  const periodo = k.desde === k.hasta ? k.desde : `${k.desde} al ${k.hasta}`
  const r2 = (n: number) => Math.round(n * 100) / 100

  hoja(wb, 'Resumen', [
    ['CHICHARRONERÍA CADE - Kardex del almacén'],
    [`Periodo: ${periodo}`],
    [`Generado: ${new Date().toLocaleString('es-PE')}`],
    [],
    ['Insumo', 'Categoría', 'Unidad', 'Saldo inicial', 'Entradas', 'Salidas', 'Saldo final', 'Costo unit. (S/)', 'Valor final (S/)'],
    ...k.kardex.map((i) => [i.nombre, i.categoria, i.unidad, i.saldoInicial, i.entradas, i.salidas, i.saldoFinal, i.costoUnitario, r2(i.saldoFinal * i.costoUnitario)]),
    [],
    ['TOTAL', '', '', '', '', '', '', '', r2(k.kardex.reduce((a, i) => a + i.saldoFinal * i.costoUnitario, 0))],
  ], [28, 14, 9, 13, 11, 11, 12, 15, 15])

  // Detalle: un bloque por insumo con saldo inicial, cada movimiento y saldo final
  const filas: (string | number)[][] = [
    ['CHICHARRONERÍA CADE - Kardex detallado'], [`Periodo: ${periodo}`], [],
  ]
  for (const i of k.kardex) {
    filas.push([`${i.nombre} (${i.unidad})`])
    filas.push(['Fecha', 'Tipo', 'Detalle', 'Usuario', 'Entrada', 'Salida', 'Saldo'])
    filas.push(['', 'Saldo inicial', '', '', '', '', i.saldoInicial])
    for (const m of i.movimientos) {
      filas.push([
        new Date(m.fecha).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }),
        TIPO_MOV[m.tipo] ?? m.tipo, m.motivo ?? '', m.usuario ?? '', m.entrada || '', m.salida || '', m.saldo,
      ])
    }
    filas.push(['', 'Totales', '', '', i.entradas, i.salidas, i.saldoFinal])
    filas.push([])
  }
  hoja(wb, 'Kardex', filas, [17, 13, 60, 16, 10, 10, 10])

  XLSX.writeFile(wb, `kardex_cade_${k.desde}${k.desde === k.hasta ? '' : `_a_${k.hasta}`}.xlsx`)
}
