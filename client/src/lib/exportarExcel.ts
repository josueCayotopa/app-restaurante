import * as XLSX from 'xlsx'

interface DatoExcel {
  ventasPorHora: { hora: string; ventas: number }[]
  ventasSemanales: { dia: string; ventas: number }[]
  productosMasVendidos: { nombre: string; cantidad: number; total: number; porcentaje: number }[]
  rendimientoMozos: { nombre: string; comandas: number; total: number; tiempoPromedio: number }[]
  kpis: {
    ventasDia: number
    ticketPromedio: number
    ocupacion: number
    comandasHoy: number
    mesasOcupadas: number
    totalMesas: number
  }
}

export function exportarExcel(datos: DatoExcel) {
  const wb = XLSX.utils.book_new()
  const fecha = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  // Hoja 1: Resumen KPIs
  const wsKPI = XLSX.utils.aoa_to_sheet([
    ['CHICHARRONERÍA CADE - Reporte Diario'],
    [`Fecha: ${fecha}`],
    [],
    ['INDICADORES CLAVE'],
    ['Métrica', 'Valor'],
    ['Ventas del día (S/)', datos.kpis.ventasDia.toFixed(2)],
    ['Ticket promedio (S/)', datos.kpis.ticketPromedio.toFixed(2)],
    ['Ocupación (%)', datos.kpis.ocupacion],
    ['Mesas ocupadas', `${datos.kpis.mesasOcupadas} / ${datos.kpis.totalMesas}`],
    ['Comandas completadas', datos.kpis.comandasHoy],
  ])
  wsKPI['!cols'] = [{ wch: 28 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsKPI, 'Resumen')

  // Hoja 2: Ventas por hora
  const wsHora = XLSX.utils.aoa_to_sheet([
    ['Hora', 'Ventas (S/)'],
    ...datos.ventasPorHora.map((r) => [r.hora, r.ventas]),
  ])
  wsHora['!cols'] = [{ wch: 12 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsHora, 'Ventas por Hora')

  // Hoja 3: Ventas semanales
  const wsSemana = XLSX.utils.aoa_to_sheet([
    ['Día', 'Ventas (S/)'],
    ...datos.ventasSemanales.map((r) => [r.dia, r.ventas]),
  ])
  wsSemana['!cols'] = [{ wch: 10 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsSemana, 'Ventas Semanales')

  // Hoja 4: Productos más vendidos
  const wsProductos = XLSX.utils.aoa_to_sheet([
    ['#', 'Producto', 'Cantidad', 'Total (S/)'],
    ...datos.productosMasVendidos.map((p, i) => [i + 1, p.nombre, p.cantidad, p.total]),
  ])
  wsProductos['!cols'] = [{ wch: 5 }, { wch: 28 }, { wch: 12 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsProductos, 'Top Productos')

  // Hoja 5: Rendimiento mozos
  const wsMozos = XLSX.utils.aoa_to_sheet([
    ['Mozo', 'Comandas', 'Total (S/)', 'Tiempo Promedio (min)'],
    ...datos.rendimientoMozos.map((m) => [m.nombre, m.comandas, m.total, m.tiempoPromedio]),
  ])
  wsMozos['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, wsMozos, 'Rendimiento Mozos')

  const nombreArchivo = `reporte_cade_${fecha.replace(/\//g, '-')}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}
