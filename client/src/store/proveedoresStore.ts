import { create } from 'zustand'
import { apiFetch } from '../lib/api'

export type EstadoOrden = 'borrador' | 'enviada' | 'aprobada' | 'recibida' | 'cancelada'
export type CategoriaProveedor = 'carnes' | 'pescados' | 'verduras' | 'bebidas' | 'abarrotes' | 'descartables' | 'general'

export interface Proveedor {
  id: string
  nombre: string
  ruc?: string | null
  contacto?: string | null
  telefono?: string | null
  email?: string | null
  direccion?: string | null
  categoria: CategoriaProveedor
  calificacion: number
  activo: boolean
}

export interface ItemOrden {
  id: string
  insumoId?: string | null   // si está vinculado, al recibir la orden suma stock en Inventario
  nombre: string
  unidad: string
  cantidad: number
  precioUnit: number
  subtotal: number
}

export interface OrdenCompra {
  id: string
  numero: number
  proveedorId: string
  proveedor: { id: string; nombre: string }
  estado: EstadoOrden
  items: ItemOrden[]
  total: number
  fecha: string
  fechaEntrega?: string | null
  recibidaEn?: string | null
  notas?: string | null
  creadoPor?: string | null
}

export type DatosProveedor = Omit<Proveedor, 'id' | 'activo'>
export interface DatosOrden {
  proveedorId: string
  fechaEntrega?: string
  notas?: string
  items: { nombre: string; unidad: string; cantidad: number; precioUnit: number; insumoId?: string | null }[]
}

interface ProveedoresState {
  proveedores: Proveedor[]
  ordenes: OrdenCompra[]
  cargado: boolean
  cargar:              () => Promise<void>
  agregarProveedor:    (p: DatosProveedor) => Promise<void>
  actualizarProveedor: (id: string, datos: DatosProveedor) => Promise<void>
  toggleActivo:        (id: string) => Promise<void>
  agregarOrden:        (o: DatosOrden) => Promise<void>
  cambiarEstadoOrden:  (id: string, estado: EstadoOrden) => Promise<void>
}

export const useProveedoresStore = create<ProveedoresState>((set, get) => ({
  proveedores: [],
  ordenes: [],
  cargado: false,

  cargar: async () => {
    const [proveedores, ordenes] = await Promise.all([
      apiFetch<Proveedor[]>('/api/proveedores'),
      apiFetch<OrdenCompra[]>('/api/proveedores/compras'),
    ])
    set({ proveedores, ordenes, cargado: true })
  },

  agregarProveedor: async (p) => {
    const nuevo = await apiFetch<Proveedor>('/api/proveedores', { method: 'POST', body: JSON.stringify(p) })
    set((s) => ({ proveedores: [...s.proveedores, nuevo].sort((a, b) => a.nombre.localeCompare(b.nombre)) }))
  },
  actualizarProveedor: async (id, datos) => {
    const act = await apiFetch<Proveedor>(`/api/proveedores/${id}`, { method: 'PATCH', body: JSON.stringify(datos) })
    set((s) => ({ proveedores: s.proveedores.map((p) => (p.id === id ? act : p)) }))
  },
  toggleActivo: async (id) => {
    const actual = get().proveedores.find((p) => p.id === id)
    if (!actual) return
    const act = await apiFetch<Proveedor>(`/api/proveedores/${id}`, { method: 'PATCH', body: JSON.stringify({ activo: !actual.activo }) })
    set((s) => ({ proveedores: s.proveedores.map((p) => (p.id === id ? act : p)) }))
  },

  agregarOrden: async (o) => {
    const nueva = await apiFetch<OrdenCompra>('/api/proveedores/compras', { method: 'POST', body: JSON.stringify(o) })
    set((s) => ({ ordenes: [nueva, ...s.ordenes] }))
  },
  cambiarEstadoOrden: async (id, estado) => {
    const act = await apiFetch<OrdenCompra>(`/api/proveedores/compras/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) })
    set((s) => ({ ordenes: s.ordenes.map((o) => (o.id === id ? act : o)) }))
  },
}))
