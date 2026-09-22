import { create } from 'zustand'
import { apiFetch } from '../lib/api'
import { socket } from '../lib/socket'
import type {
  Comanda, ItemComanda, EstadoItem, EstadoComanda,
  CuentaParcial, MetodoPago, TipoDescuento, AreaProduccion,
} from '../types'

function recalcTotal(items: ItemComanda[]): number {
  return items
    .filter((i) => i.estado !== 'cancelado' && i.estado !== 'devuelto')
    .reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0)
}

interface ComandasState {
  comandas: Comanda[]
  comandaActiva: Comanda | null
  cargando: boolean

  cargarComandas:         () => Promise<void>
  setComandaActiva:       (comanda: Comanda | null) => void
  agregarComanda:         (comanda: Comanda) => Promise<void>
  actualizarEstadoItem:   (comandaId: string, itemId: string, estado: EstadoItem) => void
  actualizarEstadoComanda:(comandaId: string, estado: EstadoComanda) => void
  agregarItem:            (comandaId: string, item: ItemComanda) => void
  agregarItemsAComanda:   (comandaId: string, items: ItemComanda[]) => Promise<void>
  eliminarItem:           (comandaId: string, itemId: string) => void
  devolverItem:           (comandaId: string, itemId: string) => AreaProduccion | null
  actualizarDescuento:    (comandaId: string, descuento: TipoDescuento | undefined) => void
  actualizarNotaGeneral:  (comandaId: string, nota: string) => void
  getComandaByMesa:       (mesaId: string) => Comanda | undefined
  guardarCuentas:         (comandaId: string, cuentas: CuentaParcial[]) => void
  aplicarComandaRemota:   (comanda: Comanda) => void
  aplicarItemRemoto:      (comandaId: string, item: ItemComanda, comandaEstado?: EstadoComanda) => void
  pagarCuenta: (
    comandaId: string,
    cuentaId: string,
    metodoPago: MetodoPago,
    descuento: number,
    propina: number
  ) => boolean
}

