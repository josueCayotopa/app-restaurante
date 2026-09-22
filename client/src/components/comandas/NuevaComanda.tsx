import { useState, useMemo, useEffect } from 'react'
import { useCartaStore } from '../../store/cartaStore'
import { urlArchivo } from '../../lib/api'
import { imprimirTicketComanda } from '../../lib/ticket'
import { useComandasStore } from '../../store/comandasStore'
import { useMesasStore } from '../../store/mesasStore'
import { useToastStore } from '../../store/toastStore'
import { useTurnoStore } from '../../store/turnoStore'
import type {
  Producto, CategoriaProducto, ItemComanda,
  AreaProduccion, TipoPlato, Comanda, TipoDescuento,
} from '../../types'
import { MAX_GUARNICIONES } from '../../types'
import {
  X, Search, Plus, Minus, Trash2, Send, ChefHat, StickyNote,
  UtensilsCrossed, RotateCcw, Tag, FileText, WifiOff, AlertTriangle,
} from 'lucide-react'

// ── Constantes ───────────────────────────────────────────────────────────────

const AREA_POR_CATEGORIA: Record<CategoriaProducto, AreaProduccion> = {
  entradas: 'cocina',
  fondos:   'cocina',
  postres:  'cocina',
  extras:   'cocina',
  bebidas:  'bar',
  cocteles: 'bar',
}

const CATEGORIAS: { valor: CategoriaProducto; label: string; emoji: string }[] = [
  { valor: 'entradas', label: 'Entradas', emoji: '🥗' },
  { valor: 'fondos',   label: 'Fondos',   emoji: '🍽️' },
  { valor: 'bebidas',  label: 'Bebidas',  emoji: '🥤' },
  { valor: 'cocteles', label: 'Bar',      emoji: '🍺' },
  { valor: 'postres',  label: 'Postres',  emoji: '🍮' },
  { valor: 'extras',   label: 'Extras',   emoji: '🍟' },
]

const DESCUENTOS: { valor: TipoDescuento; label: string; porcentaje: number; emoji: string }[] = [
  { valor: 'pnp',        label: 'PNP',          porcentaje: 10, emoji: '👮' },
  { valor: 'cumpleaño',  label: 'Cumpleañero',   porcentaje: 50, emoji: '🎂' },
  { valor: 'clases2026', label: 'Clases 2026',   porcentaje: 10, emoji: '🎓' },
]

// ── Tipos locales ────────────────────────────────────────────────────────────

interface ItemPedido {
  key: string
  producto: Producto
  cantidad: number
  nota: string
  tipoPlato?: TipoPlato
  guarniciones?: string[]
}

// ── Modal de guarniciones ────────────────────────────────────────────────────

