import { useEffect, useMemo, useState } from 'react'
import { apiFetch, ApiError } from '../../lib/api'
import { useCartaStore } from '../../store/cartaStore'
import { useRecetasStore } from '../../store/recetasStore'
import { useToastStore } from '../../store/toastStore'
import { X, Loader2, Link2, Wand2, AlertTriangle } from 'lucide-react'

interface InsumoLite { id: string; nombre: string; unidad: string; stockActual: number; categoria: string }

// "Coca Cola (1 1/2 Litros)" y "coca 1.5ml" → "coca|1.5": misma marca y tamaño = mismo artículo
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const MARCAS = ['coca', 'inca', 'fanta', 'sprite', 'agua', 'sporade', 'pilsen', 'pilcen', 'cusquena', 'cristal', 'guarana', 'concordia']
function clave(nombre: string): string {
  const n = sinTildes(nombre)
  let marca = MARCAS.find((m) => n.includes(m)) ?? n.split(/\W+/)[0]
  if (marca === 'pilcen') marca = 'pilsen'
  let tam = ''
  if (/personal|296/.test(n)) tam = 'personal'
  else if (/gordita|625/.test(n)) tam = 'gordita'
  else if (/1\s*1\/2|1[.,]5/.test(n)) tam = '1.5'
  else if (/750/.test(n)) tam = '750'
  else if (/500/.test(n)) tam = '500'
  else if (/(^|\D)2\s*(l|lt|litro)/.test(n)) tam = '2'
  else if (/(^|\D)1\s*(l|lt|litro)/.test(n)) tam = '1'
  return `${marca}|${tam}`
}

// Cada insumo se vende como UN producto: al venderse 1, sale 1 unidad del insumo.
// Para platos con varios insumos está la receta en Productos.
export default function ModalVincular({ insumos, onCerrar, onListo }: { insumos: InsumoLite[]; onCerrar: () => void; onListo: () => void }) {
  const productos = useCartaStore((s) => s.productos)
  const { recetas, cargar, guardar } = useRecetasStore()
  const [eleccion, setEleccion] = useState<Record<string, string>>({})   // insumoId → productoId ('' = ninguno)
  const [aplicarPasadas, setAplicarPasadas] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { cargar().catch(() => {}) }, [cargar])

  // Producto ya vinculado a cada insumo (receta de una sola línea de ese insumo)
  const actual = useMemo(() => {
    const m: Record<string, string> = {}
    for (const [productoId, r] of Object.entries(recetas)) {
      if (r.lineas.length === 1) m[r.lineas[0].insumoId] = productoId
    }
    return m
  }, [recetas])

  useEffect(() => { setEleccion(actual) }, [actual])

  const ordenados = useMemo(() => [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre)), [productos])
  const valor = (insumoId: string) => eleccion[insumoId] ?? ''
  // Productos elegidos por más de un insumo (p. ej. un insumo duplicado)
  const repetidos = new Set(Object.values(eleccion).filter((p, i, arr) => p && arr.indexOf(p) !== i))

  const sugerir = () => {
    const usados = new Set(Object.values(eleccion).filter(Boolean))
    const nueva = { ...eleccion }
    for (const ins of insumos) {
      if (nueva[ins.id]) continue
      const k = clave(ins.nombre)
      // Igual marca y tamaño; si el insumo no dice tamaño y hay un solo producto de esa marca, ese
      const marca = k.split('|')[0]
      const deLaMarca = productos.filter((p) => clave(p.nombre).split('|')[0] === marca)
      const candidato = productos.find((p) => clave(p.nombre) === k && !usados.has(p.id))
        ?? (k.endsWith('|') && deLaMarca.length === 1 && !usados.has(deLaMarca[0].id) ? deLaMarca[0] : undefined)
      if (candidato) { nueva[ins.id] = candidato.id; usados.add(candidato.id) }
    }
    setEleccion(nueva)
  }

  const guardarTodo = async () => {
    if (repetidos.size) { setError('Un mismo producto está elegido en dos insumos: corrígelo antes de guardar'); return }
    setGuardando(true); setError('')
    try {
      for (const ins of insumos) {
        const antes = actual[ins.id] ?? ''
        const ahora = valor(ins.id)
        if (antes === ahora) continue
        if (antes) await guardar(antes, [])                                   // ya no se vende como ese producto
        if (ahora) await guardar(ahora, [{ insumoId: ins.id, cantidad: 1 }])  // 1 vendido = 1 unidad del insumo
      }
      let mensaje = 'Las próximas ventas descontarán del almacén'
      if (aplicarPasadas) {
        const r = await apiFetch<{ items: number; movimientos: number }>('/api/recetas/aplicar-ventas', { method: 'POST', body: '{}' })
        mensaje = r.items ? `Se registraron ${r.items} venta(s) pasadas en los movimientos` : 'No había ventas pasadas por registrar'
      }
      useToastStore.getState().agregar({ tipo: 'success', titulo: 'Vínculos guardados', mensaje, duracion: 6000 })
      onListo()
      onCerrar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar: revisa la conexión')
    } finally {
      setGuardando(false)
    }
  }

  const nombres = insumos.map((i) => sinTildes(i.nombre.trim()))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-800 flex items-center gap-2"><Link2 size={17} /> Vincular insumos con lo que se vende</h2>
            <p className="text-xs text-gray-400">Al vender 1 producto se descuenta 1 unidad de su insumo. Los platos con varios insumos se arman en Productos → Receta.</p>
          </div>
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        <div className="px-6 pt-4">
          <button onClick={sugerir} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gold-500 text-gray-900 text-sm font-semibold hover:bg-gold-600">
            <Wand2 size={15} /> Sugerir por nombre y tamaño
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-gray-100">
          {insumos.map((ins, i) => {
            const duplicado = nombres.indexOf(sinTildes(ins.nombre.trim())) !== i
            const v = valor(ins.id)
            return (
              <div key={ins.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="sm:w-60 shrink-0">
                  <p className="text-sm font-semibold text-gray-800">{ins.nombre}</p>
                  <p className="text-xs text-gray-400">Stock {ins.stockActual} {ins.unidad}</p>
                  {duplicado && <p className="text-[11px] text-rojo-600 font-semibold flex items-center gap-1"><AlertTriangle size={11} /> Insumo repetido: conviene juntarlo con el otro</p>}
                </div>
                <select value={v} onChange={(e) => setEleccion({ ...eleccion, [ins.id]: e.target.value })}
                  className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold-500 ${repetidos.has(v) ? 'border-red-400 bg-red-50' : v ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                  <option value="">— No se vende directamente —</option>
                  {ordenados.map((p) => <option key={p.id} value={p.id}>{p.nombre} · S/ {p.precio.toFixed(2)}</option>)}
                </select>
              </div>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 space-y-3">
          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={aplicarPasadas} onChange={(e) => setAplicarPasadas(e.target.checked)} className="mt-0.5 w-4 h-4 accent-gold-600" />
            <span>Registrar también las <b>ventas ya hechas</b> desde que se creó cada insumo (conteo inicial). No repite las que ya estén registradas.</span>
          </label>
          {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onCerrar} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button onClick={guardarTodo} disabled={guardando}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gold-600 text-white rounded-xl text-sm font-bold hover:bg-gold-700 disabled:opacity-50">
              {guardando && <Loader2 size={15} className="animate-spin" />} Guardar vínculos
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
