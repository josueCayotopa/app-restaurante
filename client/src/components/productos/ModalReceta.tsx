import { useEffect, useState } from 'react'
import { X, Plus, Trash2, Check, Loader2, Copy, AlertTriangle } from 'lucide-react'
import { apiFetch, ApiError } from '../../lib/api'
import { useRecetasStore } from '../../store/recetasStore'
import { useCartaStore } from '../../store/cartaStore'
import type { Producto } from '../../types'

interface InsumoLite { id: string; nombre: string; unidad: string; stockActual: number; precioUnitario: number }
type Fila = { clave: number; insumoId: string; cantidad: string }

const soles = (n: number) => `S/ ${n.toFixed(2)}`
const inputCls = 'border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-gold-500'

// Receta de un producto: qué insumos y cuánto usa UNA unidad vendida.
// Al enviar un pedido se descuentan del inventario automáticamente.
export default function ModalReceta({ producto, onCerrar }: { producto: Producto; onCerrar: () => void }) {
  const { recetas, guardar } = useRecetasStore()
  const productos = useCartaStore((s) => s.productos)
  const [insumos, setInsumos] = useState<InsumoLite[] | null>(null)
  const [filas, setFilas] = useState<Fila[]>(() =>
    (recetas[producto.id]?.lineas ?? []).map((l, i) => ({ clave: i, insumoId: l.insumoId, cantidad: String(l.cantidad) })))
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { apiFetch<InsumoLite[]>('/api/inventario').then(setInsumos).catch(() => setInsumos([])) }, [])

  const insumoDe = (id: string) => insumos?.find((i) => i.id === id)
  const costoFila = (f: Fila) => (parseFloat(f.cantidad) || 0) * (insumoDe(f.insumoId)?.precioUnitario ?? 0)
  const costo = filas.reduce((a, f) => a + costoFila(f), 0)
  const margen = producto.precio > 0 ? ((producto.precio - costo) / producto.precio) * 100 : 0
  const validas = filas.filter((f) => f.insumoId && parseFloat(f.cantidad) > 0)
  const porciones = validas.length
    ? Math.max(0, Math.floor(Math.min(...validas.map((f) => (insumoDe(f.insumoId)?.stockActual ?? 0) / parseFloat(f.cantidad)))))
    : null
  const repetido = new Set(validas.map((f) => f.insumoId)).size !== validas.length

  // Otros productos con receta, para copiarla (ej. "Chicharrón (Fuente)" desde el Personal)
  const conReceta = productos.filter((p) => p.id !== producto.id && recetas[p.id]?.lineas.length)
  const copiarDe = (id: string) => {
    const r = recetas[id]
    if (r) setFilas(r.lineas.map((l, i) => ({ clave: Date.now() + i, insumoId: l.insumoId, cantidad: String(l.cantidad) })))
  }

  const actualizar = (i: number, cambio: Partial<Fila>) => setFilas((fs) => fs.map((f, j) => (j === i ? { ...f, ...cambio } : f)))

  const confirmar = async () => {
    setEnviando(true); setError('')
    try {
      await guardar(producto.id, validas.map((f) => ({ insumoId: f.insumoId, cantidad: parseFloat(f.cantidad) })))
      onCerrar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar: revisa la conexión')
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="font-bold text-gray-800 truncate">Receta — {producto.nombre}</h2>
            <p className="text-xs text-gray-400">Cuánto de cada insumo usa <strong>una</strong> unidad. Se descuenta del inventario al enviar el pedido.</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {insumos === null ? (
            <div className="flex justify-center py-8 text-gray-300"><Loader2 className="animate-spin" /></div>
          ) : insumos.length === 0 ? (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
              Todavía no hay insumos. Créalos primero en <strong>Inventario → Nuevo insumo</strong> (ej. Panceta de cerdo, Yuca, Aceite).
            </p>
          ) : (
            <>
              {conReceta.length > 0 && (
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <Copy size={14} className="text-gray-400" /> Copiar receta de
                  <select defaultValue="" onChange={(e) => { if (e.target.value) copiarDe(e.target.value); e.target.value = '' }} className={`${inputCls} flex-1`}>
                    <option value="">elegir producto…</option>
                    {conReceta.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </label>
              )}

              <div className="space-y-2">
                {filas.map((f, i) => {
                  const ins = insumoDe(f.insumoId)
                  return (
                    <div key={f.clave} className="flex items-center gap-2">
                      <select value={f.insumoId} onChange={(e) => actualizar(i, { insumoId: e.target.value })} className={`${inputCls} flex-1 min-w-0`}>
                        <option value="">Insumo…</option>
                        {insumos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                      </select>
                      <input type="number" min={0} step={0.001} value={f.cantidad} placeholder="0.25"
                        onChange={(e) => actualizar(i, { cantidad: e.target.value })} className={`${inputCls} w-24 text-right`} />
                      <span className="w-12 text-xs text-gray-500">{ins?.unidad ?? ''}</span>
                      <span className="w-20 text-right text-xs text-gray-500">{ins ? soles(costoFila(f)) : ''}</span>
                      <button onClick={() => setFilas((fs) => fs.filter((_, j) => j !== i))} title="Quitar"
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  )
                })}
              </div>
              <button onClick={() => setFilas((fs) => [...fs, { clave: Date.now(), insumoId: '', cantidad: '' }])}
                className="flex items-center gap-1.5 text-sm font-semibold text-gold-700 hover:text-gold-800">
                <Plus size={14} /> Agregar insumo
              </button>
              <p className="text-xs text-gray-400">Ej.: un Chicharrón (Personal) usa 0.25 kg de panceta y 0.15 kg de yuca. Usa la misma unidad del insumo.</p>

              {/* Resumen */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-400">Costo de insumos</p>
                  <p className="text-lg font-bold text-gray-800">{soles(costo)}</p>
                </div>
                <div className={`rounded-xl p-3 ${costo === 0 ? 'bg-gray-50' : margen >= 60 ? 'bg-green-600' : margen >= 40 ? 'bg-gold-500' : 'bg-rojo-500'}`}>
                  <p className={`text-xs ${costo === 0 ? 'text-gray-400' : margen >= 40 && margen < 60 ? 'text-gray-900/70' : 'text-white/80'}`}>Margen (precio {soles(producto.precio)})</p>
                  <p className={`text-lg font-bold ${costo === 0 ? 'text-gray-400' : margen >= 40 && margen < 60 ? 'text-gray-900' : 'text-white'}`}>{costo === 0 ? '—' : `${margen.toFixed(0)}%`}</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-400">Alcanza para</p>
                  <p className={`text-lg font-bold ${porciones === 0 ? 'text-red-500' : 'text-gray-800'}`}>{porciones === null ? '—' : `${porciones} und.`}</p>
                </div>
              </div>
              {costo > 0 && margen < 40 && (
                <p className="text-xs text-rojo-600 flex items-center gap-1.5"><AlertTriangle size={13} /> Margen bajo: revisa el precio o las cantidades.</p>
              )}
            </>
          )}
          {repetido && <p className="text-sm text-red-500">Hay un insumo repetido: júntalo en una sola fila.</p>}
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onCerrar} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={confirmar} disabled={enviando || repetido || insumos === null}
            className="flex-1 py-2.5 bg-gold-600 text-white rounded-xl text-sm font-bold hover:bg-gold-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {enviando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {validas.length === 0 && recetas[producto.id] ? 'Quitar receta' : 'Guardar receta'}
          </button>
        </div>
      </div>
    </div>
  )
}
