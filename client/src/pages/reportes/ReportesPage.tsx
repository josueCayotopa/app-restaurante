import Header from '../../components/layout/Header'
import { useComandasStore } from '../../store/comandasStore'
import { useMesasStore } from '../../store/mesasStore'
import { exportarExcel } from '../../lib/exportarExcel'
import {
  TrendingUp, DollarSign, Users, Clock, BarChart3,
  ChefHat, Table2, Star, FileSpreadsheet,
} from 'lucide-react'

const ventasPorHora = [
  { hora: '12:00', ventas: 320 },
  { hora: '13:00', ventas: 580 },
  { hora: '14:00', ventas: 720 },
  { hora: '15:00', ventas: 410 },
  { hora: '16:00', ventas: 180 },
  { hora: '17:00', ventas: 220 },
  { hora: '18:00', ventas: 390 },
  { hora: '19:00', ventas: 650 },
  { hora: '20:00', ventas: 890 },
  { hora: '21:00', ventas: 760 },
  { hora: '22:00', ventas: 430 },
]

const productosMasVendidos = [
  { nombre: 'Lomo Saltado', cantidad: 28, total: 896, porcentaje: 85 },
  { nombre: 'Ceviche Clásico', cantidad: 22, total: 704, porcentaje: 67 },
  { nombre: 'Pollo a la Brasa 1/4', cantidad: 20, total: 360, porcentaje: 61 },
  { nombre: 'Arroz con Mariscos', cantidad: 15, total: 570, porcentaje: 46 },
  { nombre: 'Chicharrón de Calamar', cantidad: 14, total: 336, porcentaje: 43 },
]

const rendimientoMozos = [
  { nombre: 'Carlos', comandas: 18, total: 1240, tiempoPromedio: 22 },
  { nombre: 'Ana', comandas: 15, total: 980, tiempoPromedio: 19 },
  { nombre: 'Luis', comandas: 12, total: 820, tiempoPromedio: 24 },
  { nombre: 'María', comandas: 10, total: 710, tiempoPromedio: 21 },
]

const ventasSemanales = [
  { dia: 'Lun', ventas: 2100 },
  { dia: 'Mar', ventas: 1850 },
  { dia: 'Mié', ventas: 2400 },
  { dia: 'Jue', ventas: 2750 },
  { dia: 'Vie', ventas: 3200 },
  { dia: 'Sáb', ventas: 4100 },
  { dia: 'Dom', ventas: 3600 },
]

const maxVentasSemanal = Math.max(...ventasSemanales.map((v) => v.ventas))
const maxVentasHora = Math.max(...ventasPorHora.map((v) => v.ventas))

