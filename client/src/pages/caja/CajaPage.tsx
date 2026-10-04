import { useCallback, useEffect, useState } from 'react'
import Header from '../../components/layout/Header'
import ModalDividirCuenta from '../../components/caja/ModalDividirCuenta'
import PanelCaja from '../../components/caja/PanelCaja'
import { useCajaStore } from '../../store/cajaStore'
import { useComandasStore } from '../../store/comandasStore'
import { useMesasStore } from '../../store/mesasStore'
import { useCartaPublicaStore } from '../../store/cartaPublicaStore'
import { imprimirCobro, METODO_LABEL } from '../../lib/impresion'
import { useToastStore } from '../../store/toastStore'
import { apiFetch, ApiError } from '../../lib/api'
import { socket } from '../../lib/socket'
import type { Comanda, MetodoPago } from '../../types'
import {
  CreditCard, Banknote, Smartphone, Receipt, CheckCircle, X, ChevronRight,
  Printer, SplitSquareHorizontal, Scissors, Loader2, Wallet,
} from 'lucide-react'

const METODOS: { valor: MetodoPago; label: string; icon: React.ElementType; color: string }[] = [
  { valor: 'efectivo', label: 'Efectivo', icon: Banknote, color: 'text-gold-700' },
  { valor: 'tarjeta', label: 'Tarjeta', icon: CreditCard, color: 'text-gray-600' },
  { valor: 'yape_plin', label: 'Yape/Plin', icon: Smartphone, color: 'text-rojo-600' },
  { valor: 'mixto', label: 'Mixto', icon: SplitSquareHorizontal, color: 'text-gray-500' },
]

const soles = (n: number) => `S/ ${n.toFixed(2)}`

// Igual que el servidor: los ítems cancelados o devueltos no se cobran
const itemsCobrables = (c: Comanda) => c.items.filter((i) => i.estado !== 'cancelado' && i.estado !== 'devuelto')
const subtotalDe = (c: Comanda) =>
  Math.round(itemsCobrables(c).reduce((a, i) => a + i.cantidad * i.precioUnitario, 0) * 100) / 100

function inicioDeHoy() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}
function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─── Modal de cobro ───────────────────────────────────────────────────────────

