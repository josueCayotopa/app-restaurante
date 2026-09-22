import { create } from 'zustand'

export type EstadoOrden = 'borrador' | 'enviada' | 'aprobada' | 'recibida' | 'cancelada'
export type CategoriaProveedor = 'carnes' | 'pescados' | 'verduras' | 'bebidas' | 'abarrotes' | 'descartables' | 'general'

export interface Proveedor {
  id: string
  nombre: string
  ruc: string
  contacto: string
  telefono: string
  email: string
  categoria: CategoriaProveedor
  direccion?: string
  activo: boolean
  calificacion: 1 | 2 | 3 | 4 | 5
}

export interface ItemOrden {
  id: string
  insumoNombre: string
  unidad: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export interface OrdenCompra {
  id: string
  proveedorId: string
  proveedorNombre: string
  estado: EstadoOrden
  items: ItemOrden[]
  total: number
  fechaCreacion: string
  fechaEntrega?: string
  notas?: string
  creadoPor: string
}

const proveedoresIniciales: Proveedor[] = [
  { id: 'pv1', nombre: 'Pesquera del Norte SAC', ruc: '20451234567', contacto: 'Roberto Silva', telefono: '944123456', email: 'ventas@pesqueradelnorte.pe', categoria: 'pescados', direccion: 'Av. La Marina 450, Callao', activo: true, calificacion: 5 },
  { id: 'pv2', nombre: 'Frigorífico San Pedro', ruc: '20567891234', contacto: 'Carmen Ríos', telefono: '955234567', email: 'pedidos@frigorifisanpedro.pe', categoria: 'carnes', direccion: 'Calle Los Álamos 123, SMP', activo: true, calificacion: 4 },
  { id: 'pv3', nombre: 'Avícola El Buen Pollo', ruc: '20312345678', contacto: 'Jorge Mendoza', telefono: '966345678', email: 'jorge@elbuenpollo.com', categoria: 'carnes', activo: true, calificacion: 4 },
  { id: 'pv4', nombre: 'Mercado Mayorista Frutas', ruc: '10234567890', contacto: 'Ana Torres', telefono: '977456789', email: 'ana.torres@gmail.com', categoria: 'verduras', direccion: 'Mercado Mayorista, Ate', activo: true, calificacion: 3 },
  { id: 'pv5', nombre: 'Coca-Cola FEMSA Perú', ruc: '20100047218', contacto: 'Ventas FEMSA', telefono: '01-6123456', email: 'ventaspe@femsa.com', categoria: 'bebidas', activo: true, calificacion: 5 },
  { id: 'pv6', nombre: 'Backus & Johnston', ruc: '20100113612', contacto: 'Dist. Lima Norte', telefono: '01-7123456', email: 'distribución@backus.pe', categoria: 'bebidas', activo: true, calificacion: 5 },
  { id: 'pv7', nombre: 'Alicorp SAA', ruc: '20100055237', contacto: 'Canal Moderno', telefono: '01-3152200', email: 'canal@alicorp.pe', categoria: 'abarrotes', activo: true, calificacion: 4 },
  { id: 'pv8', nombre: 'Descartables del Pacífico', ruc: '20456789012', contacto: 'Luis Vega', telefono: '988567890', email: 'ventas@descartablespacifico.com', categoria: 'descartables', activo: false, calificacion: 3 },
]

const ordenesIniciales: OrdenCompra[] = [
  {
    id: 'oc1', proveedorId: 'pv1', proveedorNombre: 'Pesquera del Norte SAC',
    estado: 'recibida', creadoPor: 'Admin',
    fechaCreacion: new Date(Date.now() - 3 * 86400000).toISOString(),
    fechaEntrega: new Date(Date.now() - 1 * 86400000).toISOString(),
    total: 550,
    items: [
      { id: 'io1', insumoNombre: 'Filete de pescado', unidad: 'kg', cantidad: 20, precioUnitario: 22, subtotal: 440 },
      { id: 'io2', insumoNombre: 'Camarones frescos', unidad: 'kg', cantidad: 5, precioUnitario: 22, subtotal: 110 },
    ],
  },
  {
    id: 'oc2', proveedorId: 'pv2', proveedorNombre: 'Frigorífico San Pedro',
    estado: 'aprobada', creadoPor: 'Admin',
    fechaCreacion: new Date(Date.now() - 1 * 86400000).toISOString(),
    fechaEntrega: new Date(Date.now() + 1 * 86400000).toISOString(),
    notas: 'Entregar antes del mediodía',
    total: 420,
    items: [
      { id: 'io3', insumoNombre: 'Lomo de res', unidad: 'kg', cantidad: 10, precioUnitario: 35, subtotal: 350 },
      { id: 'io4', insumoNombre: 'Costillas de res', unidad: 'kg', cantidad: 7, precioUnitario: 10, subtotal: 70 },
    ],
  },
  {
    id: 'oc3', proveedorId: 'pv5', proveedorNombre: 'Coca-Cola FEMSA Perú',
    estado: 'enviada', creadoPor: 'Carlos',
    fechaCreacion: new Date().toISOString(),
    total: 270,
    items: [
      { id: 'io5', insumoNombre: 'Inca Kola 1.5L', unidad: 'caja x12', cantidad: 5, precioUnitario: 54, subtotal: 270 },
    ],
  },
  {
    id: 'oc4', proveedorId: 'pv7', proveedorNombre: 'Alicorp SAA',
    estado: 'borrador', creadoPor: 'Admin',
    fechaCreacion: new Date().toISOString(),
    total: 192,
    items: [
      { id: 'io6', insumoNombre: 'Arroz largo', unidad: 'saco 50kg', cantidad: 2, precioUnitario: 96, subtotal: 192 },
    ],
  },
]

interface ProveedoresState {
  proveedores: Proveedor[]
  ordenes: OrdenCompra[]
  agregarProveedor: (p: Proveedor) => void
  actualizarProveedor: (id: string, datos: Partial<Proveedor>) => void
  toggleActivo: (id: string) => void
  agregarOrden: (o: OrdenCompra) => void
  cambiarEstadoOrden: (id: string, estado: EstadoOrden) => void
  agregarItemOrden: (ordenId: string, item: ItemOrden) => void
}

export const useProveedoresStore = create<ProveedoresState>((set) => ({
  proveedores: proveedoresIniciales,
  ordenes: ordenesIniciales,
  agregarProveedor: (p) => set((s) => ({ proveedores: [...s.proveedores, p] })),
  actualizarProveedor: (id, datos) =>
    set((s) => ({ proveedores: s.proveedores.map((p) => (p.id === id ? { ...p, ...datos } : p)) })),
  toggleActivo: (id) =>
    set((s) => ({ proveedores: s.proveedores.map((p) => (p.id === id ? { ...p, activo: !p.activo } : p)) })),
  agregarOrden: (o) => set((s) => ({ ordenes: [o, ...s.ordenes] })),
  cambiarEstadoOrden: (id, estado) =>
    set((s) => ({ ordenes: s.ordenes.map((o) => (o.id === id ? { ...o, estado } : o)) })),
  agregarItemOrden: (ordenId, item) =>
    set((s) => ({
      ordenes: s.ordenes.map((o) =>
        o.id === ordenId
          ? { ...o, items: [...o.items, item], total: o.total + item.subtotal }
          : o
      ),
    })),
}))
