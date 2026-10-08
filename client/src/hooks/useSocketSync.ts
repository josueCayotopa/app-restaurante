import { useEffect } from 'react'
import { socket } from '../lib/socket'
import { useComandasStore } from '../store/comandasStore'
import { useMesasStore } from '../store/mesasStore'
import { useToastStore } from '../store/toastStore'
import { useAuthStore } from '../store/authStore'
import { reproducirAlerta } from '../lib/sound'
import type { Comanda, ItemComanda, TipoPlato, EstadoComanda, EstadoMesa } from '../types'
import { etiquetaComanda } from '../lib/etiqueta'

interface ItemResumen {
  cantidad: number
  nombre: string
  tipoPlato?: TipoPlato
  guarniciones?: string[]
}

interface ItemsAgregadosPayload {
  comanda: Comanda
  nuevo: boolean
  itemsCocina: ItemResumen[]
  itemsBar: ItemResumen[]
  origenSocketId?: string
}

interface ItemDevueltoPayload {
  comandaId: string
  numeroMesa: number
  item: ItemComanda
  origenSocketId?: string
}

interface ItemActualizadoPayload {
  comandaId: string
  numeroMesa?: number
  item: ItemComanda
  comandaEstado?: EstadoComanda
  origenSocketId?: string
}

// " — Mesa 4" / " — Pedido #12 · Juan" (busca la comanda en el store para saber si es pedido)
function etiquetaDe(comandaId: string, numeroMesa?: number) {
  const c = useComandasStore.getState().comandas.find((x) => x.id === comandaId)
  if (c) return ` — ${etiquetaComanda(c)}`
  return numeroMesa ? ` — Mesa ${numeroMesa}` : ''
}

// Quién recibe cada aviso (toast + sonido), según el ROL del usuario:
//  - Cocina (cocinero): solo lo de cocina — pedidos nuevos, adiciones, anulados y devoluciones
//  - Bar (bartender): lo mismo pero de bebidas
//  - Mozos: solo "listo para servir" (lo que tienen que ir a recoger)
//  - Caja: solo cuentas listas para cobrar (todos los platos listos, o el mozo pidió la precuenta)
//  - Admin: en Cocina, Bar o Caja se comporta como esa área; en las demás, platos listos y cuentas
//    por cobrar (NO las comandas que envían los mozos: eso suena solo en Cocina/Bar)
type Evento = 'pedido' | 'listo' | 'cobrar'
function perfilAviso(): 'cocina' | 'bar' | 'salon' | 'caja' | 'todo' {
  const rol = useAuthStore.getState().usuario?.rol
  if (rol === 'cocinero') return 'cocina'
  if (rol === 'bartender') return 'bar'
  if (rol === 'mozo') return 'salon'
  if (rol === 'cajero') return 'caja'
  const ruta = window.location.pathname
  if (ruta.startsWith('/cocina')) return 'cocina'
  if (ruta.startsWith('/bar')) return 'bar'
  if (ruta.startsWith('/caja')) return 'caja'
  return 'todo'
}
function debeAvisar(evento: Evento, area?: string): boolean {
  const perfil = perfilAviso()
  const deArea = area === 'bar' ? 'bar' : 'cocina'
  if (perfil === 'todo') return evento !== 'pedido'
  if (perfil === 'caja') return evento === 'cobrar'
  if (perfil === 'salon') return evento === 'listo'
  return evento === 'pedido' && deArea === perfil
}

// ¿Esta comanda ya tiene todo listo y falta cobrarla? (para avisar a Caja una sola vez:
// se evalúa justo cuando el último plato pasa a "listo")
function listaParaCobrar(comandaId: string) {
  const c = useComandasStore.getState().comandas.find((x) => x.id === comandaId)
  if (!c || c.cobradaEn || c.estado === 'cerrada' || c.estado === 'cancelada') return null
  const activos = c.items.filter((i) => i.estado !== 'cancelado' && i.estado !== 'devuelto')
  if (activos.length === 0 || !activos.every((i) => i.estado === 'listo' || i.estado === 'servido')) return null
  return c
}

function formatearItem(i: ItemResumen): string {
  let d = `${i.cantidad}× ${i.nombre}`
  if (i.tipoPlato) d += ` [${i.tipoPlato === 'plato' ? 'Plato' : 'Fuente'}]`
  if (i.guarniciones?.length) d += `: ${i.guarniciones.join(', ')}`
  return d
}

