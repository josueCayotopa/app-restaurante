import { useCallback, useEffect, useMemo, useState } from 'react'
import Header from '../../components/layout/Header'
import NuevaComanda from '../../components/comandas/NuevaComanda'
import ModalCancelarComanda from '../../components/comandas/ModalCancelarComanda'
import ModalCobro, { soles, itemsCobrables, totalAPagar } from '../../components/caja/ModalCobro'
import { useComandasStore } from '../../store/comandasStore'
import { useCajaStore } from '../../store/cajaStore'
import { useAuthStore } from '../../store/authStore'
import { useToastStore } from '../../store/toastStore'
import { apiFetch, ApiError } from '../../lib/api'
import { socket } from '../../lib/socket'
import { imprimirCobro, imprimirPrecuenta, METODO_LABEL } from '../../lib/impresion'
import { MODALIDADES, modalidadDe } from '../../lib/etiqueta'
import type { Comanda } from '../../types'
import {
  Plus, Phone, Clock, ShoppingBag, UtensilsCrossed, Banknote, PackageCheck, XCircle,
  Printer, Loader2, ChefHat, CheckCircle, PlusCircle,
} from 'lucide-react'

// ── Estado de un pedido ──────────────────────────────────────────────────────

const activo = (c: Comanda) => c.estado !== 'cerrada' && c.estado !== 'cancelada'

// Cómo va la cocina/bar con el pedido
function estadoPreparacion(c: Comanda): { label: string; clase: string } {
  const items = itemsCobrables(c)
  if (items.length > 0 && items.every((i) => i.estado === 'listo' || i.estado === 'servido')) {
    return { label: 'Listo para entregar', clase: 'bg-green-600 text-white' }
  }
  if (items.some((i) => i.estado === 'en_preparacion' || i.estado === 'listo')) {
    return { label: 'Preparando', clase: 'bg-gold-500 text-gray-900' }
  }
  return { label: 'En cola', clase: 'bg-gray-500 text-white' }
}

const hora = (d: string) => new Date(d).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })
const errorDe = (e: unknown) => (e instanceof ApiError ? e.message : 'Sin conexión con el servidor: intenta de nuevo')

function inicioDeHoy() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}

// ── Tarjeta de pedido ────────────────────────────────────────────────────────

