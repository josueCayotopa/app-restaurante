import { useState, useEffect } from 'react'
import Header from '../../components/layout/Header'
import ControlesKiosco from '../../components/kds/ControlesKiosco'
import { useComandasStore } from '../../store/comandasStore'
import { reimprimirComanda } from '../../lib/impresion'
import { useToastStore } from '../../store/toastStore'
import type { Comanda, ItemComanda, EstadoItem } from '../../types'
import { Clock, ChefHat, CheckCircle, AlertTriangle, Play, Flame, RotateCcw, Printer } from 'lucide-react'
import { etiquetaComanda, insigniaComanda, esPedido } from '../../lib/etiqueta'

function tiempoTranscurrido(isoString: string): { minutos: number; label: string; urgente: boolean } {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 60000)
  return {
    minutos: diff,
    label: diff < 60 ? `${diff} min` : `${Math.floor(diff / 60)}h ${diff % 60}m`,
    urgente: diff >= 20,
  }
}

// Fondo SÓLIDO por estado (no tono clarito), con el texto en blanco/oscuro
// según haga falta para contraste.
const ESTADO_ITEM_CONFIG: Record<EstadoItem, { label: string; color: string; bg: string }> = {
  pendiente:      { label: 'Pendiente',  color: 'text-white',    bg: 'bg-gray-500'  },
  en_preparacion: { label: 'Preparando', color: 'text-gray-900', bg: 'bg-gold-500'  },
  listo:          { label: 'Listo',      color: 'text-white',    bg: 'bg-gold-600'  },
  servido:        { label: 'Servido',    color: 'text-gray-600', bg: 'bg-gray-200'  },
  cancelado:      { label: 'Cancelado',  color: 'text-white',    bg: 'bg-red-500'   },
  devuelto:       { label: 'Devuelto',   color: 'text-white',    bg: 'bg-rojo-600'  },
}

function proximo(estado: EstadoItem): EstadoItem | null {
  const flujo: EstadoItem[] = ['pendiente', 'en_preparacion', 'listo', 'servido']
  const idx = flujo.indexOf(estado)
  return idx >= 0 && idx < flujo.length - 1 ? flujo[idx + 1] : null
}

function ItemKDS({
  item,
  onCambiarEstado,
}: {
  item: ItemComanda
  onCambiarEstado: (estado: EstadoItem) => void
}) {
  const cfg = ESTADO_ITEM_CONFIG[item.estado]
  const siguiente = proximo(item.estado)

  if (item.estado === 'devuelto') {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-rojo-600">
        <RotateCcw size={15} className="text-white shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white line-through">{item.nombre}</p>
          <span className="text-[10px] font-bold text-rojo-700 bg-white px-1.5 py-0.5 rounded">
            DEVUELTO — retirar
          </span>
        </div>
        <button
          onClick={() => onCambiarEstado('cancelado')}
          className="shrink-0 px-4 min-h-11 rounded-lg text-sm font-bold bg-white text-rojo-700 hover:bg-rojo-50 transition-colors"
        >
          Aceptar ✓
        </button>
      </div>
    )
  }

  // Fila con fondo SÓLIDO dorado cuando el ítem está activo (en preparación o
  // listo) para que resalte de verdad; blanco/neutro mientras está pendiente
  // o ya servido.
  const activo = item.estado === 'listo' || item.estado === 'en_preparacion'

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
      activo ? 'bg-gold-500' : 'border border-gray-100 bg-white'
    }`}>
      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${activo ? 'bg-black/10 text-gray-900' : `${cfg.bg} ${cfg.color}`}`}>
        ×{item.cantidad}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className={`text-base font-semibold ${
            item.estado === 'servido' ? 'line-through text-gray-400' : activo ? 'text-gray-900' : 'text-gray-800'
          }`}>
            {item.nombre}
          </p>
          {item.tipoPlato && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
              activo ? 'bg-black/15 text-gray-900' : item.tipoPlato === 'fuente' ? 'bg-steel-500 text-white' : 'bg-gray-500 text-white'
            }`}>
              {item.tipoPlato === 'plato' ? 'PLATO' : 'FUENTE'}
            </span>
          )}
        </div>
        {item.guarniciones && item.guarniciones.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {item.guarniciones.map((g) => (
              <span key={g} className={`text-[10px] px-1.5 py-0.5 rounded-full leading-none font-medium ${
                activo ? 'bg-white text-gold-700' : 'bg-gold-500 text-gray-900'
              }`}>
                {g}
              </span>
            ))}
          </div>
        )}
        {item.nota && (
          <p className={`text-xs italic mt-0.5 font-semibold ${activo ? 'text-gray-900' : 'text-rojo-600'}`}>⚠ {item.nota}</p>
        )}
      </div>
      {siguiente && item.estado !== 'servido' && item.estado !== 'cancelado' && (
        <button
          onClick={() => onCambiarEstado(siguiente)}
          className={`shrink-0 px-4 min-h-11 min-w-20 rounded-lg text-sm font-bold transition-colors active:scale-95 ${
            siguiente === 'en_preparacion'
              ? 'bg-gold-600 text-white hover:bg-gold-700'
              : siguiente === 'listo'
              ? 'bg-rojo-500 text-white hover:bg-rojo-600'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {siguiente === 'en_preparacion' ? 'Iniciar' : siguiente === 'listo' ? 'Listo ✓' : 'Servido'}
        </button>
      )}
    </div>
  )
}