function ModalCobro({ comanda, onCerrar, onCobrado }: { comanda: Comanda; onCerrar: () => void; onCobrado: () => void }) {
  const cobrarComanda = useComandasStore((s) => s.cobrarComanda)
  // Arranca con el % del descuento elegido al tomar la comanda (editable)
  const promo = useCartaPublicaStore((s) => s.promociones.find((p) => p.id === comanda.tipoDescuento))

  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [descuento, setDescuento] = useState(promo?.porcentaje ?? 0)
  const [propina, setPropina] = useState(0)
  const [montoRecibido, setMontoRecibido] = useState('')
  const [montoEfectivo, setMontoEfectivo] = useState('')
  const [metodoResto, setMetodoResto] = useState<'tarjeta' | 'yape_plin'>('tarjeta')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [cobrada, setCobrada] = useState<Comanda | null>(null)

  const subtotal = subtotalDe(comanda)
  const descuentoMonto = Math.round(subtotal * (descuento / 100) * 100) / 100
  const total = Math.round((subtotal - descuentoMonto + propina) * 100) / 100
  const recibido = parseFloat(montoRecibido)
  const vuelto = metodo === 'efectivo' && recibido > total ? recibido - total : 0
  const efectivoMixto = parseFloat(montoEfectivo)

  // Validación antes de enviar (el servidor vuelve a validar)
  const problema =
    !(descuento >= 0 && descuento <= 100) ? 'El descuento debe estar entre 0 y 100%'
    : !(propina >= 0) ? 'La propina no puede ser negativa'
    : metodo === 'efectivo' && montoRecibido !== '' && !(recibido >= total) ? `Falta dinero: el total es ${soles(total)}`
    : metodo === 'mixto' && !(efectivoMixto > 0 && efectivoMixto < total) ? 'Indica cuánto paga en efectivo (menos que el total)'
    : ''

  const handleCobrar = async () => {
    if (problema || enviando) return
    setEnviando(true); setError('')
    try {
      const resultado = await cobrarComanda(comanda.id, {
        metodoPago: metodo,
        descuentoPct: descuento,
        propina,
        ...(metodo === 'efectivo' && montoRecibido !== '' ? { montoRecibido: recibido } : {}),
        ...(metodo === 'mixto' ? { montoEfectivo: efectivoMixto, metodoResto } : {}),
      })
      setCobrada(resultado)
      useMesasStore.getState().cargarMesas()
      onCobrado()
      imprimirCobro(resultado.id).catch((e) => useToastStore.getState().agregar({ tipo: 'error', titulo: 'No se pudo imprimir', mensaje: e instanceof Error ? e.message : 'Error de impresión', duracion: 6000 }))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cobrar: revisa la conexión e intenta de nuevo')
    } finally {
      setEnviando(false)
    }
  }

  if (cobrada) {
    const totalCobrado = cobrada.totalCobrado ?? total
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-8">
          <div className="w-16 h-16 bg-gold-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={36} className="text-gray-900" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">¡Pago registrado!</h2>
          <p className="text-gray-500 text-sm mb-4">Mesa {cobrada.numeroMesa} — {cobrada.mozo}</p>
          <div className="bg-gray-700 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Total cobrado</span>
              <span className="font-bold text-white">{soles(totalCobrado)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Método</span>
              <span className="font-medium text-white">{METODO_LABEL[cobrada.metodoPago ?? ''] ?? '—'}</span>
            </div>
            {(cobrada.vuelto ?? 0) > 0 && (
              <div className="flex justify-between text-base text-gold-400">
                <span>Vuelto</span>
                <span className="font-bold">{soles(cobrada.vuelto ?? 0)}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => imprimirCobro(cobrada.id, { abrirGaveta: false }).catch((e) => useToastStore.getState().agregar({ tipo: 'error', titulo: 'No se pudo imprimir', mensaje: e instanceof Error ? e.message : 'Error de impresión', duracion: 6000 }))}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              <Printer size={15} /> Imprimir
            </button>
            <button onClick={onCerrar} className="flex-1 py-2.5 bg-gold-600 text-white rounded-xl text-sm font-bold hover:bg-gold-700">
              Listo
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800">Cobrar — Mesa {comanda.numeroMesa}</h2>
            <p className="text-xs text-gray-400">{comanda.mozo} · {itemsCobrables(comanda).length} ítems</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-2">
          {/* ── Columna izquierda: detalle y totales ── */}
          <div className="flex flex-col min-h-0 p-6 gap-4 md:border-r border-gray-100">
            <div className="md:flex-1 md:min-h-0 md:overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50">
              {itemsCobrables(comanda).map((item) => (
                <div key={item.id} className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="text-gray-700">{item.cantidad}× {item.nombre}</span>
                  <span className="text-gray-500">{soles(item.cantidad * item.precioUnitario)}</span>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2 shrink-0">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span><span>{soles(subtotal)}</span>
              </div>
              {descuento > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Descuento ({descuento}%){promo ? ` · ${promo.nombre}` : ''}</span><span>-{soles(descuentoMonto)}</span>
                </div>
              )}
              {propina > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Propina</span><span>{soles(propina)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-800 pt-2 border-t border-gray-200">
                <span>TOTAL</span><span>{soles(total)}</span>
              </div>
            </div>
          </div>

          {/* ── Columna derecha: ajustes y pago ── */}
          <div className="flex flex-col p-6 gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descuento (%)</label>
                <input type="number" min={0} max={100} value={descuento}
                  onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Propina (S/)</label>
                <input type="number" min={0} step={0.5} value={propina}
                  onChange={(e) => setPropina(parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Método de pago</p>
              <div className="grid grid-cols-2 gap-2">
                {METODOS.map(({ valor, label, icon: Icon, color }) => (
                  <button key={valor} onClick={() => setMetodo(valor)}
                    className={`flex items-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                      metodo === valor
                        ? 'bg-gold-500 text-gray-900 shadow-sm'
                        : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}>
                    <Icon size={16} className={metodo === valor ? 'text-gray-900' : color} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {metodo === 'efectivo' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Monto recibido (S/)</label>
                <input type="number" min={0} step={0.5} value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  placeholder={`Vacío = pago exacto (${soles(total)})`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
                {vuelto > 0 && (
                  <p className="text-lg text-gold-700 font-bold mt-1">Vuelto: {soles(vuelto)}</p>
                )}
              </div>
            )}

            {metodo === 'mixto' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Parte en efectivo (S/)</label>
                  <input type="number" min={0} step={0.5} value={montoEfectivo}
                    onChange={(e) => setMontoEfectivo(e.target.value)}
                    placeholder="ej. 20.00"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    El resto{efectivoMixto > 0 && efectivoMixto < total ? ` (${soles(total - efectivoMixto)})` : ''} se paga con:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(['tarjeta', 'yape_plin'] as const).map((m) => (
                      <button key={m} onClick={() => setMetodoResto(m)}
                        className={`py-2 rounded-lg text-sm font-semibold ${
                          metodoResto === m ? 'bg-gold-500 text-gray-900' : 'border border-gray-200 text-gray-600'
                        }`}>
                        {METODO_LABEL[m]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(problema || error) && <p className="text-sm text-red-500 font-medium">{error || problema}</p>}

            <button onClick={handleCobrar} disabled={!!problema || enviando}
              className="mt-auto w-full flex items-center justify-center gap-2 py-3.5 bg-gold-600 text-white rounded-xl text-base font-bold hover:bg-gold-700 transition-colors disabled:opacity-50">
              {enviando && <Loader2 size={18} className="animate-spin" />}
              Cobrar {soles(total)}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
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
            {comanda.numeroMesa}
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm">Mesa {comanda.numeroMesa}</p>
            <p className="text-xs text-gray-400">{comanda.mozo} · {tiempoMin} min</p>
          </div>
        </div>
        <span className="text-lg font-bold text-gold-700">{soles(subtotalDe(comanda))}</span>
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
        {dividida ? (
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

  const porCobrar = comandas.filter(
    (c) => c.estado === 'lista' || c.estado === 'en_preparacion' || c.estado === 'enviada_cocina'
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
        apiFetch<Comanda[]>(`/api/comandas?estado=cerrada&cobradaDesde=${inicioDeHoy().toISOString()}`),
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
    const onActualizada = (c: Comanda) => { if (c.estado === 'cerrada') cargarDia() }
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
            <p className="text-xs text-white/75 mt-1">{soles(porCobrar.reduce((a, c) => a + subtotalDe(c), 0))} por cobrar</p>
          </div>
        </div>

        {/* Mesas por cobrar */}
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-3">Pendientes de cobro</h2>
          {porCobrar.length === 0 ? (
            <div className="text-center py-12 text-gray-300 bg-white rounded-xl border border-gray-100">
              <CheckCircle size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Sin mesas pendientes</p>
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
                          {c.numeroMesa}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-700">
                            Mesa {c.numeroMesa}
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
