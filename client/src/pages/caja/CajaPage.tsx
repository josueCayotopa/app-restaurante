import { useCallback, useEffect, useState } from 'react'
import Header from '../../components/layout/Header'
import ModalDividirCuenta from '../../components/caja/ModalDividirCuenta'
import ModalCobro, { soles, itemsCobrables, totalAPagar } from '../../components/caja/ModalCobro'
import PanelCaja from '../../components/caja/PanelCaja'
import { useCajaStore } from '../../store/cajaStore'
import { useComandasStore } from '../../store/comandasStore'
import { imprimirCobro, imprimirPrecuenta, METODO_LABEL } from '../../lib/impresion'
import { useToastStore } from '../../store/toastStore'
import { apiFetch } from '../../lib/api'
import { socket } from '../../lib/socket'
import { etiquetaComanda, insigniaComanda, esPedido } from '../../lib/etiqueta'
import type { Comanda } from '../../types'
import { CreditCard, Banknote, Receipt, CheckCircle, ChevronRight, Printer, Scissors, Wallet } from 'lucide-react'

function inicioDeHoy() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}
function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Tarjeta de mesa por cobrar ───────────────────────────────────────────────

function TarjetaCobro({ comanda, cajaAbierta, onCobrar, onDividir }: { comanda: Comanda; cajaAbierta: boolean; onCobrar: () => void; onDividir: () => void }) {
  const tiempoMin = Math.floor((Date.now() - new Date(comanda.creadaEn).getTime()) / 60000)
  const items = itemsCobrables(comanda)
  const cuentas = comanda.cuentas ?? []
  const dividida = cuentas.length > 0
  const pagadas = cuentas.filter((c) => c.estado === 'pagada').length

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gold-500 text-gray-900 rounded-xl flex items-center justify-center font-bold">
            {insigniaComanda(comanda)}
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm">{etiquetaComanda(comanda)}</p>
            <p className="text-xs text-gray-400">
              {esPedido(comanda) ? (comanda.paraLlevar ? 'Para llevar' : 'Comer aquí') : comanda.mozo} · {tiempoMin} min
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => imprimirPrecuenta(comanda.id)} title="Imprimir precuenta"
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <Printer size={15} />
          </button>
          <span className="text-lg font-bold text-gold-700">{soles(totalAPagar(comanda))}</span>
        </div>
      </div>

      {dividida && (
        <p className="mb-2 text-xs font-semibold px-2 py-1 rounded-lg bg-steel-500 text-white inline-flex items-center gap-1">
          <Scissors size={11} /> Dividida · {pagadas}/{cuentas.length} cuentas pagadas
        </p>
      )}

      <div className="text-xs text-gray-400 mb-3 space-y-0.5">
        {items.slice(0, 3).map((it) => (
          <div key={it.id} className="flex justify-between">
            <span className="truncate">{it.cantidad}× {it.nombre}</span>
            <span className="ml-2 shrink-0">{soles(it.cantidad * it.precioUnitario)}</span>
          </div>
        ))}
        {items.length > 3 && <p className="text-gray-300">+{items.length - 3} más...</p>}
      </div>

      <div className="flex gap-2">
        {esPedido(comanda) ? (
          <button onClick={onCobrar} disabled={!cajaAbierta} title={cajaAbierta ? undefined : 'Abre la caja para cobrar'}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Banknote size={14} /> Cobrar pedido <ChevronRight size={13} />
          </button>
        ) : dividida ? (
          <button onClick={onDividir}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-colors">
            <Scissors size={14} /> Cobrar cuentas <ChevronRight size={13} />
          </button>
        ) : (
          <>
            <button onClick={onDividir}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border border-gold-200 text-gold-700 rounded-lg text-xs font-semibold hover:bg-gold-50 transition-colors">
              <Scissors size={13} /> Dividir
            </button>
            <button onClick={onCobrar} disabled={!cajaAbierta} title={cajaAbierta ? undefined : 'Abre la caja para cobrar'}
              className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              <Banknote size={14} /> Cobrar cuenta <ChevronRight size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

interface ResumenDia {
  totales: { pedidos: number; ventasNetas: number; propinas: number; descuentos: number }
  porMetodo: { efectivo: number; tarjeta: number; yape_plin: number }
}

export default function CajaPage() {
  const comandas = useComandasStore((s) => s.comandas)
  const cajaAbierta = useCajaStore((s) => !!s.sesion)
  const [comandaACobrar, setComandaACobrar] = useState<Comanda | null>(null)
  const [comandaADividir, setComandaADividir] = useState<Comanda | null>(null)
  const [resumen, setResumen] = useState<ResumenDia | null>(null)
  const [cobradasHoy, setCobradasHoy] = useState<Comanda[]>([])

  // Mesas abiertas y pedidos por teléfono aún sin pagar
  const porCobrar = comandas.filter(
    (c) => (c.estado === 'lista' || c.estado === 'en_preparacion' || c.estado === 'enviada_cocina') && !c.cobradaEn
  )

  // Ventas e historial del día salen del servidor: no se pierden al recargar
  // y suman lo cobrado desde cualquier caja.
  const cargarDia = useCallback(async () => {
    // Los pendientes de cobro también se refrescan desde el servidor: si se borraron o se
    // cobraron desde otro equipo, esta pantalla no se queda mostrando pedidos que ya no existen
    useComandasStore.getState().cargarComandas()
    try {
      const [r, lista] = await Promise.all([
        apiFetch<ResumenDia>(`/api/reportes/resumen?desde=${hoyISO()}&hasta=${hoyISO()}`),
        // Sin filtro de estado: incluye pedidos pagados por adelantado (el servidor omite los cancelados)
        apiFetch<Comanda[]>(`/api/comandas?cobradaDesde=${inicioDeHoy().toISOString()}`),
      ])
      setResumen(r)
      setCobradasHoy(lista)
    } catch (e) {
      console.error('[caja] Error cargando el día:', e)
    }
  }, [])

  useEffect(() => {
    cargarDia()
    const intervalo = setInterval(cargarDia, 60000)
    // Si otra caja cobra, se actualiza aquí también
    const onActualizada = (c: Comanda) => { if (c.estado === 'cerrada' || c.estado === 'cancelada' || c.cobradaEn) cargarDia() }
    socket.on('comanda:actualizada', onActualizada)
    return () => { clearInterval(intervalo); socket.off('comanda:actualizada', onActualizada) }
  }, [cargarDia])

  const t = resumen?.totales
  const pm = resumen?.porMetodo

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Caja" subtitulo="Gestión de cobros y pagos" />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        <PanelCaja />

        {/* KPIs del día */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gold-500 rounded-xl p-5">
            <p className="text-xs text-gray-900/70">Ventas del día</p>
            <p className="text-2xl font-bold text-gray-900">{soles(t?.ventasNetas ?? 0)}</p>
            <p className="text-xs text-gray-900/70 mt-1">Sin propinas · descuentos: {soles(t?.descuentos ?? 0)}</p>
          </div>
          <div className="bg-gold-600 rounded-xl p-5">
            <div className="flex items-center gap-2 text-white/80 text-xs"><Wallet size={14} /> Efectivo en caja</div>
            <p className="text-2xl font-bold text-white">{soles(pm?.efectivo ?? 0)}</p>
            <p className="text-xs text-white/75 mt-1">Tarjeta {soles(pm?.tarjeta ?? 0)} · Yape/Plin {soles(pm?.yape_plin ?? 0)}</p>
          </div>
          <div className="bg-gray-600 rounded-xl p-5">
            <div className="flex items-center gap-2 text-white/80 text-xs"><Receipt size={14} /> Cobros realizados</div>
            <p className="text-2xl font-bold text-white">{t?.pedidos ?? 0}</p>
            <p className="text-xs text-white/75 mt-1">Propinas: {soles(t?.propinas ?? 0)}</p>
          </div>
          <div className="bg-rojo-500 rounded-xl p-5">
            <div className="flex items-center gap-2 text-white/80 text-xs"><CreditCard size={14} /> Pendientes de cobro</div>
            <p className="text-2xl font-bold text-white">{porCobrar.length}</p>
            <p className="text-xs text-white/75 mt-1">{soles(porCobrar.reduce((a, c) => a + totalAPagar(c), 0))} por cobrar</p>
          </div>
        </div>

        {/* Mesas por cobrar */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Pendientes de cobro</h2>
          {porCobrar.length === 0 ? (
            <div className="text-center py-12 text-gray-300 bg-white rounded-xl border border-gray-100">
              <CheckCircle size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Sin cuentas pendientes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {porCobrar.map((c) => (
                <TarjetaCobro key={c.id} comanda={c} cajaAbierta={cajaAbierta}
                  onCobrar={() => setComandaACobrar(c)}
                  onDividir={() => setComandaADividir(c)} />
              ))}
            </div>
          )}
        </div>

        {/* Historial del día */}
        {cobradasHoy.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-600 mb-3">Cobros realizados hoy</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {cobradasHoy.map((c) => {
                const cuentas = c.metodoPago === 'dividida' ? c.cuentas ?? [] : []
                return (
                  <div key={c.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 bg-gray-500 text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
                          {insigniaComanda(c)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-700">
                            {etiquetaComanda(c)}
                            <span className="text-xs text-gray-400 font-normal ml-2">
                              {c.cobradaEn ? new Date(c.cobradaEn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {c.mozo}{c.cobradaPor ? ` · cobró ${c.cobradaPor}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-700">{soles(c.totalCobrado ?? c.total)}</p>
                          <span className="text-xs px-2 py-0.5 bg-gold-600 text-white rounded-full font-semibold">
                            {METODO_LABEL[c.metodoPago ?? ''] ?? 'Pagado'}
                          </span>
                        </div>
                        <button onClick={() => imprimirCobro(c.id, { abrirGaveta: false }).catch((e) => useToastStore.getState().agregar({ tipo: 'error', titulo: 'No se pudo imprimir', mensaje: e instanceof Error ? e.message : 'Error de impresión', duracion: 6000 }))} title="Reimprimir ticket"
                          className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                          <Printer size={16} />
                        </button>
                      </div>
                    </div>
                    {cuentas.length > 0 && (
                      <div className="mt-2 ml-11 space-y-1">
                        {cuentas.map((ct) => (
                          <div key={ct.id} className="flex items-center justify-between text-xs text-gray-400">
                            <span>Cuenta {ct.numero} · {METODO_LABEL[ct.metodoPago ?? ''] ?? '—'}</span>
                            <span>{soles(ct.total)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {comandaACobrar && (
        <ModalCobro comanda={comandaACobrar} onCobrado={cargarDia} onCerrar={() => setComandaACobrar(null)} />
      )}
      {comandaADividir && (
        <ModalDividirCuenta comanda={comandaADividir} onCobrado={cargarDia} onCerrar={() => setComandaADividir(null)} />
      )}
    </div>
  )
}