type ColumnaKDS = 'nuevas' | 'preparacion' | 'listas'

function TarjetaComandaKDS({ comanda, todosLosItems, itemsColumna, columna }: {
  comanda: Comanda
  todosLosItems: ItemComanda[]  // todos los ítems de cocina de la comanda — para el progreso y saber cuándo está todo listo
  itemsColumna: ItemComanda[]   // solo los ítems que corresponden a ESTA columna (misma comanda puede aparecer en varias)
  columna: ColumnaKDS
}) {
  const actualizarEstadoItem = useComandasStore((s) => s.actualizarEstadoItem)
  const actualizarEstadoComanda = useComandasStore((s) => s.actualizarEstadoComanda)
  const [, forceUpdate] = useState(0)
  const tiempo = tiempoTranscurrido(comanda.creadaEn)

  useEffect(() => {
    const t = setInterval(() => forceUpdate((n) => n + 1), 30000)
    return () => clearInterval(t)
  }, [])

  const activos = todosLosItems.filter((i) => i.estado !== 'cancelado' && i.estado !== 'devuelto')

  const todosListos = activos.length > 0 && activos.every(
    (i) => i.estado === 'listo' || i.estado === 'servido'
  )

  const itemsActivos = activos
  const enPrep = itemsActivos.filter((i) => i.estado === 'en_preparacion').length
  const listos = itemsActivos.filter((i) => i.estado === 'listo' || i.estado === 'servido').length
  const progreso = itemsActivos.length > 0 ? Math.round((listos / itemsActivos.length) * 100) : 0

  // En esta tarjeta solo se muestran los ítems que corresponden a la columna
  // actual; las devoluciones solo se muestran en la columna "Listas".
  const devueltos      = columna === 'listas' ? itemsColumna.filter((i) => i.estado === 'devuelto') : []
  const itemsAMostrar  = itemsColumna.filter((i) => i.estado !== 'devuelto')

  // Encabezado de la tarjeta con fondo SÓLIDO cuando hay algo que atender
  // (urgente o lista para servir); neutro mientras está en curso normal.
  const headerBg    = tiempo.urgente ? 'bg-red-500' : todosListos ? 'bg-gold-500' : 'bg-gray-50'
  const headerText  = tiempo.urgente ? 'text-white' : todosListos ? 'text-gray-900' : 'text-gray-800'
  const headerMuted = tiempo.urgente ? 'text-white/80' : todosListos ? 'text-gray-900/70' : 'text-gray-500'
  const headerChip  = tiempo.urgente ? 'bg-white/20 text-white' : todosListos ? 'bg-black/10 text-gray-900' : 'bg-gold-600 text-white'

  return (
    <div className={`bg-white rounded-xl shadow-sm border-2 flex flex-col overflow-hidden transition-all ${
      tiempo.urgente ? 'border-red-500' : todosListos ? 'border-gold-500' : enPrep > 0 ? 'border-gold-300' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${headerBg}`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${headerChip}`}>
            {insigniaComanda(comanda)}
          </div>
          <div>
            
            <p className={`text-sm font-bold ${headerText}`}>{etiquetaComanda(comanda)}</p>
            <p className={`text-xs ${headerMuted}`}>
              {esPedido(comanda)
                ? <><b>{comanda.paraLlevar ? '🛍 PARA LLEVAR' : 'COMER AQUÍ'}</b>{comanda.horaRecojo ? ` · recoge ${new Date(comanda.horaRecojo).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false })}` : ''}</>
                : comanda.mozo}
            </p>

          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-1 text-xs font-medium ${tiempo.urgente ? 'text-white' : headerMuted}`}>
            {tiempo.urgente && <AlertTriangle size={12} />}
            <Clock size={12} />
            {tiempo.label}
          </div>
          <button
            onClick={() => reimprimirComanda(comanda.id, 'cocina', (itemsAMostrar.length > 0 ? itemsAMostrar : itemsColumna).map((i) => i.id)).catch((e) => useToastStore.getState().agregar({ tipo: 'error', titulo: 'No se pudo imprimir', mensaje: e instanceof Error ? e.message : 'Error de impresión', duracion: 6000 }))}
            title="Reimprimir ticket"
            className={`p-2.5 rounded-lg transition-colors ${tiempo.urgente ? 'hover:bg-white/20 text-white' : todosListos ? 'hover:bg-black/10 text-gray-900' : 'hover:bg-gray-200 text-gray-500'}`}
          >
            <Printer size={18} />
          </button>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-1 bg-gray-100">
        <div
          className={`h-full transition-all ${todosListos ? 'bg-gold-500' : 'bg-gold-400'}`}
          style={{ width: `${progreso}%` }}
        />
      </div>

      {/* Devoluciones primero (solo en la columna "Listas") */}
      {devueltos.length > 0 && (
        <div className="px-3 pt-3">
          <p className="text-xs font-bold text-rojo-600 mb-1.5 flex items-center gap-1">
            <RotateCcw size={11} />
            Devolución(es) — aceptar para retirar
          </p>
          <div className="space-y-1.5">
            {devueltos.map((item) => (
              <ItemKDS
                key={item.id}
                item={item}
                onCambiarEstado={(estado) => actualizarEstadoItem(comanda.id, item.id, estado)}
              />
            ))}
          </div>
          {itemsAMostrar.length > 0 && <div className="border-t border-dashed border-rojo-200 my-2" />}
        </div>
      )}

      {/* Ítems de esta columna */}
      <div className="flex-1 p-3 space-y-2">
        {itemsAMostrar.map((item) => (
          <ItemKDS
            key={item.id}
            item={item}
            onCambiarEstado={(estado) => actualizarEstadoItem(comanda.id, item.id, estado)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {listos}/{itemsActivos.length} items en total
        </span>
        {columna === 'listas' && todosListos && (
          <button
            onClick={() => actualizarEstadoComanda(comanda.id, 'lista')}
            className="flex items-center gap-1.5 px-4 min-h-11 bg-rojo-500 text-white rounded-lg text-sm font-bold active:scale-95 hover:bg-rojo-600 transition-colors"
          >
            <CheckCircle size={13} />
            Comanda lista
          </button>
        )}
        {columna === 'nuevas' && itemsAMostrar.length > 0 && (
          <button
            onClick={() =>
              itemsColumna.forEach((i) => {
                if (i.estado === 'pendiente') actualizarEstadoItem(comanda.id, i.id, 'en_preparacion')
              })
            }
            className="flex items-center gap-1.5 px-4 min-h-11 bg-gold-600 text-white rounded-lg text-sm font-bold active:scale-95 hover:bg-gold-700 transition-colors"
          >
            <Play size={13} />
            Iniciar {itemsAMostrar.length > 1 ? 'todo' : ''}
          </button>
        )}
      </div>
    </div>
  )
}

interface GrupoKDS {
  comanda: Comanda
  todosLosItems: ItemComanda[]
  itemsColumna: ItemComanda[]
}

// Agrupa por comanda los ítems que caen en una columna dada. Una misma
// comanda puede aparecer en varias columnas a la vez: si de 3 platos uno ya
// se puso a preparar, ese plato se ve en "En preparación" y los otros dos
// siguen en "Nuevas", cada uno en su propia mini-tarjeta.
function agruparPorColumna(
  comandas: Comanda[],
  itemsDeArea: (c: Comanda) => ItemComanda[],
  estados: EstadoItem[]
): GrupoKDS[] {
  return comandas
    .map((c) => {
      const todosLosItems = itemsDeArea(c)
      const itemsColumna = todosLosItems.filter((i) => estados.includes(i.estado))
      return { comanda: c, todosLosItems, itemsColumna }
    })
    .filter((g) => g.itemsColumna.length > 0)
}

export default function CocinaPage() {
  const comandas = useComandasStore((s) => s.comandas)

  const itemsCocina = (c: Comanda) => c.items.filter((i) => i.area === 'cocina' || !i.area)
  const comandasActivas = comandas.filter((c) => c.estado !== 'cerrada' && c.estado !== 'cancelada')

  const gruposNuevas       = agruparPorColumna(comandasActivas, itemsCocina, ['pendiente'])
  const gruposPreparacion  = agruparPorColumna(comandasActivas, itemsCocina, ['en_preparacion'])
  const gruposListas       = agruparPorColumna(comandasActivas, itemsCocina, ['listo', 'devuelto'])

  const columnas: { titulo: string; icon: typeof Flame; columna: ColumnaKDS; grupos: GrupoKDS[]; bg: string; text: string; chip: string }[] = [
    { titulo: 'Nuevas',             icon: Flame,       columna: 'nuevas',      grupos: gruposNuevas,      bg: 'bg-rojo-500', text: 'text-white',    chip: 'bg-white text-rojo-600' },
    { titulo: 'En preparación',     icon: ChefHat,     columna: 'preparacion', grupos: gruposPreparacion, bg: 'bg-gold-500', text: 'text-gray-900', chip: 'bg-white text-gold-700' },
    { titulo: 'Listas para servir', icon: CheckCircle, columna: 'listas',      grupos: gruposListas,      bg: 'bg-gray-600', text: 'text-white',    chip: 'bg-white text-gray-700' },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header titulo="Cocina — KDS" subtitulo="Kitchen Display System" acciones={<ControlesKiosco />} />

      <div className="flex-1 p-4 md:p-6 overflow-y-auto md:overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 md:h-full">
          {columnas.map(({ titulo, icon: Icon, columna, grupos, bg, text, chip }) => (
            <div key={titulo} className="flex flex-col md:min-h-0">
              {/* Columna header */}
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${bg} mb-3`}>
                <Icon size={16} className={text} />
                <span className={`text-sm font-bold ${text}`}>{titulo}</span>
                <span className={`ml-auto text-xs font-bold ${chip} rounded-full w-6 h-6 flex items-center justify-center`}>
                  {grupos.length}
                </span>
              </div>
              {/* Cards */}
              <div className="md:flex-1 md:overflow-y-auto space-y-4 md:pr-1">
                {grupos.length === 0 ? (
                  <div className="text-center py-10 text-gray-300">
                    <ChefHat size={36} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Sin comandas</p>
                  </div>
                ) : (
                  grupos.map(({ comanda, todosLosItems, itemsColumna }) => (
                    <TarjetaComandaKDS
                      key={comanda.id}
                      comanda={comanda}
                      todosLosItems={todosLosItems}
                      itemsColumna={itemsColumna}
                      columna={columna}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
