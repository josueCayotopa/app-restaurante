import { useEffect, useState } from 'react'
import {
  Lock, Unlock, ArrowDownCircle, ArrowUpCircle, X, Check, Loader2, History, Printer, AlertTriangle,
} from 'lucide-react'
import { useCajaStore, type CajaSesion } from '../../store/cajaStore'
import { apiFetch, ApiError } from '../../lib/api'
import { imprimirCierre } from '../../lib/impresion'
import { useToastStore } from '../../store/toastStore'
import { socket } from '../../lib/socket'

const soles = (n: number | null | undefined) => `S/ ${(n ?? 0).toFixed(2)}`
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

function Modal({ titulo, onCerrar, children, ancho = 'max-w-md' }: {
  titulo: string; onCerrar: () => void; children: React.ReactNode; ancho?: string
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${ancho} max-h-[92vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">{titulo}</h2>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500'
const errorDe = (e: unknown) => (e instanceof ApiError ? e.message : 'No se pudo completar: revisa la conexión')

// ─── Abrir caja ───────────────────────────────────────────────────────────────

function ModalAbrir({ onCerrar }: { onCerrar: () => void }) {
  const abrir = useCajaStore((s) => s.abrir)
  const [monto, setMonto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true); setError('')
    try { await abrir(parseFloat(monto) || 0); onCerrar() }
    catch (err) { setError(errorDe(err)); setEnviando(false) }
  }

  return (
    <Modal titulo="Abrir caja" onCerrar={onCerrar}>
      <form onSubmit={confirmar} className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Fondo inicial en efectivo (sencillo)</label>
          <input type="number" min={0} step={0.1} value={monto} autoFocus
            onChange={(e) => setMonto(e.target.value)} placeholder="ej. 100.00" className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">El dinero con el que empieza la caja. Se suma al efectivo esperado del cierre.</p>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={enviando}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gold-600 text-white rounded-xl font-bold hover:bg-gold-700 disabled:opacity-50">
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />} Abrir caja con {soles(parseFloat(monto) || 0)}
        </button>
      </form>
    </Modal>
  )
}

// ─── Ingreso / retiro de efectivo ────────────────────────────────────────────

function ModalMovimiento({ onCerrar }: { onCerrar: () => void }) {
  const movimiento = useCajaStore((s) => s.movimiento)
  const [tipo, setTipo] = useState<'retiro' | 'ingreso'>('retiro')
  const [monto, setMonto] = useState('')
  const [concepto, setConcepto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault()
    setEnviando(true); setError('')
    try { await movimiento(tipo, parseFloat(monto), concepto); onCerrar() }
    catch (err) { setError(errorDe(err)); setEnviando(false) }
  }

  return (
    <Modal titulo="Movimiento de efectivo" onCerrar={onCerrar}>
      <form onSubmit={confirmar} className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {([['retiro', 'Retiro / pago', ArrowUpCircle], ['ingreso', 'Ingreso', ArrowDownCircle]] as const).map(([v, label, Icon]) => (
            <button key={v} type="button" onClick={() => setTipo(v)}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold ${
                tipo === v ? 'bg-gold-500 text-gray-900' : 'border border-gray-200 text-gray-600'
              }`}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Monto (S/)</label>
          <input required type="number" min={0.1} step={0.1} value={monto} onChange={(e) => setMonto(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Motivo</label>
          <input required value={concepto} onChange={(e) => setConcepto(e.target.value)}
            placeholder={tipo === 'retiro' ? 'ej. Pago a proveedor de verduras' : 'ej. Cambio / sencillo adicional'}
            className={inputCls} />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={enviando}
          className="w-full flex items-center justify-center gap-2 py-3 bg-gold-600 text-white rounded-xl font-bold hover:bg-gold-700 disabled:opacity-50">
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Registrar {tipo}
        </button>
      </form>
    </Modal>
  )
}

// ─── Cierre / arqueo ─────────────────────────────────────────────────────────

function etiquetaDenominacion(d: number) {
  return d >= 10 ? `S/ ${d}` : d >= 1 ? `S/ ${d}` : `${Math.round(d * 100)} cént.`
}

function ModalCierre({ onCerrar }: { onCerrar: () => void }) {
  const { sesion, arqueo, denominaciones, cerrar } = useCajaStore()
  const [porBilletes, setPorBilletes] = useState(true)
  const [conteo, setConteo] = useState<Record<string, string>>({})
  const [totalManual, setTotalManual] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [cerrada, setCerrada] = useState<CajaSesion | null>(null)

  // (la sesión se vacía al cerrar: el resultado se muestra con lo que devolvió el servidor)
  const totalConteo = Math.round(denominaciones.reduce((a, d) => a + (parseInt(conteo[d] ?? '') || 0) * d, 0) * 100) / 100
  const contado = porBilletes ? totalConteo : parseFloat(totalManual) || 0
  const hayDato = porBilletes ? Object.values(conteo).some((v) => v !== '') : totalManual !== ''
  const diferencia = arqueo ? Math.round((contado - arqueo.efectivoEsperado) * 100) / 100 : 0

  const confirmar = async () => {
    setEnviando(true); setError('')
    try {
      const conteoNum = porBilletes
        ? Object.fromEntries(Object.entries(conteo).map(([k, v]) => [k, parseInt(v) || 0]).filter(([, n]) => (n as number) > 0))
        : undefined
      const r = await cerrar({ efectivoContado: contado, conteo: conteoNum, observaciones })
      setCerrada(r)
      imprimirCierre(r.id).catch((e) => useToastStore.getState().agregar({ tipo: 'error', titulo: 'No se pudo imprimir', mensaje: e instanceof Error ? e.message : 'Error de impresión', duracion: 6000 }))
    } catch (err) {
      setError(errorDe(err)); setEnviando(false)
    }
  }

  if (cerrada) {
    const d = cerrada.diferencia ?? 0
    return (
      <Modal titulo="Caja cerrada" onCerrar={onCerrar} ancho="max-w-sm">
        <div className="p-6 text-center space-y-4">
          <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${d === 0 ? 'bg-green-600' : 'bg-rojo-500'}`}>
            {d === 0 ? <Check size={32} className="text-white" /> : <AlertTriangle size={30} className="text-white" />}
          </div>
          <p className="text-lg font-bold text-gray-800">
            {d === 0 ? 'La caja cuadra' : d > 0 ? `Sobrante de ${soles(d)}` : `Faltante de ${soles(-d)}`}
          </p>
          <p className="text-sm text-gray-500">Esperado {soles(cerrada.efectivoEsperado)} · Contado {soles(cerrada.efectivoContado)}</p>
          <div className="flex gap-3">
            <button onClick={() => imprimirCierre(cerrada.id).catch((e) => useToastStore.getState().agregar({ tipo: 'error', titulo: 'No se pudo imprimir', mensaje: e instanceof Error ? e.message : 'Error de impresión', duracion: 6000 }))}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              <Printer size={15} /> Imprimir
            </button>
            <button onClick={onCerrar} className="flex-1 py-2.5 bg-gold-600 text-white rounded-xl text-sm font-bold hover:bg-gold-700">Listo</button>
          </div>
        </div>
      </Modal>
    )
  }

  if (!sesion || !arqueo) return null

  return (
    <Modal titulo="Cierre de caja — arqueo" onCerrar={onCerrar} ancho="max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Izquierda: lo que debería haber */}
        <div className="p-6 space-y-4 md:border-r border-gray-100">
          <p className="text-xs text-gray-400">Abierta {hora(sesion.abiertaEn)} por {sesion.abiertaPor}</p>
          {arqueo.pedidosSinCobrar > 0 && (
            <p className="text-sm font-semibold bg-rojo-500 text-white rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertTriangle size={15} /> Hay {arqueo.pedidosSinCobrar} pedido(s) sin cobrar
            </p>
          )}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500"><span>Fondo inicial</span><span>{soles(sesion.montoInicial)}</span></div>
            <div className="flex justify-between text-gray-500"><span>+ Cobros en efectivo</span><span>{soles(arqueo.efectivoCobrado)}</span></div>
            <div className="flex justify-between text-gray-500"><span>+ Ingresos</span><span>{soles(arqueo.ingresos)}</span></div>
            <div className="flex justify-between text-gray-500"><span>− Retiros</span><span>{soles(arqueo.retiros)}</span></div>
            <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-gray-200">
              <span>Efectivo esperado</span><span>{soles(arqueo.efectivoEsperado)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-400">Ventas netas</p><p className="font-bold text-gray-800">{soles(arqueo.ventasNetas)}</p></div>
            <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-400">Pedidos</p><p className="font-bold text-gray-800">{arqueo.pedidos}</p></div>
            <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-400">Tarjeta</p><p className="font-bold text-gray-800">{soles(arqueo.tarjeta)}</p></div>
            <div className="rounded-lg border border-gray-100 p-3"><p className="text-xs text-gray-400">Yape / Plin</p><p className="font-bold text-gray-800">{soles(arqueo.yapePlin)}</p></div>
          </div>
          {arqueo.movimientos.length > 0 && (
            <div className="text-xs space-y-1">
              <p className="font-semibold text-gray-500">Movimientos</p>
              {arqueo.movimientos.map((m) => (
                <div key={m.id} className="flex justify-between text-gray-500">
                  <span>{hora(m.creadoEn)} · {m.tipo === 'ingreso' ? '+' : '−'} {m.concepto}</span><span>{soles(m.monto)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Derecha: lo que se cuenta */}
        <div className="p-6 space-y-4">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            {([[true, 'Contar billetes'], [false, 'Total directo']] as const).map(([v, label]) => (
              <button key={label} onClick={() => setPorBilletes(v)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${porBilletes === v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'}`}>
                {label}
              </button>
            ))}
          </div>

          {porBilletes ? (
            <div className="grid grid-cols-2 gap-2">
              {denominaciones.map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm">
                  <span className="w-16 text-right text-gray-500 shrink-0">{etiquetaDenominacion(d)}</span>
                  <span className="text-gray-300">×</span>
                  <input type="number" min={0} step={1} inputMode="numeric" value={conteo[d] ?? ''}
                    onChange={(e) => setConteo((c) => ({ ...c, [d]: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-gold-500" />
                </label>
              ))}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Efectivo contado (S/)</label>
              <input type="number" min={0} step={0.1} value={totalManual} onChange={(e) => setTotalManual(e.target.value)} className={inputCls} />
            </div>
          )}

          <div className={`rounded-xl p-4 ${!hayDato ? 'bg-gray-100' : diferencia === 0 ? 'bg-green-600' : 'bg-rojo-500'}`}>
            <div className={`flex justify-between text-sm ${hayDato ? 'text-white/80' : 'text-gray-500'}`}><span>Contado</span><span>{soles(contado)}</span></div>
            <div className={`flex justify-between text-lg font-bold ${hayDato ? 'text-white' : 'text-gray-400'}`}>
              <span>{!hayDato ? 'Diferencia' : diferencia === 0 ? 'Cuadra' : diferencia > 0 ? 'Sobrante' : 'Faltante'}</span>
              <span>{soles(Math.abs(diferencia))}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Observaciones {hayDato && diferencia !== 0 && <span className="text-red-500">(obligatorio si hay diferencia)</span>}
            </label>
            <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
              placeholder="ej. Se dio vuelto de más a la mesa 4" className={`${inputCls} resize-none`} />
          </div>

          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

          <button onClick={confirmar} disabled={!hayDato || enviando || (diferencia !== 0 && !observaciones.trim())}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gold-600 text-white rounded-xl font-bold hover:bg-gold-700 disabled:opacity-50">
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />} Cerrar caja
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Historial de cierres ────────────────────────────────────────────────────

function ModalHistorial({ onCerrar }: { onCerrar: () => void }) {
  const [sesiones, setSesiones] = useState<CajaSesion[] | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    apiFetch<CajaSesion[]>('/api/caja/historial?limite=30').then(setSesiones).catch((e) => setError(errorDe(e)))
  }, [])

  return (
    <Modal titulo="Cierres de caja anteriores" onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="p-4">
        {error && <p className="text-sm text-red-500 p-2">{error}</p>}
        {!sesiones && !error && <div className="flex justify-center py-10 text-gray-300"><Loader2 className="animate-spin" /></div>}
        {sesiones?.length === 0 && <p className="text-sm text-gray-400 text-center py-10">Todavía no hay cierres</p>}
        <div className="divide-y divide-gray-100">
          {sesiones?.map((s) => {
            const d = s.diferencia ?? 0
            return (
              <div key={s.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">
                    {s.cerradaEn ? new Date(s.cerradaEn).toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'short' }) : ''}
                    <span className="font-normal text-gray-400"> · {hora(s.abiertaEn)}–{s.cerradaEn ? hora(s.cerradaEn) : ''}</span>
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {s.pedidos} pedidos · ventas {soles(s.ventasNetas)} · cerró {s.cerradaPor ?? '—'}
                    {s.observaciones ? ` · ${s.observaciones}` : ''}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${d === 0 ? 'bg-green-600 text-white' : 'bg-rojo-500 text-white'}`}>
                  {d === 0 ? 'Cuadra' : `${d > 0 ? '+' : '−'}${soles(Math.abs(d))}`}
                </span>
                <button onClick={() => imprimirCierre(s.id).catch((e) => useToastStore.getState().agregar({ tipo: 'error', titulo: 'No se pudo imprimir', mensaje: e instanceof Error ? e.message : 'Error de impresión', duracion: 6000 }))} title="Reimprimir" className="p-2 rounded-lg text-gray-400 hover:bg-gray-100">
                  <Printer size={16} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

// ─── Barra de estado de la caja (va arriba de la página de Caja) ────────────

export default function PanelCaja() {
  const { sesion, arqueo, cargado, cargar } = useCajaStore()
  const [modal, setModal] = useState<'abrir' | 'movimiento' | 'cerrar' | 'historial' | null>(null)

  useEffect(() => {
    cargar().catch((e) => console.error('[caja] Error cargando sesión:', e))
    // Cobros o movimientos hechos desde otra pantalla actualizan el arqueo aquí
    const refrescar = () => { cargar().catch(() => {}) }
    socket.on('caja:actualizada', refrescar)
    socket.on('comanda:actualizada', refrescar)
    return () => { socket.off('caja:actualizada', refrescar); socket.off('comanda:actualizada', refrescar) }
  }, [cargar])

  if (!cargado) return null

  return (
    <>
      {sesion && arqueo ? (
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-green-600 text-white">
            <Unlock size={12} /> Caja abierta
          </span>
          <span className="text-sm text-gray-600">
            desde {hora(sesion.abiertaEn)} · {sesion.abiertaPor} · fondo {soles(sesion.montoInicial)}
          </span>
          <span className="text-sm font-semibold text-gray-800">Efectivo esperado: {soles(arqueo.efectivoEsperado)}</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={() => setModal('historial')} title="Cierres anteriores"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              <History size={15} />
            </button>
            <button onClick={() => setModal('movimiento')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <ArrowUpCircle size={15} /> Ingreso / retiro
            </button>
            <button onClick={() => setModal('cerrar')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-semibold hover:bg-gray-900">
              <Lock size={15} /> Cerrar caja
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-rojo-500 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3">
          <Lock size={18} className="text-white" />
          <span className="text-sm font-semibold text-white flex-1">Caja cerrada — ábrela para poder cobrar</span>
          <button onClick={() => setModal('historial')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/15 text-white text-sm hover:bg-white/25">
            <History size={15} /> Cierres anteriores
          </button>
          <button onClick={() => setModal('abrir')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-rojo-700 text-sm font-bold hover:bg-gray-100">
            <Unlock size={15} /> Abrir caja
          </button>
        </div>
      )}

      {modal === 'abrir' && <ModalAbrir onCerrar={() => setModal(null)} />}
      {modal === 'movimiento' && <ModalMovimiento onCerrar={() => setModal(null)} />}
      {modal === 'cerrar' && <ModalCierre onCerrar={() => setModal(null)} />}
      {modal === 'historial' && <ModalHistorial onCerrar={() => setModal(null)} />}
    </>
  )
}
