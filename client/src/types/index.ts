export type MetodoPago = 'efectivo' | 'tarjeta' | 'yape_plin' | 'mixto'

export interface ItemCuenta {
  itemComandaId: string
  nombre: string
  cantidad: number
  precioUnitario: number
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
  | 'en_limpieza'
  | 'unida'

export type Zona = 'salon' | 'terraza' | 'barra' | 'vip'

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

export type TipoDescuento = 'pnp' | 'cumpleaño' | 'clases2026'

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
  mesaId: string
  numeroMesa: number
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
}

export type CategoriaProducto =
  | 'entradas'
  | 'fondos'
  | 'bebidas'
  | 'cocteles'
  | 'postres'
  | 'extras'

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
}