function TarjetaPedido({ pedido, puedeCobrar, cajaAbierta, onCobrar, onAgregar, onCancelar }: {
  pedido: Comanda; puedeCobrar: boolean; cajaAbierta: boolean
  onCobrar: () => void; onAgregar: () => void; onCancelar: () => void
}) {
  const entregarPedido = useComandasStore((s) => s.entregarPedido)
  const [entregando, setEntregando] = useState(false)
  const pagado = !!pedido.cobradaEn
  const prep = estadoPreparacion(pedido)
  const items = itemsCobrables(pedido)
  const enCurso = activo(pedido)

  const entregar = async () => {
    if (!pagado || entregando) return
    setEntregando(true)
    try {
      await entregarPedido(pedido.id)
      useToastStore.getState().agregar({ tipo: 'info', titulo: `Pedido #${pedido.numero} entregado`, mensaje: pedido.clienteNombre ?? '', duracion: 4000 })
    } catch (e) {
      useToastStore.getState().agregar({ tipo: 'error', titulo: 'No se pudo entregar', mensaje: errorDe(e), duracion: 6000 })
    } finally {
      setEntregando(false)
    }
  }

  return (
    <div className={`bg-white rounded-xl border-2 p-4 flex flex-col gap-3 ${
      !enCurso ? 'border-gray-100 opacity-70' : prep.label === 'Listo para entregar' ? 'border-green-500' : 'border-gray-200'
    }`}>
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-gray-800 truncate">
            <span className="text-gold-700">#{pedido.numero ?? '…'}</span> {pedido.clienteNombre}
          </p>
          <p className="text-xs text-gray-500 flex items-center gap-2 flex-wrap mt-0.5">
            {pedido.clienteTelefono && (
              <a href={`tel:${pedido.clienteTelefono}`} className="inline-flex items-center gap-1 hover:text-gray-800"><Phone size={11} />{pedido.clienteTelefono}</a>
            )}
            <span className="inline-flex items-center gap-1">
              {modalidadDe(pedido) === 'local' ? <UtensilsCrossed size={11} /> : <ShoppingBag size={11} />} {MODALIDADES[modalidadDe(pedido)].label}
            </span>
            <span className="inline-flex items-center gap-1"><Clock size={11} />{hora(pedido.creadaEn)}</span>
          </p>
          {pedido.horaRecojo && <p className="text-xs font-semibold text-steel-700 mt-0.5">Recoge a las {hora(pedido.horaRecojo)}</p>}
        </div>
        <span className="text-lg font-bold text-gray-800 shrink-0">{soles(pedido.totalCobrado ?? totalAPagar(pedido))}</span>
      </div>

      {/* Estados */}
      <div className="flex flex-wrap gap-1.5">
        {pedido.estado === 'cancelada' ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rojo-500 text-white">Cancelado</span>
        ) : pedido.estado === 'cerrada' ? (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-700 text-white">Entregado {pedido.entregadaEn ? hora(pedido.entregadaEn) : ''}</span>
        ) : (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${prep.clase}`}><ChefHat size={11} />{prep.label}</span>
        )}
        {pedido.estado !== 'cancelada' && (
          pagado
            ? <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gold-600 text-white">Pagado · {METODO_LABEL[pedido.metodoPago ?? ''] ?? ''}</span>
            : <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rojo-100 text-rojo-700">Por cobrar</span>
        )}
      </div>
      {pedido.estado === 'cancelada' && pedido.motivoCancelacion && (
        <p className="text-xs text-rojo-600">Motivo: {pedido.motivoCancelacion}{pagado ? ` · se devolvió ${soles(pedido.totalCobrado ?? 0)}` : ''}</p>
      )}

      {/* Detalle */}
      <div className="text-xs text-gray-500 space-y-0.5">
        {items.map((it) => (
          <div key={it.id} className="flex justify-between gap-2">
            <span className="truncate">{it.cantidad}× {it.nombre}</span>
            <span className="shrink-0">{soles(it.cantidad * it.precioUnitario)}</span>
          </div>
        ))}
        {(pedido.descartable ?? 0) > 0 && (
          <div className="flex justify-between gap-2 text-gray-400"><span>{MODALIDADES[modalidadDe(pedido)].cargoLabel || 'Cargo'}</span><span>{soles(pedido.descartable ?? 0)}</span></div>
        )}
        {pedido.notaGeneral && <p className="text-amber-600 font-medium pt-1">Nota: {pedido.notaGeneral}</p>}
      </div>

      {/* Acciones */}
      {enCurso ? (
        <div className="mt-auto space-y-2">
          <div className="flex gap-2">
            {!pagado && puedeCobrar && (
              <button onClick={onCobrar} disabled={!cajaAbierta} title={cajaAbierta ? undefined : 'Abre la caja para cobrar'}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-gold-600 text-white rounded-lg text-sm font-semibold hover:bg-gold-700 disabled:opacity-40 disabled:cursor-not-allowed">
                <Banknote size={15} /> Cobrar
              </button>
            )}
            <button onClick={entregar} disabled={!pagado || entregando}
              title={pagado ? undefined : 'No se fía: primero hay que cobrar'}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-steel-500 text-white rounded-lg text-sm font-semibold hover:bg-steel-600 disabled:opacity-40 disabled:cursor-not-allowed">
              {entregando ? <Loader2 size={15} className="animate-spin" /> : <PackageCheck size={15} />} Entregar
            </button>
          </div>
          {!pagado && <p className="text-[11px] text-gray-400 text-center">No se fía: se entrega solo después de cobrar</p>}
          <div className="flex gap-2">
            {!pagado && (
              <button onClick={onAgregar}
                className="flex-1 flex items-center justify-center gap-1 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
                <PlusCircle size={13} /> Agregar / quitar
              </button>
            )}
            {!pagado && (
              <button onClick={() => imprimirPrecuenta(pedido.id)}
                className="flex-1 flex items-center justify-center gap-1 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
                <Printer size={13} /> Precuenta
              </button>
            )}
            {pagado && puedeCobrar && (
              <button onClick={() => imprimirCobro(pedido.id, { abrirGaveta: false }).catch((e) => useToastStore.getState().agregar({ tipo: 'error', titulo: 'No se pudo imprimir', mensaje: errorDe(e), duracion: 6000 }))}
                className="flex-1 flex items-center justify-center gap-1 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
                <Printer size={13} /> Ticket
              </button>
            )}
            {puedeCobrar && (
              <button onClick={onCancelar}
                className="flex-1 flex items-center justify-center gap-1 py-2 border border-rojo-200 rounded-lg text-xs font-semibold text-rojo-600 hover:bg-rojo-50">
                <XCircle size={13} /> Cancelar
              </button>
            )}
          </div>
        </div>
      ) : pagado && pedido.estado === 'cerrada' && puedeCobrar ? (
        <button onClick={() => imprimirCobro(pedido.id, { abrirGaveta: false }).catch((e) => useToastStore.getState().agregar({ tipo: 'error', titulo: 'No se pudo imprimir', mensaje: errorDe(e), duracion: 6000 }))}
          className="mt-auto flex items-center justify-center gap-1 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
          <Printer size={13} /> Reimprimir ticket
        </button>
      ) : null}
    </div>
  )
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function PedidosPage() {
  const comandas = useComandasStore((s) => s.comandas)
  const rol = useAuthStore((s) => s.usuario?.rol)
  const puedeCobrar = rol === 'admin' || rol === 'cajero'
  const cajaAbierta = useCajaStore((s) => !!s.sesion)
  const [vista, setVista] = useState<'activos' | 'hoy'>('activos')
  const [nuevo, setNuevo] = useState(false)
  const [agregarA, setAgregarA] = useState<Comanda | null>(null)
  const [aCobrar, setACobrar] = useState<string | null>(null)
  const [aCancelar, setACancelar] = useState<Comanda | null>(null)
  const [deHoy, setDeHoy] = useState<Comanda[]>([])

  // Activos: los trae el store (tiempo real); el resto del día, el servidor
  const cargarHoy = useCallback(async () => {
    try {
      setDeHoy(await apiFetch<Comanda[]>(`/api/comandas?tipo=pedido&creadaDesde=${inicioDeHoy().toISOString()}`))
    } catch (e) {
      console.error('[pedidos] Error cargando el día:', e)
    }
  }, [])

  useEffect(() => {
    useComandasStore.getState().cargarComandas()
    if (puedeCobrar) useCajaStore.getState().cargar().catch(() => {})
    cargarHoy()
    const onActualizada = (c: Comanda) => { if (c.tipo === 'pedido') cargarHoy() }
    socket.on('comanda:actualizada', onActualizada)
    return () => { socket.off('comanda:actualizada', onActualizada) }
  }, [cargarHoy, puedeCobrar])

  const activos = useMemo(
    () => comandas.filter((c) => c.tipo === 'pedido' && activo(c))
      .sort((a, b) => new Date(a.creadaEn).getTime() - new Date(b.creadaEn).getTime()),
    [comandas],
  )
  // El historial del día con el estado más reciente (si el store lo tiene, manda el store)
  const hoy = useMemo(() => {
    const porId = new Map(deHoy.map((c) => [c.id, c]))
    for (const c of activos) porId.set(c.id, c)
    return [...porId.values()].sort((a, b) => new Date(b.creadaEn).getTime() - new Date(a.creadaEn).getTime())
  }, [deHoy, activos])

  const lista = vista === 'activos' ? activos : hoy
  const pedidoACobrar = aCobrar ? comandas.find((c) => c.id === aCobrar) ?? hoy.find((c) => c.id === aCobrar) : undefined

  const porCobrar = activos.filter((c) => !c.cobradaEn)
  const listos = activos.filter((c) => estadoPreparacion(c).label === 'Listo para entregar')

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Pedidos" subtitulo="Pedidos por teléfono · para llevar y delivery" />

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        {/* Resumen y acciones */}
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setNuevo(true)}
            className="flex items-center gap-2 px-4 py-3 bg-gold-600 text-white rounded-xl font-bold hover:bg-gold-700">
            <Plus size={18} /> Nuevo pedido
          </button>
          <div className="flex bg-white border border-gray-200 rounded-xl p-1">
            {([['activos', `En curso (${activos.length})`], ['hoy', `Hoy (${hoy.length})`]] as const).map(([v, label]) => (
              <button key={v} onClick={() => setVista(v)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${vista === v ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-800'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 text-xs ml-auto">
            <span className="px-3 py-1.5 rounded-full bg-rojo-100 text-rojo-700 font-semibold">{porCobrar.length} por cobrar</span>
            <span className="px-3 py-1.5 rounded-full bg-green-100 text-green-700 font-semibold">{listos.length} listos</span>
          </div>
        </div>

        {puedeCobrar && !cajaAbierta && porCobrar.length > 0 && (
          <p className="text-sm bg-gold-50 border border-gold-200 text-gray-700 rounded-lg px-3 py-2">
            La caja está cerrada: ábrela en <b>Caja</b> para poder cobrar los pedidos.
          </p>
        )}

        {lista.length === 0 ? (
          <div className="text-center py-16 text-gray-300 bg-white rounded-xl border border-gray-100">
            <CheckCircle size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">{vista === 'activos' ? 'No hay pedidos en curso' : 'Aún no hay pedidos hoy'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {lista.map((p) => (
              <TarjetaPedido key={p.id} pedido={p} puedeCobrar={puedeCobrar} cajaAbierta={cajaAbierta}
                onCobrar={() => setACobrar(p.id)}
                onAgregar={() => setAgregarA(p)}
                onCancelar={() => setACancelar(p)} />
            ))}
          </div>
        )}
      </div>

      {nuevo && (
        <NuevaComanda
          modoPedido
          mesaId={null}
          numeroMesa={0}
          onCerrar={() => setNuevo(false)}
          onPedidoCreado={(p, pagarAhora) => {
            setVista('activos')
            if (pagarAhora && puedeCobrar) {
              if (cajaAbierta) setACobrar(p.id)
              else useToastStore.getState().agregar({ tipo: 'error', titulo: 'Caja cerrada', mensaje: 'Abre la caja para cobrar el pedido', duracion: 6000 })
            }
          }}
        />
      )}
      {agregarA && (
        <NuevaComanda
          mesaId={null}
          numeroMesa={0}
          comandaExistente={comandas.find((c) => c.id === agregarA.id) ?? agregarA}
          onCerrar={() => setAgregarA(null)}
        />
      )}
      {pedidoACobrar && (
        <ModalCobro comanda={pedidoACobrar} onCobrado={cargarHoy} onCerrar={() => setACobrar(null)} />
      )}
      {aCancelar && <ModalCancelarComanda comanda={aCancelar} onCerrar={() => { setACancelar(null); cargarHoy() }} />}
    </div>
  )
}
