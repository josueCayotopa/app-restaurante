import { create } from 'zustand'
import { apiFetch, esErrorDeRed, ApiError } from '../lib/api'
import { socket } from '../lib/socket'
import { generarId } from '../lib/id'
import { useToastStore } from './toastStore'
import type {
  Comanda, ItemComanda, EstadoItem, EstadoComanda,
  MetodoPago, TipoDescuento, AreaProduccion,
} from '../types'

// Ítem tal como lo espera la API (con su id, para que un reenvío no lo duplique)
function itemDto(i: ItemComanda) {
  return {
    id: i.id,
    productoId: i.productoId,
    nombre: i.nombre,
    cantidad: i.cantidad,
    precioUnitario: i.precioUnitario,
    nota: i.nota,
    area: i.area,
    tipoPlato: i.tipoPlato,
    guarniciones: i.guarniciones,
  }
}

function recalcTotal(items: ItemComanda[]): number {
  return items
    .filter((i) => i.estado !== 'cancelado' && i.estado !== 'devuelto')
    .reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0)
}

// ── Cola de envío (WiFi intermitente) ────────────────────────────────────────
// Si una operación falla por red, se guarda en el dispositivo y se reintenta sola al
// volver la conexión. El servidor es idempotente (ids generados aquí), así que un
// reenvío nunca duplica un pedido. "efecto" es el cambio local que se mantiene
// visible mientras la operación espera (y se reaplica si se recarga la lista).
type Efecto =
  | { tipo: 'crear'; comanda: Comanda }
  | { tipo: 'items'; comandaId: string; items: ItemComanda[] }
  | { tipo: 'estadoItem'; comandaId: string; itemId: string; estado: EstadoItem }
  | { tipo: 'estadoComanda'; comandaId: string; estado: EstadoComanda }

export interface OpCola {
  id: string
  metodo: 'POST' | 'PATCH'
  ruta: string
  body: Record<string, unknown>
  efecto: Efecto
  creadaEn: string
}

export type ResultadoEnvio = 'enviado' | 'en_cola'

const CLAVE_COLA = 'sgr_cola_envio'

function leerCola(): OpCola[] {
  try { return JSON.parse(localStorage.getItem(CLAVE_COLA) ?? '[]') } catch { return [] }
}
function guardarCola(cola: OpCola[]) {
  try { localStorage.setItem(CLAVE_COLA, JSON.stringify(cola)) } catch { /* sin almacenamiento */ }
}

function aplicarEfecto(comandas: Comanda[], ef: Efecto): Comanda[] {
  const ahora = new Date().toISOString()
  switch (ef.tipo) {
    case 'crear':
      return comandas.some((c) => c.id === ef.comanda.id) ? comandas : [...comandas, ef.comanda]
    case 'items':
      return comandas.map((c) => {
        if (c.id !== ef.comandaId) return c
        const nuevos = ef.items.filter((i) => !c.items.some((x) => x.id === i.id))
        if (nuevos.length === 0) return c
        const items = [...c.items, ...nuevos]
        return { ...c, items, total: recalcTotal(items), estado: 'enviada_cocina' as EstadoComanda, actualizadaEn: ahora }
      })
    case 'estadoItem':
      return comandas.map((c) => {
        if (c.id !== ef.comandaId) return c
        const items = c.items.map((i) => (i.id === ef.itemId ? { ...i, estado: ef.estado } : i))
        // Si el primer ítem arranca a prepararse, la comanda entera pasa de
        // "enviada_cocina" a "en_preparacion" (si no, la tarjeta del KDS se
        // queda pegada en "Nuevas" aunque los ítems ya estén cocinándose).
        const estado = ef.estado === 'en_preparacion' && c.estado === 'enviada_cocina' ? 'en_preparacion' : c.estado
        return { ...c, items, estado, actualizadaEn: ahora }
      })
    case 'estadoComanda':
      return comandas.map((c) => (c.id === ef.comandaId ? { ...c, estado: ef.estado, actualizadaEn: ahora } : c))
  }
}

interface ComandasState {
  comandas: Comanda[]
  comandaActiva: Comanda | null
  cargando: boolean
  cola: OpCola[]
  procesandoCola: boolean

  enviarOEncolar:         (op: Omit<OpCola, 'id' | 'creadaEn'>) => Promise<ResultadoEnvio>
  procesarCola:           () => Promise<void>