function KPICard({ label, valor, sub, icon: Icon, bg, iconColor, textColor }: {
  label: string; valor: string; sub?: string; icon: React.ElementType
  bg: string; iconColor: string; textColor: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon size={18} className={iconColor} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${textColor}`}>{valor}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function ReportesPage() {
  const comandas = useComandasStore((s) => s.comandas)
  const mesas = useMesasStore((s) => s.mesas)

  const cerradas = comandas.filter((c) => c.estado === 'cerrada')
  const totalVentas = cerradas.reduce((acc, c) => acc + c.total, 0)
  const ticketPromedio = cerradas.length > 0 ? totalVentas / cerradas.length : 0
  const mesasOcupadas = mesas.filter((m) => m.estado === 'ocupada').length
  const ocupacion = Math.round((mesasOcupadas / mesas.length) * 100)

  function handleExportar() {
    exportarExcel({
      ventasPorHora,
      ventasSemanales,
      productosMasVendidos,
      rendimientoMozos,
      kpis: {
        ventasDia: totalVentas + 5490,
        ticketPromedio: ticketPromedio + 68,
        ocupacion,
        comandasHoy: cerradas.length + 47,
        mesasOcupadas,
        totalMesas: mesas.length,
      },
    })
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        titulo="Reportes y Dashboard"
        subtitulo="Resumen del día de hoy"
        acciones={
          <button
            onClick={handleExportar}
            className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-900 font-semibold rounded-xl text-sm transition-colors"
          >
            <FileSpreadsheet size={16} />
            Exportar Excel
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPIs principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Ventas del día" valor={`S/ ${(totalVentas + 5490).toFixed(0)}`}
            sub="+12% vs ayer" icon={DollarSign}
            bg="bg-gold-100" iconColor="text-gold-700" textColor="text-gold-700" />
          <KPICard label="Ticket promedio" valor={`S/ ${(ticketPromedio + 68).toFixed(0)}`}
            sub="Por comanda" icon={TrendingUp}
            bg="bg-gold-100" iconColor="text-gold-600" textColor="text-gold-600" />
          <KPICard label="Ocupación actual" valor={`${ocupacion}%`}
            sub={`${mesasOcupadas}/${mesas.length} mesas`} icon={Table2}
            bg="bg-rojo-100" iconColor="text-rojo-600" textColor="text-rojo-600" />
          <KPICard label="Comandas hoy" valor={`${cerradas.length + 47}`}
            sub="Completadas" icon={ChefHat}
            bg="bg-rojo-100" iconColor="text-rojo-600" textColor="text-rojo-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ventas por hora */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-5">
              <Clock size={16} className="text-gold-600" />
              <h3 className="font-bold text-gray-800 text-sm">Ventas por hora</h3>
            </div>
            <div className="flex items-end gap-1.5 h-32">
              {ventasPorHora.map((d) => (
                <div key={d.hora} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-gray-100 rounded-t relative"
                    style={{ height: `${Math.round((d.ventas / maxVentasHora) * 112)}px` }}>
                    <div className="absolute inset-x-0 bottom-0 bg-gold-500 rounded-t"
                      style={{ height: '100%' }} />
                  </div>
                  <span className="text-xs text-gray-400 rotate-45 origin-left whitespace-nowrap">{d.hora}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ventas de la semana */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 size={16} className="text-gold-600" />
              <h3 className="font-bold text-gray-800 text-sm">Ventas de la semana</h3>
            </div>
            <div className="flex items-end gap-2 h-32">
              {ventasSemanales.map((d) => {
                const isToday = d.dia === 'Jue'
                return (
                  <div key={d.dia} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-gray-600">
                      S/{Math.round(d.ventas / 100) * 100}
                    </span>
                    <div className="w-full rounded-t"
                      style={{ height: `${Math.round((d.ventas / maxVentasSemanal) * 80)}px`,
                        background: isToday ? '#e8b400' : '#e5e7eb' }} />
                    <span className={`text-xs font-medium ${isToday ? 'text-gold-600' : 'text-gray-400'}`}>{d.dia}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Productos más vendidos */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star size={16} className="text-gold-500" />
              <h3 className="font-bold text-gray-800 text-sm">Productos más vendidos</h3>
            </div>
            <div className="space-y-3">
              {productosMasVendidos.map((p, idx) => (
                <div key={p.nombre}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-gold-500 text-gray-900'
                        : idx === 1 ? 'bg-gray-400 text-white'
                        : idx === 2 ? 'bg-rojo-500 text-white'
                        : 'bg-gray-300 text-white'
                      }`}>{idx + 1}</span>
                      <span className="text-sm font-medium text-gray-700">{p.nombre}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-gold-700">S/ {p.total}</span>
                      <span className="text-xs text-gray-400 ml-2">{p.cantidad} und.</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 bg-gold-500 rounded-full transition-all" style={{ width: `${p.porcentaje}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rendimiento por mozo */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users size={16} className="text-gold-600" />
              <h3 className="font-bold text-gray-800 text-sm">Rendimiento por mozo</h3>
            </div>
            <div className="space-y-3">
              {rendimientoMozos.map((mozo, idx) => (
                <div key={mozo.nombre} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-gold-100 text-gold-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                    {mozo.nombre[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-800">{mozo.nombre}</p>
                      <span className="text-sm font-bold text-gold-700">S/ {mozo.total}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-gray-400">{mozo.comandas} comandas</span>
                      <span className="text-xs text-gray-400">~{mozo.tiempoPromedio} min prom.</span>
                    </div>
                  </div>
                  {idx === 0 && <Star size={14} className="text-gold-500 fill-gold-500 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Resumen de mesas */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Table2 size={16} className="text-gold-600" />
            <h3 className="font-bold text-gray-800 text-sm">Estado actual de mesas</h3>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {['libre', 'ocupada', 'reservada', 'esperando_pago', 'en_limpieza'].map((estado) => {
              const count = mesas.filter((m) => m.estado === estado).length
              const labels: Record<string, string> = {
                libre: 'Libres', ocupada: 'Ocupadas', reservada: 'Reservadas',
                esperando_pago: 'Esp. pago', en_limpieza: 'Limpieza',
              }
              const colors: Record<string, string> = {
                libre: 'text-gray-600 bg-gray-100',
                ocupada: 'text-gold-700 bg-gold-100',
                reservada: 'text-rojo-600 bg-rojo-50',
                esperando_pago: 'text-rojo-700 bg-rojo-100',
                en_limpieza: 'text-gray-500 bg-gray-100',
              }
              return (
                <div key={estado} className={`rounded-xl p-3 text-center ${colors[estado]}`}>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs font-medium opacity-80">{labels[estado]}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
