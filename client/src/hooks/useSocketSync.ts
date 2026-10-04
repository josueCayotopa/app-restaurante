import { useEffect } from 'react'
import { socket } from '../lib/socket'
import { useComandasStore } from '../store/comandasStore'
import { useMesasStore } from '../store/mesasStore'
import { useToastStore } from '../store/toastStore'
import { reproducirAlerta } from '../lib/sound'
import type { Comanda, ItemComanda, TipoPlato, EstadoComanda } from '../types'

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
      if (data.item.estado === 'listo') {
        agregarToast({
          tipo: data.item.area === 'bar' ? 'bar' : 'cocina',
          titulo: `✅ Listo para servir${data.numeroMesa ? ` — Mesa ${data.numeroMesa}` : ''}`,
          mensaje: `${data.item.cantidad}× ${data.item.nombre} está listo`,
          duracion: 6000,
        })
        reproducirAlerta()
      }
    }

    const onItemsAgregados = (data: ItemsAgregadosPayload) => {
      aplicarComandaRemota(data.comanda)
      const esPropio = !!data.origenSocketId && data.origenSocketId === socket.id
      if (esPropio) return
      const mesa = `Mesa ${data.comanda.numeroMesa}`
      if (data.itemsCocina.length > 0) {
        agregarToast({
          tipo: 'cocina',
          titulo: data.nuevo ? `🍽 Ticket nuevo — ${mesa}` : `🍽 Adición — ${mesa}`,
          mensaje: data.itemsCocina.map(formatearItem).join(' · '),
          duracion: 6000,
        })
        reproducirAlerta()
      }
      if (data.itemsBar.length > 0) {
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
      if (esPropio) return
      agregarToast({
        tipo: data.item.area === 'bar' ? 'bar' : 'cocina',
        titulo: `↩ Devolución — Mesa ${data.numeroMesa}`,
        mensaje: `${data.item.cantidad}× ${data.item.nombre} ha sido devuelto`,
        duracion: 6000,
      })
      reproducirAlerta()
    }

    socket.on('comanda:actualizada', onComandaActualizada)
    socket.on('comanda:item_actualizado', onItemActualizado)
    socket.on('comanda:items_agregados', onItemsAgregados)
    socket.on('comanda:item_devuelto', onItemDevuelto)

    return () => {
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