  cargarComandas:         () => Promise<void>
  setComandaActiva:       (comanda: Comanda | null) => void
  agregarComanda:         (comanda: Comanda) => Promise<ResultadoEnvio>
  crearPedido:            (pedido: Comanda) => Promise<ResultadoEnvio>
  entregarPedido:         (id: string) => Promise<Comanda>
  cancelarPedido:         (id: string, motivo: string) => Promise<Comanda & { reembolso: number }>
  actualizarEstadoItem:   (comandaId: string, itemId: string, estado: EstadoItem) => void
  actualizarEstadoComanda:(comandaId: string, estado: EstadoComanda) => void
  agregarItem:            (comandaId: string, item: ItemComanda) => void
  agregarItemsAComanda:   (comandaId: string, items: ItemComanda[]) => Promise<ResultadoEnvio>
  eliminarItem:           (comandaId: string, itemId: string) => void
  anularItem:             (comandaId: string, itemId: string) => Promise<void>
  devolverItem:           (comandaId: string, itemId: string) => AreaProduccion | null
  actualizarDescuento:    (comandaId: string, descuento: TipoDescuento | undefined) => void
  actualizarNotaGeneral:  (comandaId: string, nota: string) => void
  getComandaByMesa:       (mesaId: string) => Comanda | undefined
  cobrarComanda:          (comandaId: string, pago: DatosCobro) => Promise<Comanda>
  dividirCuenta:          (comandaId: string, cuentas: { numero: number; items: { itemComandaId: string; cantidad: number }[] }[]) => Promise<Comanda>
  pagarCuenta:            (comandaId: string, cuentaId: string, pago: { metodoPago: MetodoPago; descuento: number; propina: number }) => Promise<Comanda>
  aplicarComandaRemota:   (comanda: Comanda) => void
  aplicarItemRemoto:      (comandaId: string, item: ItemComanda, comandaEstado?: EstadoComanda) => void
}

// Lo que manda Caja al cobrar; el servidor recalcula montos y valida
export interface DatosCobro {
  metodoPago: MetodoPago
  descuentoPct: number
  propina: number
  montoRecibido?: number      // efectivo: lo que entregó el cliente (vacío = exacto)
  montoEfectivo?: number      // mixto: parte en efectivo
  metodoResto?: 'tarjeta' | 'yape_plin'
}

