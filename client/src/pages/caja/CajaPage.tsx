import { useState } from 'react'
import Header from '../../components/layout/Header'
import ModalDividirCuenta from '../../components/caja/ModalDividirCuenta'
import { useComandasStore } from '../../store/comandasStore'
import { useMesasStore } from '../../store/mesasStore'
import { imprimirTicketCaja } from '../../lib/ticket'
import type { Comanda, MetodoPago } from '../../types'
import {
  CreditCard, Banknote, Smartphone, DollarSign, Receipt,
  CheckCircle, X, ChevronRight, Printer, SplitSquareHorizontal,
  Scissors,
} from 'lucide-react'

const METODOS: { valor: MetodoPago; label: string; icon: React.ElementType; color: string }[] = [
  { valor: 'efectivo', label: 'Efectivo', icon: Banknote, color: 'text-gold-700' },
  { valor: 'tarjeta', label: 'Tarjeta', icon: CreditCard, color: 'text-gray-600' },
  { valor: 'yape_plin', label: 'Yape/Plin', icon: Smartphone, color: 'text-rojo-600' },
  { valor: 'mixto', label: 'Mixto', icon: SplitSquareHorizontal, color: 'text-gray-500' },
]

function ModalCobro({ comanda, onCerrar }: { comanda: Comanda; onCerrar: () => void }) {
  const actualizarEstadoComanda = useComandasStore((s) => s.actualizarEstadoComanda)
  const cambiarEstado = useMesasStore((s) => s.cambiarEstado)

  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [descuento, setDescuento] = useState(0)
  const [propina, setPropina] = useState(0)
  const [montoEfectivo, setMontoEfectivo] = useState(0)
  const [cobrado, setCobrado] = useState(false)

  const subtotal = comanda.total
  const descuentoMonto = subtotal * (descuento / 100)
  const total = subtotal - descuentoMonto + propina
  const vuelto = metodo === 'efectivo' ? Math.max(0, montoEfectivo - total) : 0

  const datosTicket = { metodo, subtotal, descuentoPct: descuento, propina, total, vuelto }

  const handleCobrar = () => {
    actualizarEstadoComanda(comanda.id, 'cerrada')
    cambiarEstado(comanda.mesaId, 'en_limpieza')
    setCobrado(true)
    imprimirTicketCaja(comanda, datosTicket)
  }

  if (cobrado) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-8">
          <div className="w-16 h-16 bg-gold-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={36} className="text-gray-900" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">¡Pago recibido!</h2>
          <p className="text-gray-500 text-sm mb-4">Mesa {comanda.numeroMesa} — {comanda.mozo}</p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total cobrado</span>
              <span className="font-bold text-gray-800">S/ {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Método</span>
              <span className="font-medium">{METODOS.find((m) => m.valor === metodo)?.label}</span>
            </div>
            {vuelto > 0 && (
              <div className="flex justify-between text-sm text-gold-700">
                <span>Vuelto</span>
                <span className="font-bold">S/ {vuelto.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => imprimirTicketCaja(comanda, datosTicket)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
            >
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800">Cobrar — Mesa {comanda.numeroMesa}</h2>
            <p className="text-xs text-gray-400">{comanda.mozo} · {comanda.items.length} ítems</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="border border-gray-100 rounded-xl divide-y divide-gray-50">
            {comanda.items.filter((i) => i.estado !== 'cancelado').map((item) => (
              <div key={item.id} className="flex justify-between px-4 py-2.5 text-sm">
                <span className="text-gray-700">{item.cantidad}× {item.nombre}</span>
                <span className="text-gray-500">S/ {(item.cantidad * item.precioUnitario).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Descuento (%)</label>
              <input type="number" min={0} max={100} value={descuento}
                onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Propina (S/)</label>
              <input type="number" min={0} value={propina}
                onChange={(e) => setPropina(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Subtotal</span><span>S/ {subtotal.toFixed(2)}</span>
            </div>
            {descuento > 0 && (
              <div className="flex justify-between text-sm text-red-500">
                <span>Descuento ({descuento}%)</span><span>-S/ {descuentoMonto.toFixed(2)}</span>
              </div>
            )}
            {propina > 0 && (
              <div className="flex justify-between text-sm text-gray-500">
                <span>Propina</span><span>S/ {propina.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-gray-200">
              <span>TOTAL</span><span>S/ {total.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {METODOS.map(({ valor, label, icon: Icon, color }) => (
                <button key={valor} onClick={() => setMetodo(valor)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    metodo === valor
                      ? 'border-gold-500 bg-gold-50 text-gold-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}>
                  <Icon size={16} className={metodo === valor ? 'text-gold-700' : color} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {(metodo === 'efectivo' || metodo === 'mixto') && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {metodo === 'mixto' ? 'Monto en efectivo (S/)' : 'Monto recibido (S/)'}
              </label>
              <input type="number" min={0} step={0.5} value={montoEfectivo || ''}
                onChange={(e) => setMontoEfectivo(parseFloat(e.target.value) || 0)}
                placeholder={`Mínimo S/ ${total.toFixed(2)}`}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500" />
              {vuelto > 0 && (
                <p className="text-sm text-gold-700 font-semibold mt-1">
                  Vuelto: S/ {vuelto.toFixed(2)}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100">
          <button onClick={handleCobrar}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gold-600 text-white rounded-xl text-base font-bold hover:bg-gold-700 transition-colors">
            <DollarSign size={18} /> Cobrar S/ {total.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  )
}

function TarjetaCobro({
  comanda,
  onCobrar,
  onDividir,
}: {
  comanda: Comanda
  onCobrar: () => void
  onDividir: () => void
}) {
  const tiempoMin = Math.floor((Date.now() - new Date(comanda.creadaEn).getTime()) / 60000)
  const itemsActivos = comanda.items.filter((i) => i.estado !== 'cancelado')

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
        <span className="text-lg font-bold text-gold-700">S/ {comanda.total.toFixed(2)}</span>
      </div>

      {/* Ítems preview */}
      <div className="text-xs text-gray-400 mb-3 space-y-0.5">
        {itemsActivos.slice(0, 3).map((it) => (
          <div key={it.id} className="flex justify-between">
            <span className="truncate">{it.cantidad}× {it.nombre}</span>
            <span className="ml-2 shrink-0">S/ {(it.cantidad * it.precioUnitario).toFixed(2)}</span>
          </div>
        ))}
        {itemsActivos.length > 3 && (
          <p className="text-gray-300">+{itemsActivos.length - 3} más...</p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-2">
        <button
          onClick={onDividir}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gold-200 text-gold-700 rounded-lg text-xs font-semibold hover:bg-gold-50 transition-colors"
        >
          <Scissors size={13} /> Dividir
        </button>
        <button
          onClick={onCobrar}
          className="flex-[2] flex items-center justify-center gap-1.5 py-2 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 transition-colors"
        >
          <DollarSign size={14} /> Cobrar cuenta
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

export default function CajaPage() {
  const comandas = useComandasStore((s) => s.comandas)
  const [comandaACobrar, setComandaACobrar] = useState<Comanda | null>(null)
  const [comandaADividir, setComandaADividir] = useState<Comanda | null>(null)

  const porCobrar = comandas.filter(
    (c) => c.estado === 'lista' || c.estado === 'en_preparacion' || c.estado === 'enviada_cocina'
  )
  const cobradas = comandas.filter((c) => c.estado === 'cerrada')
  const totalDelDia = cobradas.reduce((acc, c) => acc + c.total, 0)

  // Para cobradas con cuentas divididas, sumar los totales reales de cuentas
  const totalRealDelDia = cobradas.reduce((acc, c) => {
    if (c.cuentas && c.cuentas.length > 0) {
      return acc + c.cuentas.reduce((s, ct) => s + ct.total, 0)
    }
    return acc + c.total
  }, 0)

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Caja" subtitulo="Gestión de cobros y pagos" />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gold-100 rounded-xl flex items-center justify-center">
                <DollarSign size={20} className="text-gold-700" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Ventas del día</p>
                <p className="text-2xl font-bold text-gold-700">S/ {totalRealDelDia.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                <Receipt size={20} className="text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Comandas cerradas</p>
                <p className="text-2xl font-bold text-gray-700">{cobradas.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rojo-100 rounded-xl flex items-center justify-center">
                <CreditCard size={20} className="text-rojo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Pendientes de cobro</p>
                <p className="text-2xl font-bold text-rojo-600">{porCobrar.length}</p>
              </div>
            </div>
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
                <TarjetaCobro
                  key={c.id}
                  comanda={c}
                  onCobrar={() => setComandaACobrar(c)}
                  onDividir={() => setComandaADividir(c)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Historial del día */}
        {cobradas.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-600 mb-3">Cobros realizados hoy</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {cobradas.map((c) => {
                const tieneCuentas = c.cuentas && c.cuentas.length > 0
                const totalReal = tieneCuentas
                  ? c.cuentas!.reduce((acc, ct) => acc + ct.total, 0)
                  : c.total
                return (
                  <div key={c.id} className="px-5 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                          {c.numeroMesa}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Mesa {c.numeroMesa}</p>
                          <p className="text-xs text-gray-400">{c.mozo}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-700">S/ {totalReal.toFixed(2)}</p>
                        <div className="flex items-center gap-1 justify-end">
                          {tieneCuentas && (
                            <span className="text-xs px-2 py-0.5 bg-gray-500 text-white rounded-full font-semibold flex items-center gap-1">
                              <Scissors size={10} /> {c.cuentas!.length} cuentas
                            </span>
                          )}
                          <span className="text-xs px-2 py-0.5 bg-gold-600 text-white rounded-full font-semibold">Pagado</span>
                        </div>
                      </div>
                    </div>
                    {/* Detalle de cuentas parciales */}
                    {tieneCuentas && (
                      <div className="mt-2 ml-11 space-y-1">
                        {c.cuentas!.map((ct, idx) => (
                          <div key={ct.id} className="flex items-center justify-between text-xs text-gray-400">
                            <span className="flex items-center gap-1.5">
                              <span className={`w-4 h-4 rounded text-[10px] font-bold flex items-center justify-center
                                ${idx === 0 ? 'bg-gold-500 text-gray-900' : idx === 1 ? 'bg-rojo-500 text-white' : idx === 2 ? 'bg-steel-500 text-white' : 'bg-gray-500 text-white'}`}>
                                {ct.numero}
                              </span>
                              Cuenta {ct.numero} · {METODOS.find((m) => m.valor === ct.metodoPago)?.label ?? ct.metodoPago ?? '—'}
                            </span>
                            <span>S/ {ct.total.toFixed(2)}</span>
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
        <ModalCobro comanda={comandaACobrar} onCerrar={() => setComandaACobrar(null)} />
      )}
      {comandaADividir && (
        <ModalDividirCuenta comanda={comandaADividir} onCerrar={() => setComandaADividir(null)} />
      )}
    </div>
  )
}
