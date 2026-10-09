import { useState } from 'react'
import { useComandasStore } from '../../store/comandasStore'
import { useMesasStore } from '../../store/mesasStore'
import { useCartaPublicaStore } from '../../store/cartaPublicaStore'
import { imprimirCobro, METODO_LABEL } from '../../lib/impresion'
import { useToastStore } from '../../store/toastStore'
import { ApiError } from '../../lib/api'
import { etiquetaComanda, esPedido } from '../../lib/etiqueta'
import { cargosDe } from '../comandas/Descartables'
import type { Comanda, MetodoPago } from '../../types'
import { CreditCard, Banknote, Smartphone, CheckCircle, X, Printer, SplitSquareHorizontal, Loader2 } from 'lucide-react'

const METODOS: { valor: MetodoPago; label: string; icon: React.ElementType; color: string }[] = [
  { valor: 'efectivo', label: 'Efectivo', icon: Banknote, color: 'text-gold-700' },
  { valor: 'tarjeta', label: 'Tarjeta', icon: CreditCard, color: 'text-gray-600' },
  { valor: 'yape_plin', label: 'Yape/Plin', icon: Smartphone, color: 'text-rojo-600' },
  { valor: 'mixto', label: 'Mixto', icon: SplitSquareHorizontal, color: 'text-gray-500' },
]

export const soles = (n: number) => `S/ ${n.toFixed(2)}`

// Igual que el servidor: los ítems cancelados o devueltos no se cobran
export const itemsCobrables = (c: Comanda) => c.items.filter((i) => i.estado !== 'cancelado' && i.estado !== 'devuelto')
export const subtotalDe = (c: Comanda) =>
  Math.round(itemsCobrables(c).reduce((a, i) => a + i.cantidad * i.precioUnitario, 0) * 100) / 100
// Lo que se le cobra al cliente sin descuentos ni propina (incluye el descartable)
export const totalAPagar = (c: Comanda) => Math.round((subtotalDe(c) + (c.descartable ?? 0)) * 100) / 100

// ─── Modal de cobro ───────────────────────────────────────────────────────────

export default function ModalCobro({ comanda, onCerrar, onCobrado }: { comanda: Comanda; onCerrar: () => void; onCobrado: () => void }) {
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
  // Descartable de un pedido para llevar: se cobra aparte y no recibe descuento (igual que el servidor)
  const descartable = comanda.descartable ?? 0
  const descuentoMonto = Math.round(subtotal * (descuento / 100) * 100) / 100
  const total = Math.round((subtotal - descuentoMonto + descartable + propina) * 100) / 100
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
          <p className="text-gray-500 text-sm mb-4">{etiquetaComanda(cobrada)} — {cobrada.mozo}</p>
          {esPedido(cobrada) && cobrada.estado !== 'cerrada' && (
            <p className="text-sm text-gray-700 bg-gold-50 border border-gold-200 rounded-lg px-3 py-2 mb-4">
              Pedido pagado. Márcalo como <b>entregado</b> en Pedidos cuando el cliente lo recoja.
            </p>
          )}
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
            <h2 className="font-bold text-gray-800">Cobrar — {etiquetaComanda(comanda)}</h2>
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
              {descartable > 0 && cargosDe(comanda).montoDescartables > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Descartables ×{cargosDe(comanda).n}</span><span>{soles(cargosDe(comanda).montoDescartables)}</span>
                </div>
              )}
              {cargosDe(comanda).envio > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Delivery (envío)</span><span>{soles(cargosDe(comanda).envio)}</span>
                </div>
              )}
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