export const useComandasStore = create<ComandasState>((set, get) => ({
  comandas: [],
  comandaActiva: null,
  cargando: false,
  cola: leerCola(),
  procesandoCola: false,

  // Envía ya; si no hay red, deja la operación en cola (y su efecto visible localmente)
  enviarOEncolar: async (op) => {
    set((s) => ({ comandas: aplicarEfecto(s.comandas, op.efecto) }))
    // Si ya hay operaciones esperando, esta va detrás para respetar el orden
    if (get().cola.length === 0) {
      try {
        const resp = await apiFetch<unknown>(op.ruta, { method: op.metodo, body: JSON.stringify({ ...op.body, socketId: socket.id }) })
        if (op.efecto.tipo === 'crear' || op.efecto.tipo === 'items') get().aplicarComandaRemota(resp as Comanda)
        return 'enviado'
      } catch (e) {
        if (!esErrorDeRed(e)) throw e
      }
    }
    const nueva: OpCola = { ...op, id: generarId(), creadaEn: new Date().toISOString() }
    set((s) => ({ cola: [...s.cola, nueva] }))
    guardarCola(get().cola)
    return 'en_cola'
  },

  procesarCola: async () => {
    if (get().procesandoCola || get().cola.length === 0) return
    set({ procesandoCola: true })
    try {
      while (get().cola.length > 0) {
        const op = get().cola[0]
        try {
          const resp = await apiFetch<unknown>(op.ruta, { method: op.metodo, body: JSON.stringify({ ...op.body, socketId: socket.id }) })
          if (op.efecto.tipo === 'crear' || op.efecto.tipo === 'items') get().aplicarComandaRemota(resp as Comanda)
        } catch (e) {
          if (esErrorDeRed(e)) break   // sigue sin red: se reintenta después
          // El servidor la rechazó (ej. la mesa ya no existe): se descarta para no trabar la cola
          useToastStore.getState().agregar({
            tipo: 'error',
            titulo: 'No se pudo sincronizar',
            mensaje: e instanceof ApiError ? e.message : 'Una operación pendiente fue rechazada',
            duracion: 8000,
          })
        }
        set((s) => ({ cola: s.cola.filter((x) => x.id !== op.id) }))
        guardarCola(get().cola)
      }
    } finally {
      set({ procesandoCola: false })
    }
  },

  cargarComandas: async () => {
    if (get().cargando) return
    set({ cargando: true })
    try {
      const delServidor = await apiFetch<Comanda[]>('/api/comandas/activas')
      // Lo que aún espera en la cola sigue visible aunque el servidor no lo tenga todavía
      const comandas = get().cola.reduce((acc, op) => aplicarEfecto(acc, op.efecto), delServidor)
      set({ comandas, cargando: false })
    } catch (e) {
      console.error('[comandas] Error cargando:', e)
      set({ cargando: false })
    }
  },

  setComandaActiva: (comanda) => set({ comandaActiva: comanda }),

  agregarComanda: async (comanda) => {
    const body = {
      id: comanda.id,
      mesaId: comanda.mesaId,
      numeroMesa: comanda.numeroMesa,
      mozo: comanda.mozo,
      tipoDescuento: comanda.tipoDescuento,
      notaGeneral: comanda.notaGeneral,
      mesasUnidas: comanda.mesasUnidas,
      items: comanda.items.map(itemDto),
    }
    return get().enviarOEncolar({ metodo: 'POST', ruta: '/api/comandas', body, efecto: { tipo: 'crear', comanda } })
  },

  // Pedido por teléfono: mismo envío con cola offline (el id lo hace idempotente)
  crearPedido: async (pedido) => {
    const body = {
      id: pedido.id,
      clienteNombre: pedido.clienteNombre,
      clienteTelefono: pedido.clienteTelefono,
      paraLlevar: pedido.paraLlevar,
      horaRecojo: pedido.horaRecojo,
      tipoDescuento: pedido.tipoDescuento,
      notaGeneral: pedido.notaGeneral,
      items: pedido.items.map(itemDto),
    }
    return get().enviarOEncolar({ metodo: 'POST', ruta: '/api/comandas/pedidos', body, efecto: { tipo: 'crear', comanda: pedido } })
  },

  entregarPedido: async (id) => {
    const comanda = await apiFetch<Comanda>(`/api/comandas/${id}/entregar`, { method: 'POST', body: '{}' })
    get().aplicarComandaRemota(comanda)
    return comanda
  },

  cancelarPedido: async (id, motivo) => {
    const comanda = await apiFetch<Comanda & { reembolso: number }>(`/api/comandas/${id}/cancelar`, { method: 'POST', body: JSON.stringify({ motivo }) })
    get().aplicarComandaRemota(comanda)
    return comanda
  },

  actualizarEstadoItem: (comandaId, itemId, estado) => {
    get().enviarOEncolar({
      metodo: 'PATCH',
      ruta: `/api/comandas/${comandaId}/items/${itemId}/estado`,
      body: { estado },
      efecto: { tipo: 'estadoItem', comandaId, itemId, estado },
    }).catch((e) => console.error('[items] Error actualizando estado:', e))
  },

  actualizarEstadoComanda: (comandaId, estado) => {
    get().enviarOEncolar({
      metodo: 'PATCH',
      ruta: `/api/comandas/${comandaId}/estado`,
      body: { estado },
      efecto: { tipo: 'estadoComanda', comandaId, estado },
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

  agregarItemsAComanda: async (comandaId, nuevosItems) =>
    get().enviarOEncolar({
      metodo: 'POST',
      ruta: `/api/comandas/${comandaId}/items/batch`,
      body: { items: nuevosItems.map(itemDto) },
      efecto: { tipo: 'items', comandaId, items: nuevosItems },
    }),

  // Quitar un plato ya enviado que la cocina/bar aún no aceptó (el servidor lo valida)
  anularItem: async (comandaId, itemId) => {
    const item = await apiFetch<ItemComanda>(`/api/comandas/${comandaId}/items/${itemId}/anular`, { method: 'POST', body: JSON.stringify({ socketId: socket.id }) })
    get().aplicarItemRemoto(comandaId, item)
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

  // Cobro y cuenta dividida van directo al servidor (sin cola): Caja debe ver el error al momento
  cobrarComanda: async (comandaId, pago) => {
    const comanda = await apiFetch<Comanda>(`/api/comandas/${comandaId}/cobrar`, { method: 'POST', body: JSON.stringify(pago) })
    get().aplicarComandaRemota(comanda)
    return comanda
  },

  dividirCuenta: async (comandaId, cuentas) => {
    const comanda = await apiFetch<Comanda>(`/api/comandas/${comandaId}/cuentas`, { method: 'POST', body: JSON.stringify({ cuentas }) })
    get().aplicarComandaRemota(comanda)
    return comanda
  },

  pagarCuenta: async (comandaId, cuentaId, pago) => {
    const comanda = await apiFetch<Comanda>(`/api/comandas/${comandaId}/cuentas/${cuentaId}/pagar`, { method: 'PATCH', body: JSON.stringify(pago) })
    get().aplicarComandaRemota(comanda)
    return comanda
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
