import { useState } from 'react'
import {
  X, Plus, Minus, CheckCircle, Banknote, CreditCard,
  Smartphone, Printer, ChevronDown, ChevronUp,
  AlertTriangle, Loader2,
} from 'lucide-react'
import { useComandasStore } from '../../store/comandasStore'
import { useMesasStore } from '../../store/mesasStore'
import { imprimirCobro } from '../../lib/impresion'
import { useToastStore } from '../../store/toastStore'
import { ApiError } from '../../lib/api'
import type { Comanda, CuentaParcial, MetodoPago } from '../../types'

const COLORES_CUENTA = [
  { bg: 'bg-steel-500',   text: 'text-white', border: 'border-steel-500'   },
  { bg: 'bg-amber-500',   text: 'text-white', border: 'border-amber-500'   },
  { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-500' },
  { bg: 'bg-purple-500',  text: 'text-white', border: 'border-purple-500'  },
]

const METODOS: { valor: MetodoPago; label: string; icon: React.ElementType }[] = [
  { valor: 'efectivo',  label: 'Efectivo',  icon: Banknote          },
  { valor: 'tarjeta',   label: 'Tarjeta',   icon: CreditCard        },
  { valor: 'yape_plin', label: 'Yape/Plin', icon: Smartphone        },
]

// ── Formulario de pago para una cuenta ───────────────────────────────────────
function FormPagoCuenta({
  cuenta,
  onPagar,
}: {
  cuenta: CuentaParcial
  onPagar: (m: MetodoPago, desc: number, prop: number) => Promise<void>
}) {
  const [metodo, setMetodo] = useState<MetodoPago>('efectivo')
  const [descuento, setDescuento] = useState(0)
  const [propina, setPropina] = useState(0)
  const [efectivo, setEfectivo] = useState(0)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const total = Math.round((cuenta.subtotal * (1 - descuento / 100) + propina) * 100) / 100
  const vuelto = metodo === 'efectivo' ? Math.max(0, efectivo - total) : 0
  const problema =
    !(descuento >= 0 && descuento <= 100) ? 'Descuento entre 0 y 100%'
    : !(propina >= 0) ? 'Propina inválida'
    : metodo === 'efectivo' && efectivo > 0 && efectivo < total ? `Falta dinero: el total es S/ ${total.toFixed(2)}`
    : ''

  const pagar = async () => {
    if (problema || enviando) return
    setEnviando(true); setError('')
    try {
      await onPagar(metodo, descuento, propina)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cobrar: revisa la conexión')
      setEnviando(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        {METODOS.map(({ valor, label, icon: Icon }) => (
          <button
            key={valor}
            onClick={() => setMetodo(valor)}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              metodo === valor
                ? 'bg-steel-500 text-white'
                : 'border border-gray-200 bg-white text-gray-500 hover:border-gray-300'
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
      {metodo === 'efectivo' && (
        <div>
          <label className="block text-[10px] font-medium text-gray-400 mb-1">
            Monto recibido (S/)
          </label>
          <input type="number" min={0} step={0.5} value={efectivo || ''}
            onChange={(e) => setEfectivo(parseFloat(e.target.value) || 0)}
            placeholder={`Vacío = exacto (S/ ${total.toFixed(2)})`}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-steel-400" />
          {vuelto > 0 && (
            <p className="text-xs text-emerald-600 font-semibold mt-1">Vuelto: S/ {vuelto.toFixed(2)}</p>
          )}
        </div>
      )}
      {(problema || error) && <p className="text-xs text-red-500 font-medium">{error || problema}</p>}
      <button
        onClick={pagar}
        disabled={!!problema || enviando}
        className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
      >
        {enviando && <Loader2 size={15} className="animate-spin" />}
        Cobrar S/ {total.toFixed(2)}
      </button>
    </div>
  )
}

// ── Modal principal ───────────────────────────────────────────────────────────
interface Props {
  comanda: Comanda
  onCerrar: () => void
  onCobrado?: () => void
}

// asignaciones: itemId → { cuentaNum: cantidad }
type Asignaciones = Record<string, Record<number, number>>

export default function ModalDividirCuenta({ comanda, onCerrar, onCobrado }: Props) {
  const dividirCuenta = useComandasStore((s) => s.dividirCuenta)
  const pagarCuenta   = useComandasStore((s) => s.pagarCuenta)

  // Si la cuenta ya estaba dividida (se cerró el modal a medio cobrar), se retoma donde quedó
  const yaDividida = (comanda.cuentas?.length ?? 0) > 0
  const [fase, setFase]   = useState<'asignar' | 'cobrar' | 'exito'>(yaDividida ? 'cobrar' : 'asignar')
  const [numCuentas, setNumCuentas] = useState(2)
  const [asignaciones, setAsignaciones] = useState<Asignaciones>({})
  const [cuentasActuales, setCuentasActuales] = useState<CuentaParcial[]>(comanda.cuentas ?? [])
  const [expandida, setExpandida] = useState<string | null>(comanda.cuentas?.find((c) => c.estado === 'pendiente')?.id ?? null)
  const [comandaFinal, setComandaFinal] = useState<Comanda | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [errorDivision, setErrorDivision] = useState('')

  // Los ítems cancelados o devueltos no se cobran (el servidor tampoco los acepta)
  const itemsActivos = comanda.items.filter((i) => i.estado !== 'cancelado' && i.estado !== 'devuelto')

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

  // ── Confirmar división (se guarda en el servidor) ─────────────────────────
  const confirmarDivision = async () => {
    const cuentas = Array.from({ length: numCuentas }, (_, i) => {
      const num = i + 1
      const items = itemsActivos
        .filter((item) => (asignaciones[item.id]?.[num] ?? 0) > 0)
        .map((item) => ({ itemComandaId: item.id, cantidad: asignaciones[item.id][num] }))
      return { numero: num, items }
    }).filter((c) => c.items.length > 0)

    setEnviando(true); setErrorDivision('')
    try {
      const actualizada = await dividirCuenta(comanda.id, cuentas)
      const creadas = actualizada.cuentas ?? []
      setCuentasActuales(creadas)
      setExpandida(creadas[0]?.id ?? null)
      setFase('cobrar')
    } catch (e) {
      setErrorDivision(e instanceof ApiError ? e.message : 'No se pudo dividir: revisa la conexión')
    } finally {
      setEnviando(false)
    }
  }

  // ── Pagar una cuenta ──────────────────────────────────────────────────────
  const handlePagar = async (cuentaId: string, metodoPago: MetodoPago, descuento: number, propina: number) => {
    const actualizada = await pagarCuenta(comanda.id, cuentaId, { metodoPago, descuento, propina })
    const cuentas = actualizada.cuentas ?? []
    setCuentasActuales(cuentas)
    setExpandida(cuentas.find((c) => c.estado === 'pendiente')?.id ?? null)
    onCobrado?.()
    if (actualizada.estado === 'cerrada') {
      setComandaFinal(actualizada)
      useMesasStore.getState().cargarMesas()
      imprimirCobro(actualizada.id).catch((e) => useToastStore.getState().agregar({ tipo: 'error', titulo: 'No se pudo imprimir', mensaje: e instanceof Error ? e.message : 'Error de impresión', duracion: 6000 }))
      setFase('exito')
    }
  }

  // ── FASE: ÉXITO ───────────────────────────────────────────────────────────
  if (fase === 'exito') {
    const totalCobrado = cuentasActuales.reduce((acc, c) => acc + c.total, 0)
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={36} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">¡Cuentas cerradas!</h2>
          <p className="text-sm text-gray-400 mb-4">
            Mesa {comanda.numeroMesa} · {cuentasActuales.length} cuentas cobradas
          </p>
          <div className="bg-gray-700 rounded-xl p-4 mb-6 space-y-2 text-left">
            {cuentasActuales.map((c, i) => (
              <div key={c.id} className="flex justify-between text-sm">
                <span className="text-white/80 flex items-center gap-2">
                  <span className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center ${COLORES_CUENTA[i % 4].bg} ${COLORES_CUENTA[i % 4].text}`}>
                    {c.numero}
                  </span>
                  Cuenta {c.numero} · {METODOS.find((m) => m.valor === c.metodoPago)?.label ?? '—'}
                </span>
                <span className="font-semibold text-white">S/ {c.total.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/20">
              <span>Total</span>
              <span>S/ {totalCobrado.toFixed(2)}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => comandaFinal && imprimirCobro(comandaFinal.id, { abrirGaveta: false }).catch((e) => useToastStore.getState().agregar({ tipo: 'error', titulo: 'No se pudo imprimir', mensaje: e instanceof Error ? e.message : 'Error de impresión', duracion: 6000 }))}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
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
              const resaltada = pagada || esExpandida
              return (
                <div key={cuenta.id}
                  className={`rounded-xl border overflow-hidden transition-all ${
                    pagada ? 'border-emerald-500' : esExpandida ? color.border : 'border-gray-200'
                  }`}
                >
                  <button
                    className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                      pagada ? 'bg-emerald-500' : esExpandida ? color.bg : 'bg-white'
                    }`}
                    onClick={() => !pagada && setExpandida(esExpandida ? null : cuenta.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-lg text-sm font-bold flex items-center justify-center ${
                        resaltada ? 'bg-black/15 text-white' : `${color.bg} ${color.text}`
                      }`}>
                        {cuenta.numero}
                      </span>
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${resaltada ? 'text-white' : 'text-gray-800'}`}>Cuenta {cuenta.numero}</p>
                        <p className={`text-xs ${resaltada ? 'text-white/70' : 'text-gray-400'}`}>
                          {cuenta.items.reduce((a, i) => a + i.cantidad, 0)} unidades
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${resaltada ? 'text-white' : 'text-gray-700'}`}>S/ {cuenta.total.toFixed(2)}</span>
                      {pagada
                        ? <CheckCircle size={18} className="text-white" />
                        : esExpandida
                        ? <ChevronUp size={16} className="text-white/80" />
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
                className={`rounded-xl p-3 transition-all ${
                  todoAsignado ? 'border border-gray-200 bg-white' : 'bg-amber-500'
                }`}
              >
                {/* Nombre del ítem */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${todoAsignado ? 'text-gray-800' : 'text-gray-900'}`}>
                      {item.nombre}
                    </p>
                    {item.nota && (
                      <p className={`text-xs truncate ${todoAsignado ? 'text-gray-400' : 'text-gray-900/70'}`}>{item.nota}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className={`text-xs font-bold ${todoAsignado ? 'text-gray-700' : 'text-gray-900'}`}>
                      {item.cantidad} uds · S/ {(item.cantidad * item.precioUnitario).toFixed(2)}
                    </p>
                    {!todoAsignado && (
                      <p className="text-xs text-gray-900 font-semibold flex items-center gap-1 justify-end">
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
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${color.bg} ${color.text}`}>
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
          {errorDivision && <p className="text-xs text-red-500 mb-3 text-center font-medium">{errorDivision}</p>}
          <div className="flex gap-3">
            <button
              onClick={onCerrar}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={confirmarDivision}
              disabled={!todosAsignados || enviando}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-steel-500 text-white rounded-xl text-sm font-bold hover:bg-steel-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {enviando && <Loader2 size={15} className="animate-spin" />}
              Confirmar y cobrar
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