export const useComandasStore = create<ComandasState>((set, get) => ({
  comandas: [],
  comandaActiva: null,
  cargando: false,

  cargarComandas: async () => {
    if (get().cargando) return
    set({ cargando: true })
    try {
      const comandas = await apiFetch<Comanda[]>('/api/comandas/activas')
      set({ comandas, cargando: false })
    } catch (e) {
      console.error('[comandas] Error cargando:', e)
      set({ cargando: false })
    }
  },

  setComandaActiva: (comanda) => set({ comandaActiva: comanda }),

  agregarComanda: async (comanda) => {
    const dto = {
      mesaId: comanda.mesaId,
      numeroMesa: comanda.numeroMesa,
      mozo: comanda.mozo,
      tipoDescuento: comanda.tipoDescuento,
      notaGeneral: comanda.notaGeneral,
      mesasUnidas: comanda.mesasUnidas,
      socketId: socket.id,
      items: comanda.items.map((i) => ({
        productoId: i.productoId,
        nombre: i.nombre,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        nota: i.nota,
        area: i.area,
        tipoPlato: i.tipoPlato,
        guarniciones: i.guarniciones,
      })),
    }
    const created = await apiFetch<Comanda>('/api/comandas', {
      method: 'POST',
      body: JSON.stringify(dto),
    })
    set((s) => ({ comandas: [...s.comandas, created] }))
  },

  actualizarEstadoItem: (comandaId, itemId, estado) => {
    set((s) => ({
      comandas: s.comandas.map((c) => {
        if (c.id !== comandaId) return c
        const items = c.items.map((i) => (i.id === itemId ? { ...i, estado } : i))
        // Si el primer ítem arranca a prepararse, la comanda entera pasa de
        // "enviada_cocina" a "en_preparacion" (si no, la tarjeta del KDS se
        // queda pegada en "Nuevas" aunque los ítems ya estén cocinándose).
        const nuevoEstado = estado === 'en_preparacion' && c.estado === 'enviada_cocina' ? 'en_preparacion' : c.estado
        return { ...c, items, estado: nuevoEstado, actualizadaEn: new Date().toISOString() }
      }),
    }))
    apiFetch(`/api/comandas/${comandaId}/items/${itemId}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado, socketId: socket.id }),
    }).catch((e) => console.error('[items] Error actualizando estado:', e))
  },

  actualizarEstadoComanda: (comandaId, estado) => {
    set((s) => ({
      comandas: s.comandas.map((c) =>
        c.id === comandaId ? { ...c, estado, actualizadaEn: new Date().toISOString() } : c
      ),
    }))
    apiFetch(`/api/comandas/${comandaId}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado }),
    }).catch((e) => console.error('[comandas] Error actualizando estado:', e))
  },

  agregarItem: (comandaId, item) =>
    set((s) => ({
      comandas: s.comandas.map((c) => {
        if (c.id !== comandaId) return c
        const items = [...c.items, item]
        return { ...c, items, total: recalcTotal(items), actualizadaEn: new Date().toISOString() }
      }),
    })),

  agregarItemsAComanda: async (comandaId, nuevosItems) => {
    // Optimistic update
    set((s) => ({
      comandas: s.comandas.map((c) => {
        if (c.id !== comandaId) return c
        const items = [...c.items, ...nuevosItems]
        return {
          ...c,
          items,
          total: recalcTotal(items),
          estado: 'enviada_cocina' as EstadoComanda,
          actualizadaEn: new Date().toISOString(),
        }
      }),
    }))
    try {
      const comanda = await apiFetch<Comanda>(`/api/comandas/${comandaId}/items/batch`, {
        method: 'POST',
        body: JSON.stringify({
          socketId: socket.id,
          items: nuevosItems.map((i) => ({
            productoId: i.productoId,
            nombre: i.nombre,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
            nota: i.nota,
            area: i.area,
            tipoPlato: i.tipoPlato,
            guarniciones: i.guarniciones,
          })),
        }),
      })
      // Sync con respuesta del servidor
      set((s) => ({
        comandas: s.comandas.map((c) => (c.id === comandaId ? comanda : c)),
      }))
    } catch (e) {
      console.error('[items] Error en batch:', e)
      throw e
    }
  },

  eliminarItem: (comandaId, itemId) =>
    set((s) => ({
      comandas: s.comandas.map((c) => {
        if (c.id !== comandaId) return c
        const items = c.items.filter((i) => i.id !== itemId)
        return { ...c, items, total: recalcTotal(items), actualizadaEn: new Date().toISOString() }
      }),
    })),

  devolverItem: (comandaId, itemId) => {
    let area: AreaProduccion | null = null
    set((s) => ({
      comandas: s.comandas.map((c) => {
        if (c.id !== comandaId) return c
        const items = c.items.map((i) => {
          if (i.id !== itemId) return i
          area = i.area
          return { ...i, estado: 'devuelto' as EstadoItem }
        })
        return { ...c, items, total: recalcTotal(items), actualizadaEn: new Date().toISOString() }
      }),
    }))
    apiFetch(`/api/comandas/${comandaId}/items/${itemId}/devolver`, {
      method: 'PATCH',
      body: JSON.stringify({ socketId: socket.id }),
    }).catch((e) => console.error('[devolucion] Error:', e))
    return area
  },

  actualizarDescuento: (comandaId, descuento) => {
    set((s) => ({
      comandas: s.comandas.map((c) =>
        c.id === comandaId ? { ...c, tipoDescuento: descuento, actualizadaEn: new Date().toISOString() } : c
      ),
    }))
    apiFetch(`/api/comandas/${comandaId}/descuento`, {
      method: 'PATCH',
      body: JSON.stringify({ tipoDescuento: descuento ?? null }),
    }).catch((e) => console.error('[descuento] Error:', e))
  },

  actualizarNotaGeneral: (comandaId, nota) => {
    set((s) => ({
      comandas: s.comandas.map((c) =>
        c.id === comandaId ? { ...c, notaGeneral: nota || undefined, actualizadaEn: new Date().toISOString() } : c
      ),
    }))
    apiFetch(`/api/comandas/${comandaId}/nota`, {
      method: 'PATCH',
      body: JSON.stringify({ notaGeneral: nota || null }),
    }).catch((e) => console.error('[nota] Error:', e))
  },

  getComandaByMesa: (mesaId) =>
    get().comandas.find(
      (c) => c.mesaId === mesaId && c.estado !== 'cerrada' && c.estado !== 'cancelada'
    ),

  guardarCuentas: (comandaId, cuentas) =>
    set((s) => ({
      comandas: s.comandas.map((c) =>
        c.id === comandaId ? { ...c, cuentas, actualizadaEn: new Date().toISOString() } : c
      ),
    })),

  pagarCuenta: (comandaId, cuentaId, metodoPago, descuento, propina) => {
    let todasPagadas = false
    set((s) => ({
      comandas: s.comandas.map((c) => {
        if (c.id !== comandaId || !c.cuentas) return c
        const cuentasActualizadas = c.cuentas.map((ct) => {
          if (ct.id !== cuentaId) return ct
          const total = ct.subtotal * (1 - descuento / 100) + propina
          return { ...ct, metodoPago, descuento, propina, total, estado: 'pagada' as const, pagadoEn: new Date().toISOString() }
        })
        todasPagadas = cuentasActualizadas.every((ct) => ct.estado === 'pagada')
        return {
          ...c,
          cuentas: cuentasActualizadas,
          estado: todasPagadas ? ('cerrada' as const) : c.estado,
          actualizadaEn: new Date().toISOString(),
        }
      }),
    }))
    return todasPagadas
  },

  aplicarComandaRemota: (comanda) =>
    set((s) => {
      const existe = s.comandas.some((c) => c.id === comanda.id)
      return {
        comandas: existe
          ? s.comandas.map((c) => (c.id === comanda.id ? comanda : c))
          : [...s.comandas, comanda],
      }
    }),

  aplicarItemRemoto: (comandaId, item, comandaEstado) =>
    set((s) => ({
      comandas: s.comandas.map((c) => {
        if (c.id !== comandaId) return c
        const existe = c.items.some((i) => i.id === item.id)
        const items = existe ? c.items.map((i) => (i.id === item.id ? item : i)) : [...c.items, item]
        return {
          ...c,
          items,
          total: recalcTotal(items),
          estado: comandaEstado ?? c.estado,
          actualizadaEn: new Date().toISOString(),
        }
      }),
    })),
}))