function ModalGuarnicion({
  producto,
  onConfirmar,
  onCancelar,
}: {
  producto: Producto
  onConfirmar: (tipoPlato: TipoPlato, guarniciones: string[]) => void
  onCancelar: () => void
}) {
  const [tipoPlato, setTipoPlato] = useState<TipoPlato>('plato')
  const [seleccionadas, setSeleccionadas] = useState<string[]>([])
  const maxGuarniciones = MAX_GUARNICIONES[tipoPlato]
  const guarniciones = producto.guarnicionesDisponibles ?? []

  useEffect(() => {
    setSeleccionadas((prev) => prev.slice(0, MAX_GUARNICIONES[tipoPlato]))
  }, [tipoPlato])

  const toggleGuarnicion = (g: string) => {
    setSeleccionadas((prev) => {
      if (prev.includes(g)) return prev.filter((x) => x !== g)
      if (prev.length >= maxGuarniciones) return prev
      return [...prev, g]
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancelar} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <UtensilsCrossed size={16} className="text-steel-500 shrink-0" />
          <h3 className="text-base font-bold text-gray-800 truncate">{producto.nombre}</h3>
        </div>
        <p className="text-xs text-gray-400 mb-4">Selecciona tipo de plato y guarniciones</p>

        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tipo de plato</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(['plato', 'fuente'] as TipoPlato[]).map((tipo) => (
            <button
              key={tipo}
              onClick={() => setTipoPlato(tipo)}
              className={`py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                tipoPlato === tipo
                  ? 'border-steel-500 bg-steel-50 text-steel-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {tipo === 'plato' ? '🍽 Plato' : '🥘 Fuente'}
              <span className="block text-xs font-normal opacity-70 mt-0.5">
                hasta {MAX_GUARNICIONES[tipo]} guarniciones
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Guarniciones</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            seleccionadas.length === maxGuarniciones ? 'bg-green-100 text-green-700' : 'bg-steel-50 text-steel-600'
          }`}>
            {seleccionadas.length}/{maxGuarniciones}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 mb-5">
          {guarniciones.map((g) => {
            const sel = seleccionadas.includes(g)
            const dis = !sel && seleccionadas.length >= maxGuarniciones
            return (
              <button
                key={g}
                onClick={() => toggleGuarnicion(g)}
                disabled={dis}
                className={`py-2 px-3 rounded-lg border text-xs text-left transition-all ${
                  sel  ? 'border-gold-400 bg-gold-50 text-gray-800 font-semibold'
                  : dis ? 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed'
                       : 'border-gray-200 text-gray-600 hover:border-gold-300 hover:bg-gold-50'
                }`}
              >
                {sel && <span className="text-gold-600 mr-1">✓</span>}{g}
              </button>
            )
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={onCancelar} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => onConfirmar(tipoPlato, seleccionadas)}
            className="flex-1 py-2.5 bg-steel-500 text-white rounded-xl text-sm font-bold hover:bg-steel-600 transition-colors"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal confirmación devolución ────────────────────────────────────────────

function ModalDevolucion({
  item,
  onConfirmar,
  onCancelar,
}: {
  item: ItemComanda
  onConfirmar: () => void
  onCancelar: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancelar} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-rojo-50 flex items-center justify-center">
            <RotateCcw size={26} className="text-rojo-600" />
          </div>
          <h3 className="font-bold text-gray-800">Confirmar devolución</h3>
          <p className="text-sm text-gray-500">
            <strong className="text-gray-700">{item.cantidad}× {item.nombre}</strong> ya está{' '}
            <span className="font-semibold text-rojo-600">
              {item.estado === 'en_preparacion' ? 'en preparación' : 'servido'}
            </span>
            . Se notificará a {item.area === 'cocina' ? 'cocina' : 'bar'}.
          </p>
          <div className="flex gap-3 w-full pt-2">
            <button onClick={onCancelar} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={onConfirmar} className="flex-1 py-2.5 bg-rojo-600 text-white rounded-xl text-sm font-bold hover:bg-rojo-700 transition-colors">
              Confirmar devolución
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de producto ──────────────────────────────────────────────────────

function ProductoCard({
  producto, cantidad, onAgregar, onQuitar,
}: {
  producto: Producto
  cantidad: number
  onAgregar: () => void
  onQuitar: () => void
}) {
  return (
    <div className={`bg-white border rounded-xl p-3 flex items-center gap-3 transition-all ${
      cantidad > 0 ? 'border-steel-300 shadow-sm' : 'border-gray-100'
    } ${!producto.disponible ? 'opacity-50 pointer-events-none' : ''}`}>
      {producto.imagen && (
        <img
          src={urlArchivo(producto.imagen)}
          alt=""
          className="w-11 h-11 rounded-lg object-cover shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{producto.nombre}</p>
        {producto.descripcion && (
          <p className="text-xs text-gray-400 truncate">{producto.descripcion}</p>
        )}
        <p className="text-sm font-bold text-steel-600 mt-0.5">S/ {producto.precio.toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {cantidad > 0 ? (
          <>
            <button onClick={onQuitar} className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
              <Minus size={13} />
            </button>
            <span className="w-6 text-center font-bold text-steel-700 text-sm">{cantidad}</span>
            <button onClick={onAgregar} className="w-7 h-7 rounded-full bg-steel-500 text-white flex items-center justify-center hover:bg-steel-600 transition-colors">
              <Plus size={13} />
            </button>
          </>
        ) : (
          <button onClick={onAgregar} className="w-8 h-8 rounded-full bg-steel-50 text-steel-600 border border-steel-200 flex items-center justify-center hover:bg-steel-500 hover:text-white hover:border-steel-500 transition-all">
            <Plus size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Props ────────────────────────────────────────────────────────────────────

interface NuevaComandaProps {
  mesaId: string
  numeroMesa: number
  mesasUnidas?: number[]
  onCerrar: () => void
  comandaExistente?: Comanda   // si se provee → modo "agregar ítems"
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function NuevaComanda({
  mesaId, numeroMesa, mesasUnidas = [], onCerrar, comandaExistente,
}: NuevaComandaProps) {
  const productos          = useCartaStore((s) => s.productos)
  const agregarComanda     = useComandasStore((s) => s.agregarComanda)
  const agregarItemsA      = useComandasStore((s) => s.agregarItemsAComanda)
  const devolverItem       = useComandasStore((s) => s.devolverItem)
  const cambiarEstado      = useMesasStore((s) => s.cambiarEstado)
  const agregarToast       = useToastStore((s) => s.agregar)
  const turno              = useTurnoStore()

  const modoAgregar = !!comandaExistente

  const [busqueda, setBusqueda]           = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<CategoriaProducto | 'todas'>('fondos')
  const [pedido, setPedido]               = useState<Map<string, ItemPedido>>(new Map())
  const [notaActiva, setNotaActiva]       = useState<string | null>(null)
  const [notaGeneral, setNotaGeneral]     = useState(comandaExistente?.notaGeneral ?? '')
  const [mozo, setMozo]                  = useState(
    modoAgregar ? (comandaExistente?.mozo ?? 'Carlos') : (turno.mozosEnTurno[0] ?? 'Carlos')
  )
  const [tipoDescuento, setTipoDescuento] = useState<TipoDescuento | undefined>(
    comandaExistente?.tipoDescuento
  )
  const [mobileTab, setMobileTab]         = useState<'carta' | 'pedido'>('carta')
  const [modalGuarnicion, setModalGuarnicion] = useState<Producto | null>(null)
  const [modalDevolucion, setModalDevolucion] = useState<ItemComanda | null>(null)
  const [enviando, setEnviando]           = useState(false)

  const online = navigator.onLine
  const sinTurno = !turno.activo && !modoAgregar

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchCategoria = categoriaActiva === 'todas' || p.categoria === categoriaActiva
      const matchBusqueda  = busqueda === '' || p.nombre.toLowerCase().includes(busqueda.toLowerCase())
      return matchCategoria && matchBusqueda
    })
  }, [productos, categoriaActiva, busqueda])

  const itemsPedido = Array.from(pedido.values())
  const totalItems  = itemsPedido.reduce((acc, i) => acc + i.cantidad, 0)
  const totalPrecio = itemsPedido.reduce((acc, i) => acc + i.cantidad * i.producto.precio, 0)

  const descuentoPct  = DESCUENTOS.find((d) => d.valor === tipoDescuento)?.porcentaje ?? 0
  const totalConDcto  = totalPrecio * (1 - descuentoPct / 100)

  const cantidadProducto = (productoId: string) =>
    Array.from(pedido.values())
      .filter((i) => i.producto.id === productoId)
      .reduce((sum, i) => sum + i.cantidad, 0)

  const agregarProducto = (producto: Producto) => {
    if (producto.tieneGuarnicion) { setModalGuarnicion(producto); return }
    setPedido((prev) => {
      const next   = new Map(prev)
      const actual = next.get(producto.id)
      if (actual) next.set(producto.id, { ...actual, cantidad: actual.cantidad + 1 })
      else         next.set(producto.id, { key: producto.id, producto, cantidad: 1, nota: '' })
      return next
    })
  }

  const confirmarGuarnicion = (tipoPlato: TipoPlato, guarniciones: string[]) => {
    if (!modalGuarnicion) return
    const key = `${modalGuarnicion.id}_${Date.now()}`
    setPedido((prev) => {
      const next = new Map(prev)
      next.set(key, { key, producto: modalGuarnicion, cantidad: 1, nota: '', tipoPlato, guarniciones })
      return next
    })
    setModalGuarnicion(null)
  }

  const quitarProducto = (productoId: string) => {
    setPedido((prev) => {
      const next    = new Map(prev)
      const entries = [...next.entries()].filter(([k]) => k === productoId || k.startsWith(productoId + '_'))
      if (entries.length === 0) return next
      const [lastKey, lastEntry] = entries[entries.length - 1]
      if (lastEntry.cantidad > 1) next.set(lastKey, { ...lastEntry, cantidad: lastEntry.cantidad - 1 })
      else { next.delete(lastKey); if (notaActiva === lastKey) setNotaActiva(null) }
      return next
    })
  }

  const quitarItemKey = (key: string) => {
    setPedido((prev) => {
      const next   = new Map(prev)
      const actual = next.get(key)
      if (actual && actual.cantidad > 1) next.set(key, { ...actual, cantidad: actual.cantidad - 1 })
      else { next.delete(key); if (notaActiva === key) setNotaActiva(null) }
      return next
    })
  }

  const actualizarNota = (key: string, nota: string) => {
    setPedido((prev) => {
      const next = new Map(prev)
      const item  = next.get(key)
      if (item) next.set(key, { ...item, nota })
      return next
    })
  }

  // ── Devolución ──────────────────────────────────────────────

  const solicitarDevolucion = (item: ItemComanda) => {
    if (item.estado === 'pendiente' || item.estado === 'cancelado' || item.estado === 'devuelto') return
    if (item.estado === 'en_preparacion' || item.estado === 'servido' || item.estado === 'listo') {
      setModalDevolucion(item)
    }
  }

  const confirmarDevolucion = () => {
    if (!modalDevolucion || !comandaExistente) return
    const area = devolverItem(comandaExistente.id, modalDevolucion.id)
    const mesa = `Mesa ${numeroMesa}`
    if (area === 'cocina') {
      agregarToast({ tipo: 'cocina', titulo: `↩ Devolución — ${mesa}`, mensaje: `${modalDevolucion.cantidad}× ${modalDevolucion.nombre} ha sido devuelto`, duracion: 6000 })
    } else if (area === 'bar') {
      agregarToast({ tipo: 'bar', titulo: `↩ Devolución — ${mesa}`, mensaje: `${modalDevolucion.cantidad}× ${modalDevolucion.nombre} ha sido devuelto`, duracion: 6000 })
    }
    setModalDevolucion(null)
  }

  // ── Enviar ───────────────────────────────────────────────────

  const enviar = async () => {
    if (pedido.size === 0 || enviando) return
    if (!online) { agregarToast({ tipo: 'error', titulo: 'Sin conexión', mensaje: 'Verifica la conexión de red antes de enviar', duracion: 4000 }); return }
    if (sinTurno) return

    setEnviando(true)
    try {
      const items: ItemComanda[] = itemsPedido.map((item, idx) => ({
        id: `i${Date.now()}_${idx}`,
        productoId: item.producto.id,
        nombre: item.producto.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.producto.precio,
        nota: item.nota || undefined,
        estado: 'pendiente',
        area: AREA_POR_CATEGORIA[item.producto.categoria],
        tipoPlato: item.tipoPlato,
        guarniciones: item.guarniciones?.length ? item.guarniciones : undefined,
      }))

      const mesa = `Mesa ${numeroMesa}${mesasUnidas.length > 0 ? '+' + mesasUnidas.join('+') : ''}`

      if (modoAgregar && comandaExistente) {
        await agregarItemsA(comandaExistente.id, items)
        const itemsCocina = items.filter((i) => i.area === 'cocina')
        const itemsBar    = items.filter((i) => i.area === 'bar')
        if (itemsCocina.length > 0) {
          agregarToast({
            tipo: 'cocina', titulo: `🍽 Adición — ${mesa}`,
            mensaje: itemsCocina.map((i) => {
              let d = `${i.cantidad}× ${i.nombre}`
              if (i.tipoPlato) d += ` [${i.tipoPlato === 'plato' ? 'Plato' : 'Fuente'}]`
              if (i.guarniciones?.length) d += `: ${i.guarniciones.join(', ')}`
              return d
            }).join(' · '),
            duracion: 5000,
          })
        }
        if (itemsBar.length > 0) {
          agregarToast({ tipo: 'bar', titulo: `🍺 Adición — ${mesa}`, mensaje: itemsBar.map((i) => `${i.cantidad}× ${i.nombre}`).join(' · '), duracion: 5000 })
        }
        if (itemsCocina.length > 0) imprimirTicketComanda(comandaExistente, itemsCocina, 'cocina')
        if (itemsBar.length > 0) imprimirTicketComanda(comandaExistente, itemsBar, 'bar')
      } else {
        const comanda: Comanda = {
          id: `c${Date.now()}`,
          mesaId,
          numeroMesa,
          mesasUnidas: mesasUnidas.length > 0 ? mesasUnidas : undefined,
          estado: 'enviada_cocina',
          items,
          mozo,
          creadaEn: new Date().toISOString(),
          actualizadaEn: new Date().toISOString(),
          total: totalConDcto,
          tipoDescuento,
          notaGeneral: notaGeneral.trim() || undefined,
        }
        await agregarComanda(comanda)
        cambiarEstado(mesaId, 'ocupada')

        const itemsCocina = items.filter((i) => i.area === 'cocina')
        const itemsBar    = items.filter((i) => i.area === 'bar')
        if (itemsCocina.length > 0) {
          agregarToast({
            tipo: 'cocina', titulo: `🍽 Ticket enviado — ${mesa}`,
            mensaje: itemsCocina.map((i) => {
              let d = `${i.cantidad}× ${i.nombre}`
              if (i.tipoPlato) d += ` [${i.tipoPlato === 'plato' ? 'Plato' : 'Fuente'}]`
              if (i.guarniciones?.length) d += `: ${i.guarniciones.join(', ')}`
              return d
            }).join(' · '),
            duracion: 5000,
          })
        }
        if (itemsBar.length > 0) {
          agregarToast({ tipo: 'bar', titulo: `🍺 Ticket enviado — ${mesa}`, mensaje: itemsBar.map((i) => `${i.cantidad}× ${i.nombre}`).join(' · '), duracion: 5000 })
        }
        if (itemsCocina.length > 0) imprimirTicketComanda(comanda, itemsCocina, 'cocina')
        if (itemsBar.length > 0) imprimirTicketComanda(comanda, itemsBar, 'bar')
      }

      onCerrar()
    } catch (err) {
      agregarToast({
        tipo: 'error',
        titulo: 'Error al enviar',
        mensaje: err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.',
        duracion: 5000,
      })
    } finally {
      setEnviando(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────

  const itemsExistentes = comandaExistente?.items.filter(
    (i) => i.estado !== 'cancelado' && i.estado !== 'devuelto'
  ) ?? []

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40" onClick={onCerrar} />

      <div className="relative ml-auto flex h-full w-full max-w-4xl bg-gray-50 shadow-2xl flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-4 shrink-0">
          <button onClick={onCerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-gray-800 text-sm">
              {modoAgregar ? 'Agregar ítems' : 'Nueva Comanda'} — Mesa {numeroMesa}
              {mesasUnidas.length > 0 && (
                <span className="text-sky-500 font-medium text-sm ml-1">+{mesasUnidas.join('+')}</span>
              )}
            </h2>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {!modoAgregar && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">Mozo:</span>
                  <select
                    value={mozo}
                    onChange={(e) => setMozo(e.target.value)}
                    className="text-xs text-gray-600 border-none bg-transparent focus:outline-none font-medium"
                  >
                    {(turno.mozosEnTurno.length > 0 ? turno.mozosEnTurno : turno.mozosDisponibles).map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}
              {/* Indicador de descuento (el control vive en la columna de Pedido) */}
              {!modoAgregar && tipoDescuento && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-gold-100 border-gold-300 text-gold-700 font-medium">
                  <Tag size={11} />
                  {DESCUENTOS.find((d) => d.valor === tipoDescuento)?.label} · {descuentoPct}%
                </span>
              )}
              {/* Indicador de nota general (el control vive en la columna de Pedido) */}
              {!modoAgregar && notaGeneral && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-amber-50 border-amber-300 text-amber-700 font-medium">
                  <FileText size={11} />
                  Nota ✓
                </span>
              )}
            </div>
          </div>
          {totalItems > 0 && (
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400">{totalItems} ítem(s)</p>
              <p className="font-bold text-steel-700 text-sm">S/ {totalConDcto.toFixed(2)}</p>
            </div>
          )}
        </div>

        {/* Alertas */}
        {!online && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 shrink-0">
            <WifiOff size={14} className="text-red-500 shrink-0" />
            <p className="text-xs text-red-700 font-medium">Sin conexión — los pedidos no se enviarán</p>
          </div>
        )}
        {sinTurno && (
          <div className="bg-rojo-50 border-b border-rojo-200 px-4 py-2 flex items-center gap-2 shrink-0">
            <AlertTriangle size={14} className="text-rojo-600 shrink-0" />
            <p className="text-xs text-rojo-700 font-medium">No hay turno activo — el administrador debe iniciar el turno</p>
          </div>
        )}

        {/* Tabs mobile */}
        <div className="flex lg:hidden border-b border-gray-200 bg-white shrink-0">
          <button
            onClick={() => setMobileTab('carta')}
            className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors ${mobileTab === 'carta' ? 'border-steel-500 text-steel-700' : 'border-transparent text-gray-400'}`}
          >
            🍽 Carta
          </button>
          <button
            onClick={() => setMobileTab('pedido')}
            className={`flex-1 py-2.5 text-sm font-semibold border-b-2 transition-colors flex items-center justify-center gap-2 ${mobileTab === 'pedido' ? 'border-steel-500 text-steel-700' : 'border-transparent text-gray-400'}`}
          >
            Pedido
            {totalItems > 0 && (
              <span className="bg-steel-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">{totalItems}</span>
            )}
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Columna izquierda: Carta */}
          <div className={`flex-col overflow-hidden flex-1 ${mobileTab === 'pedido' ? 'hidden lg:flex' : 'flex'}`}>
            <div className="px-4 pt-3 pb-2 bg-gray-50">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar en carta..."
                  className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-steel-400"
                />
              </div>
            </div>
            <div className="flex gap-1 px-4 pb-2 overflow-x-auto">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat.valor}
                  onClick={() => { setCategoriaActiva(cat.valor); setBusqueda('') }}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    categoriaActiva === cat.valor
                      ? 'bg-steel-500 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-steel-300'
                  }`}
                >
                  <span>{cat.emoji}</span><span>{cat.label}</span>
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {productosFiltrados.map((producto) => (
                <ProductoCard
                  key={producto.id}
                  producto={producto}
                  cantidad={cantidadProducto(producto.id)}
                  onAgregar={() => agregarProducto(producto)}
                  onQuitar={() => quitarProducto(producto.id)}
                />
              ))}
              {productosFiltrados.length === 0 && (
                <div className="text-center py-10 text-gray-300">
                  <p className="text-3xl mb-2">🍽️</p>
                  <p className="text-sm">Sin resultados</p>
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha: Pedido */}
          <div className={`bg-white border-l border-gray-200 flex-col ${
            mobileTab === 'carta' ? 'hidden lg:flex lg:w-80' : 'flex flex-1 lg:flex-none lg:w-80'
          }`}>
            {/* Ítems existentes en modo agregar */}
            {modoAgregar && itemsExistentes.length > 0 && (
              <div className="border-b border-gray-100">
                <div className="px-4 py-2 bg-gray-50 flex items-center gap-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide flex-1">En mesa</p>
                  <span className="text-xs text-gray-400">{itemsExistentes.length} ítem(s)</span>
                </div>
                <div className="max-h-44 overflow-y-auto divide-y divide-gray-50">
                  {itemsExistentes.map((item) => {
                    const esCambiable = item.estado === 'en_preparacion' || item.estado === 'servido' || item.estado === 'listo'
                    return (
                      <div key={item.id} className="px-3 py-2 flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-700 truncate">{item.cantidad}× {item.nombre}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            item.estado === 'pendiente' ? 'bg-gray-100 text-gray-500' :
                            item.estado === 'en_preparacion' ? 'bg-gold-100 text-gold-700' :
                            item.estado === 'listo' ? 'bg-gold-100 text-gold-700' :
                            'bg-gray-50 text-gray-400'
                          }`}>
                            {item.estado === 'pendiente' ? 'Pendiente' : item.estado === 'en_preparacion' ? 'Preparando' : item.estado === 'listo' ? 'Listo' : 'Servido'}
                          </span>
                        </div>
                        {esCambiable && (
                          <button
                            onClick={() => solicitarDevolucion(item)}
                            title="Devolver este ítem"
                            className="p-1 text-rojo-500 hover:bg-rojo-50 rounded-lg transition-colors shrink-0"
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Nuevos ítems */}
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                {modoAgregar ? 'Agregar' : 'Pedido'}
              </h3>
            </div>

            {/* Descuento — control prominente dentro de la columna de Pedido */}
            {!modoAgregar && (
              <div className="px-4 py-3 border-b border-gray-100 bg-gold-50/40">
                <p className="flex items-center gap-1.5 text-xs font-bold text-gold-700 uppercase tracking-wide mb-2">
                  <Tag size={12} />
                  Descuento
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setTipoDescuento(undefined)}
                    className={`px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      !tipoDescuento
                        ? 'bg-gray-700 border-gray-700 text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    Ninguno
                  </button>
                  {DESCUENTOS.map((d) => (
                    <button
                      key={d.valor}
                      onClick={() => setTipoDescuento(d.valor)}
                      className={`px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        tipoDescuento === d.valor
                          ? 'bg-gold-600 text-white border-gold-600 shadow-sm'
                          : 'bg-white border-gold-300 text-gold-700 hover:bg-gold-100'
                      }`}
                    >
                      {d.emoji} {d.label} {d.porcentaje}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Nota general — control prominente dentro de la columna de Pedido */}
            {!modoAgregar && (
              <div className="px-4 py-3 border-b border-gray-100 bg-amber-50/40">
                <p className="flex items-center gap-1.5 text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">
                  <FileText size={12} />
                  Nota general
                </p>
                <input
                  value={notaGeneral}
                  onChange={(e) => setNotaGeneral(e.target.value)}
                  placeholder="Ej: mesa para celíacos, cumpleaños..."
                  className="w-full text-xs bg-white border border-amber-200 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {itemsPedido.length === 0 ? (
                <div className="text-center py-8 text-gray-300">
                  <ChefHat size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">Agrega productos</p>
                </div>
              ) : (
                itemsPedido.map(({ key, producto, cantidad, nota, tipoPlato, guarniciones }) => (
                  <div key={key} className="border border-gray-100 rounded-lg p-2">
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 leading-tight">
                          {cantidad}× {producto.nombre}
                        </p>
                        {tipoPlato && (
                          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 ${
                            tipoPlato === 'fuente' ? 'bg-steel-100 text-steel-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {tipoPlato === 'plato' ? '🍽 Plato' : '🥘 Fuente'}
                          </span>
                        )}
                        {guarniciones && guarniciones.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {guarniciones.map((g) => (
                              <span key={g} className="text-[10px] bg-gold-50 text-gold-700 border border-gold-200 px-1.5 py-0.5 rounded-full leading-none">{g}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => { setPedido((p) => { const n = new Map(p); n.delete(key); return n }); if (notaActiva === key) setNotaActiva(null) }}
                        className="text-red-400 hover:text-red-600 shrink-0 mt-0.5"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => quitarItemKey(key)} className="w-5 h-5 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-100 text-gray-500">
                          <Minus size={10} />
                        </button>
                        <span className="text-xs font-bold text-steel-700 w-4 text-center">{cantidad}</span>
                        <button
                          onClick={() => {
                            if (producto.tieneGuarnicion) setModalGuarnicion(producto)
                            else setPedido((p) => { const n = new Map(p); const a = n.get(key); if (a) n.set(key, { ...a, cantidad: a.cantidad + 1 }); return n })
                          }}
                          className="w-5 h-5 rounded-full bg-steel-50 border border-steel-200 flex items-center justify-center hover:bg-steel-500 hover:text-white hover:border-steel-500 transition-all text-steel-600"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-steel-600 font-semibold">S/ {(cantidad * producto.precio).toFixed(2)}</span>
                        <button
                          onClick={() => setNotaActiva(notaActiva === key ? null : key)}
                          className={`flex items-center gap-0.5 text-xs ${nota ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}
                        >
                          <StickyNote size={11} />
                          {nota ? 'nota' : '+nota'}
                        </button>
                      </div>
                    </div>
                    {notaActiva === key && (
                      <input
                        autoFocus
                        value={nota}
                        onChange={(e) => actualizarNota(key, e.target.value)}
                        placeholder="Ej: sin sal, término medio..."
                        className="mt-1.5 w-full text-xs border border-amber-200 rounded px-2 py-1 focus:outline-none focus:border-amber-400 bg-amber-50"
                      />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer totales + enviar */}
            <div className="border-t border-gray-100 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-700">S/ {totalPrecio.toFixed(2)}</span>
              </div>
              {!modoAgregar && (
                <div className="flex justify-between text-sm">
                  <span className={tipoDescuento ? 'text-gold-600 font-medium' : 'text-gray-400'}>
                    {tipoDescuento ? `${DESCUENTOS.find((d) => d.valor === tipoDescuento)?.emoji} Descuento (${descuentoPct}%)` : 'Descuento'}
                  </span>
                  <span className={`font-semibold ${tipoDescuento ? 'text-gold-700' : 'text-gray-400'}`}>
                    {tipoDescuento ? `– S/ ${(totalPrecio * descuentoPct / 100).toFixed(2)}` : 'S/ 0.00'}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                <span className="font-bold text-gray-700">Total</span>
                <span className="font-bold text-steel-700">S/ {totalConDcto.toFixed(2)}</span>
              </div>
              <button
                onClick={enviar}
                disabled={pedido.size === 0 || sinTurno || enviando}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-steel-500 text-white text-sm font-bold hover:bg-steel-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send size={15} className={enviando ? 'animate-pulse' : ''} />
                {enviando ? 'Enviando...' : modoAgregar ? `Agregar ${totalItems > 0 ? totalItems + ' ítem(s)' : ''}` : 'Enviar a Cocina'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalGuarnicion && (
        <ModalGuarnicion
          producto={modalGuarnicion}
          onConfirmar={confirmarGuarnicion}
          onCancelar={() => setModalGuarnicion(null)}
        />
      )}
      {modalDevolucion && (
        <ModalDevolucion
          item={modalDevolucion}
          onConfirmar={confirmarDevolucion}
          onCancelar={() => setModalDevolucion(null)}
        />
      )}
    </div>
  )
}