// Conecta los eventos de tiempo real del backend con el store de comandas y los toasts
// de cocina/bar, para que cualquier pantalla (KDS, mesero, caja) se entere al instante
// cuando se agrega o devuelve un ítem, sin importar desde qué dispositivo se hizo.
export function useSocketSync() {
  const aplicarComandaRemota = useComandasStore((s) => s.aplicarComandaRemota)
  const aplicarItemRemoto    = useComandasStore((s) => s.aplicarItemRemoto)
  const agregarToast         = useToastStore((s) => s.agregar)

  useEffect(() => {
    const onComandaActualizada = (comanda: Comanda) => aplicarComandaRemota(comanda)

    const onItemActualizado = (data: ItemActualizadoPayload) => {
      aplicarItemRemoto(data.comandaId, data.item, data.comandaEstado)
      const esPropio = !!data.origenSocketId && data.origenSocketId === socket.id
      if (esPropio) return
      if (data.item.estado === 'listo' && debeAvisar('listo', data.item.area)) {
        agregarToast({
          tipo: data.item.area === 'bar' ? 'bar' : 'cocina',
          titulo: `✅ Listo para servir${etiquetaDe(data.comandaId, data.numeroMesa)}`,
          mensaje: `${data.item.cantidad}× ${data.item.nombre} está listo`,
          duracion: 6000,
        })
        reproducirAlerta()
      }
      if (data.item.estado === 'listo' && debeAvisar('cobrar')) {
        const c = listaParaCobrar(data.comandaId)
        if (c) {
          agregarToast({
            tipo: 'success',
            titulo: `💵 Lista para cobrar — ${etiquetaComanda(c)}`,
            mensaje: 'Todos los platos y bebidas están listos',
            duracion: 8000,
          })
          reproducirAlerta()
        }
      }
      if (data.item.estado === 'cancelado' && debeAvisar('pedido', data.item.area)) {
        agregarToast({
          tipo: data.item.area === 'bar' ? 'bar' : 'cocina',
          titulo: `🗑 Anulado${etiquetaDe(data.comandaId, data.numeroMesa)}`,
          mensaje: `${data.item.cantidad}× ${data.item.nombre} — NO preparar`,
          duracion: 8000,
        })
        reproducirAlerta()
      }
    }

    const onItemsAgregados = (data: ItemsAgregadosPayload) => {
      aplicarComandaRemota(data.comanda)
      const esPropio = !!data.origenSocketId && data.origenSocketId === socket.id
      if (esPropio) return
      const mesa = etiquetaComanda(data.comanda)
      if (data.itemsCocina.length > 0 && debeAvisar('pedido', 'cocina')) {
        agregarToast({
          tipo: 'cocina',
          titulo: data.nuevo ? `🍽 Ticket nuevo — ${mesa}` : `🍽 Adición — ${mesa}`,
          mensaje: data.itemsCocina.map(formatearItem).join(' · '),
          duracion: 6000,
        })
        reproducirAlerta()
      }
      if (data.itemsBar.length > 0 && debeAvisar('pedido', 'bar')) {
        agregarToast({
          tipo: 'bar',
          titulo: data.nuevo ? `🍺 Ticket nuevo — ${mesa}` : `🍺 Adición — ${mesa}`,
          mensaje: data.itemsBar.map(formatearItem).join(' · '),
          duracion: 6000,
        })
        reproducirAlerta()
      }
    }

    const onItemDevuelto = (data: ItemDevueltoPayload) => {
      aplicarItemRemoto(data.comandaId, data.item)
      const esPropio = !!data.origenSocketId && data.origenSocketId === socket.id
      if (esPropio || !debeAvisar('pedido', data.item.area)) return
      agregarToast({
        tipo: data.item.area === 'bar' ? 'bar' : 'cocina',
        titulo: `↩ Devolución${etiquetaDe(data.comandaId, data.numeroMesa)}`,
        mensaje: `${data.item.cantidad}× ${data.item.nombre} ha sido devuelto`,
        duracion: 6000,
      })
      reproducirAlerta()
    }

    // El mozo imprimió la precuenta: el cliente pidió la cuenta
    const onCuentaPedida = (data: { comandaId: string; etiqueta: string; titulo: string; pidio?: string }) => {
      if (!debeAvisar('cobrar')) return
      const total = data.titulo.split(' · ').pop() ?? ''
      agregarToast({
        tipo: 'success',
        titulo: `🧾 Pidió la cuenta — ${data.etiqueta}`,
        mensaje: `Precuenta ${total}${data.pidio ? ` · ${data.pidio}` : ''}`,
        duracion: 10000,
      })
      reproducirAlerta()
    }

    const onMesaEstado = (mesa: { id: string; estado: EstadoMesa }) => useMesasStore.getState().aplicarEstadoRemoto(mesa.id, mesa.estado)

    socket.on('mesa:estado_actualizado', onMesaEstado)
    socket.on('comanda:cuenta_pedida', onCuentaPedida)
    socket.on('comanda:actualizada', onComandaActualizada)
    socket.on('comanda:item_actualizado', onItemActualizado)
    socket.on('comanda:items_agregados', onItemsAgregados)
    socket.on('comanda:item_devuelto', onItemDevuelto)

    return () => {
      socket.off('mesa:estado_actualizado', onMesaEstado)
      socket.off('comanda:cuenta_pedida', onCuentaPedida)
      socket.off('comanda:actualizada', onComandaActualizada)
      socket.off('comanda:item_actualizado', onItemActualizado)
      socket.off('comanda:items_agregados', onItemsAgregados)
      socket.off('comanda:item_devuelto', onItemDevuelto)
    }
  }, [aplicarComandaRemota, aplicarItemRemoto, agregarToast])
}

// Al volver la conexión (WiFi que se cayó, servidor reiniciado): primero se envía lo que
// quedó en cola en este dispositivo y luego se recarga todo lo que pasó mientras tanto.
// Sin esto, una pantalla de Cocina/Bar que perdió señal se queda sin los pedidos nuevos.
export function useReconexion() {
  useEffect(() => {
    let primeraConexion = !socket.connected
    const resincronizar = async () => {
      await useComandasStore.getState().procesarCola()
      await Promise.all([
        useComandasStore.getState().cargarComandas(),
        useMesasStore.getState().cargarMesas(),
      ])
    }
    const onConnect = () => {
      if (primeraConexion) { primeraConexion = false; return }   // la carga inicial ya la hace App
      resincronizar()
    }
    const onOnline = () => { useComandasStore.getState().procesarCola() }

    socket.on('connect', onConnect)
    window.addEventListener('online', onOnline)
    // Respaldo: si hay pendientes, reintentar cada 10 s aunque no llegue ningún evento
    const intervalo = setInterval(() => {
      if (useComandasStore.getState().cola.length > 0) useComandasStore.getState().procesarCola()
    }, 10000)

    return () => {
      socket.off('connect', onConnect)
      window.removeEventListener('online', onOnline)
      clearInterval(intervalo)
    }
  }, [])
}
