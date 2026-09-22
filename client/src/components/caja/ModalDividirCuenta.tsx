import { useState } from 'react'
import {
  X, Plus, Minus, CheckCircle, DollarSign, Banknote, CreditCard,
  Smartphone, SplitSquareHorizontal, Printer, ChevronDown, ChevronUp,
  AlertTriangle,
} from 'lucide-react'
import { useComandasStore } from '../../store/comandasStore'
import { useMesasStore } from '../../store/mesasStore'
import type { Comanda, CuentaParcial, MetodoPago } from '../../types'

const COLORES_CUENTA = [
  { bg: 'bg-steel-500',   text: 'text-white',      badge: 'bg-steel-100 text-steel-700',   border: 'border-steel-300',  suave: 'bg-steel-50'   },
  { bg: 'bg-amber-500',   text: 'text-white',      badge: 'bg-amber-100 text-amber-700',   border: 'border-amber-300',  suave: 'bg-amber-50'   },
  { bg: 'bg-emerald-500', text: 'text-white',      badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-300', suave: 'bg-emerald-50' },
  { bg: 'bg-purple-500',  text: 'text-white',      badge: 'bg-purple-100 text-purple-700', border: 'border-purple-300', suave: 'bg-purple-50'  },
]

const METODOS: { valor: MetodoPago; label: string; icon: React.ElementType }[] = [
  { valor: 'efectivo',  label: 'Efectivo',  icon: Banknote          },
  { valor: 'tarjeta',   label: 'Tarjeta',   icon: CreditCard        },
  { valor: 'yape_plin', label: 'Yape/Plin', icon: Smartphone        },
  { valor: 'mixto',     label: 'Mixto',     icon: SplitSquareHorizontal },
]

// ── Formulario de pago para una cuenta ───────────────────────────────────────
function FormPagoCuenta({
  cuenta,
  onPagar,
}: {
  cuenta: CuentaParcial
  onPagar: (m: MetodoPago, desc: number, prop: number) => void
}) {
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [descuento, setDescuento] = useState(0)
  const [propina, setPropina] = useState(0)
  const [efectivo, setEfectivo] = useState(0)

  const total = cuenta.subtotal * (1 - descuento / 100) + propina
  const vuelto = metodo === 'efectivo' ? Math.max(0, efectivo - total) : 0

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {METODOS.map(({ valor, label, icon: Icon }) => (
          <button
            key={valor}
            onClick={() => setMetodo(valor)}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all ${
              metodo === valor
                ? 'border-steel-400 bg-steel-50 text-steel-700'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-medium text-gray-400 mb-1">Descuento (%)</label>
          <input type="number" min={0} max={100} value={descuento}
            onChange={(e) => setDescuento(parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-steel-400" />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-gray-400 mb-1">Propina (S/)</label>
          <input type="number" min={0} value={propina}
            onChange={(e) => setPropina(parseFloat(e.target.value) || 0)}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-steel-400" />
        </div>
      </div>
      {(metodo === 'efectivo' || metodo === 'mixto') && (
        <div>
          <label className="block text-[10px] font-medium text-gray-400 mb-1">
            {metodo === 'mixto' ? 'Monto efectivo (S/)' : 'Monto recibido (S/)'}
          </label>
          <input type="number" min={0} step={0.5} value={efectivo || ''}
            onChange={(e) => setEfectivo(parseFloat(e.target.value) || 0)}
            placeholder={`Mín. S/ ${total.toFixed(2)}`}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-steel-400" />
          {vuelto > 0 && (
            <p className="text-xs text-emerald-600 font-semibold mt-1">Vuelto: S/ {vuelto.toFixed(2)}</p>
          )}
        </div>
      )}
      <button
        onClick={() => onPagar(metodo, descuento, propina)}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors"
      >
        <DollarSign size={15} /> Cobrar S/ {total.toFixed(2)}
      </button>
    </div>
  )
}

// ── Modal principal ───────────────────────────────────────────────────────────
interface Props {
  comanda: Comanda
  onCerrar: () => void
}

// asignaciones: itemId → { cuentaNum: cantidad }
type Asignaciones = Record<string, Record<number, number>>

export default function ModalDividirCuenta({ comanda, onCerrar }: Props) {
  const guardarCuentas   = useComandasStore((s) => s.guardarCuentas)
  const pagarCuenta      = useComandasStore((s) => s.pagarCuenta)
  const cambiarEstado    = useMesasStore((s) => s.cambiarEstado)

  const [fase, setFase]   = useState<'asignar' | 'cobrar' | 'exito'>('asignar')
  const [numCuentas, setNumCuentas] = useState(2)
  const [asignaciones, setAsignaciones] = useState<Asignaciones>({})
  const [cuentasActuales, setCuentasActuales] = useState<CuentaParcial[]>([])
  const [expandida, setExpandida] = useState<string | null>(null)

  const itemsActivos = comanda.items.filter((i) => i.estado !== 'cancelado')

  // ── Helpers de cantidad ───────────────────────────────────────────────────
  const getAsignado = (itemId: string, cuentaNum: number): number =>
    asignaciones[itemId]?.[cuentaNum] ?? 0

  const getTotalAsignado = (itemId: string): number =>
    Object.values(asignaciones[itemId] ?? {}).reduce((a, b) => a + b, 0)

  const getResto = (item: { id: string; cantidad: number }): number =>
    item.cantidad - getTotalAsignado(item.id)

  const setCantidad = (itemId: string, cuentaNum: number, valor: number, maxTotal: number) => {
    setAsignaciones((prev) => {
      const itemPrev = { ...(prev[itemId] ?? {}) }
      // Suma de otras cuentas (sin esta)
      const otrosTotales = Object.entries(itemPrev)
        .filter(([k]) => Number(k) !== cuentaNum)
        .reduce((a, [, v]) => a + v, 0)
      const maxParaEsta = maxTotal - otrosTotales
      const final = Math.min(Math.max(0, valor), maxParaEsta)
      if (final === 0) {
        delete itemPrev[cuentaNum]
      } else {
        itemPrev[cuentaNum] = final
      }
      return { ...prev, [itemId]: itemPrev }
    })
  }

  const getSubtotalCuenta = (num: number): number =>
    itemsActivos.reduce((acc, item) => {
      return acc + getAsignado(item.id, num) * item.precioUnitario
    }, 0)

  const itemsConResto = itemsActivos.filter((i) => getResto(i) > 0)
  const todosAsignados = itemsConResto.length === 0

  // ── Confirmar división ────────────────────────────────────────────────────
  const confirmarDivision = () => {
    const cuentas: CuentaParcial[] = Array.from({ length: numCuentas }, (_, i) => {
      const num = i + 1
      const items = itemsActivos
        .filter((item) => (asignaciones[item.id]?.[num] ?? 0) > 0)
        .map((item) => ({
          itemComandaId: item.id,
          nombre: item.nombre,
          cantidad: asignaciones[item.id][num],
          precioUnitario: item.precioUnitario,
        }))
      const subtotal = items.reduce((a, it) => a + it.cantidad * it.precioUnitario, 0)
      return {
        id: `cuenta_${comanda.id}_${num}_${Date.now()}`,
        numero: num,
        items,
        subtotal,
        descuento: 0,
        propina: 0,
        total: subtotal,
        estado: 'pendiente' as const,
      }
    }).filter((c) => c.items.length > 0)

    guardarCuentas(comanda.id, cuentas)
    setCuentasActuales(cuentas)
    setExpandida(cuentas[0]?.id ?? null)
    setFase('cobrar')
  }

  // ── Pagar una cuenta ──────────────────────────────────────────────────────
  const handlePagar = (cuentaId: string, metodoPago: MetodoPago, descuento: number, propina: number) => {
    const todasPagadas = pagarCuenta(comanda.id, cuentaId, metodoPago, descuento, propina)
    setCuentasActuales((prev) =>
      prev.map((c) => {
        if (c.id !== cuentaId) return c
        const total = c.subtotal * (1 - descuento / 100) + propina
        return { ...c, metodoPago, descuento, propina, total, estado: 'pagada', pagadoEn: new Date().toISOString() }
      })
    )
    const siguiente = cuentasActuales.find((c) => c.id !== cuentaId && c.estado === 'pendiente')
    setExpandida(siguiente?.id ?? null)
    if (todasPagadas) {
      cambiarEstado(comanda.mesaId, 'en_limpieza')
      setFase('exito')
    }
  }

  // ── FASE: ÉXITO ───────────────────────────────────────────────────────────
  if (fase === 'exito') {
    const totalCobrado = cuentasActuales.reduce((acc, c) => acc + c.total, 0)
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={36} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">¡Cuentas cerradas!</h2>
          <p className="text-sm text-gray-400 mb-4">
            Mesa {comanda.numeroMesa} · {cuentasActuales.length} cuentas cobradas
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2 text-left">
            {cuentasActuales.map((c, i) => (
              <div key={c.id} className="flex justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-2">
                  <span className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center ${COLORES_CUENTA[i % 4].bg} ${COLORES_CUENTA[i % 4].text}`}>
                    {c.numero}
                  </span>
                  Cuenta {c.numero} · {METODOS.find((m) => m.valor === c.metodoPago)?.label ?? '—'}
                </span>
                <span className="font-semibold text-gray-700">S/ {c.total.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>S/ {totalCobrado.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              <Printer size={15} /> Imprimir
            </button>
            <button onClick={onCerrar} className="flex-1 py-2.5 bg-steel-500 text-white rounded-xl text-sm font-bold hover:bg-steel-600">
              Listo
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── FASE: COBRAR ──────────────────────────────────────────────────────────
  if (fase === 'cobrar') {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[92vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-bold text-gray-800">Cobro dividido — Mesa {comanda.numeroMesa}</h2>
              <p className="text-xs text-gray-400">{cuentasActuales.length} cuentas · {comanda.mozo}</p>
            </div>
            <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
              <X size={18} />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-3">
            {cuentasActuales.map((cuenta, idx) => {
              const color = COLORES_CUENTA[idx % 4]
              const esExpandida = expandida === cuenta.id
              const pagada = cuenta.estado === 'pagada'
              return (
                <div key={cuenta.id}
                  className={`rounded-xl border transition-all ${
                    pagada ? 'border-emerald-200 bg-emerald-50'
                    : esExpandida ? `${color.border} ${color.suave}`
                    : 'border-gray-200 bg-white'
                  }`}
                >
                  <button
                    className="w-full flex items-center justify-between px-4 py-3"
                    onClick={() => !pagada && setExpandida(esExpandida ? null : cuenta.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-lg text-sm font-bold flex items-center justify-center ${color.bg} ${color.text}`}>
                        {cuenta.numero}
                      </span>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800">Cuenta {cuenta.numero}</p>
                        <p className="text-xs text-gray-400">
                          {cuenta.items.reduce((a, i) => a + i.cantidad, 0)} unidades
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-700">S/ {cuenta.total.toFixed(2)}</span>
                      {pagada
                        ? <CheckCircle size={18} className="text-emerald-500" />
                        : esExpandida
                        ? <ChevronUp size={16} className="text-gray-400" />
                        : <ChevronDown size={16} className="text-gray-400" />
                      }
                    </div>
                  </button>

                  {(esExpandida || pagada) && (
                    <div className="px-4 pb-3">
                      <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 mb-2">
                        {cuenta.items.map((it) => (
                          <div key={it.itemComandaId} className="flex justify-between px-3 py-2 text-xs text-gray-600">
                            <span>{it.cantidad}× {it.nombre}</span>
                            <span>S/ {(it.cantidad * it.precioUnitario).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      {pagada ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                          <CheckCircle size={13} />
                          Pagado con {METODOS.find((m) => m.valor === cuenta.metodoPago)?.label ?? cuenta.metodoPago}
                        </div>
                      ) : (
                        <FormPagoCuenta
                          cuenta={cuenta}
                          onPagar={(m, d, p) => handlePagar(cuenta.id, m, d, p)}
                        />
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── FASE: ASIGNAR ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800">Dividir cuenta — Mesa {comanda.numeroMesa}</h2>
            <p className="text-xs text-gray-400">
              {comanda.mozo} · {itemsActivos.length} ítems · S/ {comanda.total.toFixed(2)}
            </p>
          </div>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Resumen de cuentas con subtotales */}
        <div className="px-6 pt-4 pb-2 flex items-center gap-2 flex-wrap">
          {Array.from({ length: numCuentas }, (_, i) => i + 1).map((num) => {
            const color = COLORES_CUENTA[(num - 1) % 4]
            const subtotal = getSubtotalCuenta(num)
            return (
              <div key={num} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${color.bg} ${color.text}`}>
                <span>C{num}</span>
                <span className="opacity-70">·</span>
                <span>S/ {subtotal.toFixed(2)}</span>
              </div>
            )
          })}
          {numCuentas < 4 && (
            <button
              onClick={() => setNumCuentas((n) => n + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-dashed border-gray-300 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
            >
              <Plus size={12} /> Cuenta
            </button>
          )}
        </div>

        {/* Instrucción */}
        <p className="px-6 py-1.5 text-xs text-gray-400">
          Usa <span className="font-semibold text-gray-600">+ / −</span> para indicar cuántas unidades va a pagar cada cuenta
        </p>

        {/* Tabla de ítems con steppers */}
        <div className="overflow-y-auto flex-1 px-4 py-2 space-y-2">
          {itemsActivos.map((item) => {
            const resto = getResto(item)
            const todoAsignado = resto === 0

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-3 transition-all ${
                  todoAsignado ? 'border-gray-200 bg-gray-50' : 'border-amber-300 bg-amber-50'
                }`}
              >
                {/* Nombre del ítem */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {item.nombre}
                    </p>
                    {item.nota && (
                      <p className="text-xs text-gray-400 truncate">{item.nota}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-xs font-bold text-gray-700">
                      {item.cantidad} uds · S/ {(item.cantidad * item.precioUnitario).toFixed(2)}
                    </p>
                    {!todoAsignado && (
                      <p className="text-xs text-amber-600 font-medium flex items-center gap-1 justify-end">
                        <AlertTriangle size={10} /> {resto} sin asignar
                      </p>
                    )}
                    {todoAsignado && (
                      <p className="text-xs text-emerald-600 font-medium flex items-center gap-1 justify-end">
                        <CheckCircle size={10} /> listo
                      </p>
                    )}
                  </div>
                </div>

                {/* Steppers por cuenta */}
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: numCuentas }, (_, i) => i + 1).map((num) => {
                    const color = COLORES_CUENTA[(num - 1) % 4]
                    const cantidad = getAsignado(item.id, num)
                    return (
                      <div key={num} className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${color.badge}`}>
                          C{num}
                        </span>
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                          <button
                            onClick={() => setCantidad(item.id, num, cantidad - 1, item.cantidad)}
                            disabled={cantidad === 0}
                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center text-sm font-bold text-gray-800 select-none">
                            {cantidad}
                          </span>
                          <button
                            onClick={() => setCantidad(item.id, num, cantidad + 1, item.cantidad)}
                            disabled={resto === 0 && cantidad < item.cantidad}
                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        {cantidad > 0 && (
                          <span className="text-xs text-gray-400">
                            S/ {(cantidad * item.precioUnitario).toFixed(2)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          {!todosAsignados && (
            <p className="text-xs text-amber-600 mb-3 text-center flex items-center justify-center gap-1.5">
              <AlertTriangle size={12} />
              {itemsConResto.reduce((a, i) => a + getResto(i), 0)} unidades sin asignar a ninguna cuenta
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onCerrar}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarDivision}
              disabled={!todosAsignados}
              className="flex-1 py-2.5 bg-steel-500 text-white rounded-xl text-sm font-bold hover:bg-steel-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmar y cobrar
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
