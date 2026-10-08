export type MetodoPago = 'efectivo' | 'tarjeta' | 'yape_plin' | 'mixto'

export interface ItemCuenta {
  itemComandaId: string
  nombre: string
  cantidad: number
  precioUnitario: number
  subtotal?: number
}

export interface CuentaParcial {
  id: string
  numero: number
  items: ItemCuenta[]
  subtotal: number
  descuento: number
  propina: number
  total: number
  metodoPago?: MetodoPago
  estado: 'pendiente' | 'pagada'
  pagadoEn?: string
}

export type EstadoMesa =
  | 'libre'
  | 'ocupada'
  | 'reservada'
  | 'esperando_pago'
  | 'unida'

// Antes era un union fijo ('salon'|'terraza'|'barra'|'vip'); ahora las zonas
// son gestionables (ver zonasStore.ts / GET /api/zonas), así que es texto libre.
export type Zona = string

export interface Mesa {
  id: string
  numero: number
  capacidad: number
  zona: Zona
  estado: EstadoMesa
  comandaActualId?: string
  posX: number
  posY: number
  mesasUnidasIds?: string[]
  mesaPrincipalId?: string
}

export type EstadoItem =
  | 'pendiente'
  | 'en_preparacion'
  | 'listo'
  | 'servido'
  | 'cancelado'
  | 'devuelto'

// id de una Promocion (gestionadas desde la Carta: /api/carta/promociones)
export type TipoDescuento = string

export type EstadoComanda =
  | 'abierta'
  | 'enviada_cocina'
  | 'en_preparacion'
  | 'lista'
  | 'cerrada'
  | 'cancelada'

export type AreaProduccion = 'cocina' | 'bar'

export interface ItemComanda {
  id: string
  productoId: string
  nombre: string
  cantidad: number
  precioUnitario: number
  nota?: string
  estado: EstadoItem
  area: AreaProduccion
  tipoPlato?: TipoPlato
  guarniciones?: string[]
}

export interface Comanda {
  id: string
  numero?: number
  // "mesa": cuenta de una mesa · "pedido": pedido por teléfono (sin mesa; numeroMesa = 0)
  tipo?: 'mesa' | 'pedido'
  mesaId: string | null
  numeroMesa: number
  clienteNombre?: string | null
  clienteTelefono?: string | null
  modalidad?: 'local' | 'llevar' | 'delivery'
  paraLlevar?: boolean
  descartable?: number
  horaRecojo?: string | null
  entregadaEn?: string | null
  motivoCancelacion?: string | null
  mesasUnidas?: number[]
  estado: EstadoComanda
  items: ItemComanda[]
  mozo: string
  creadaEn: string
  actualizadaEn: string
  total: number
  cuentas?: CuentaParcial[]
  tipoDescuento?: TipoDescuento
  notaGeneral?: string
  // Cobro (lo llena el servidor al cobrar en Caja)
  metodoPago?: MetodoPago | 'dividida' | null
  subtotal?: number | null
  descuentoPct?: number
  descuentoMonto?: number
  propina?: number
  totalCobrado?: number | null
  montoEfectivo?: number | null
  metodoResto?: 'tarjeta' | 'yape_plin' | null
  montoRecibido?: number | null
  vuelto?: number | null
  cobradaEn?: string | null
  cobradaPor?: string | null
}

// id de una categoría gestionada desde Productos (/api/categorias)
export type CategoriaProducto = string

export type TipoPlato = 'plato' | 'fuente'

export const MAX_GUARNICIONES: Record<TipoPlato, number> = { plato: 3, fuente: 4 }

export interface Producto {
  id: string
  nombre: string
  descripcion?: string
  precio: number
  categoria: CategoriaProducto
  disponible: boolean
  imagen?: string
  tiempoPreparacion?: number
  esAlcoholico?: boolean
  tieneGuarnicion?: boolean
  guarnicionesDisponibles?: string[]
  seccionCarta?: string | null   // sección de la carta pública (null = no sale en la carta)
  ordenCarta?: number
}

// ─── Reportes (GET /api/reportes/resumen) ────────────────────────────────────
// Ventas netas = subtotal − descuentos (sin propinas). Fechas = día de cobro.
export interface ResumenReporte {
  desde: string
  hasta: string
  dias: number
  totales: {
    pedidos: number
    subtotal: number
    descuentos: number
    ventasNetas: number
    propinas: number
    cobrado: number
    ticketPromedio: number
    itemsVendidos: number
    cancelados: number
    montoCancelado: number
  }
  porMetodo: { efectivo: number; tarjeta: number; yape_plin: number }
  porDia: { fecha: string; pedidos: number; ventas: number }[]
  porHora: { hora: number; pedidos: number; ventas: number }[]
  porMozo: { mozo: string; pedidos: number; ventas: number }[]
  topProductos: { nombre: string; cantidad: number; ventas: number }[]
  porCategoria: { categoria: string; cantidad: number; ventas: number }[]
  descuentos: { promocion: string; pedidos: number; monto: number }[]
}
