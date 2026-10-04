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
