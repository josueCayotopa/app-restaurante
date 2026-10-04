// Carga inicial de las promociones de la Carta y de las categorías de productos.
// (Los platos de la carta salen de Producto.seccionCarta, ver src/lib/seccionesCarta.ts)
// Solo inserta si las tablas están vacías: no pisa lo que ya se editó desde la app.
// Uso: npm run db:seed-carta
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PROMOS = [
  { id: 'pnp',        nombre: 'PNP',         emoji: '👮', porcentaje: 10, condicion: 'Todos los días',  requisito: 'Estar de servicio o portar placa',                    color: 'steel' },
  { id: 'clases2026', nombre: 'Clases 2026', emoji: '🎓', porcentaje: 10, condicion: 'Lunes a viernes', requisito: 'Profesores: carné docente · Alumnos: uniforme puesto', color: 'gold'  },
  { id: 'cumpleaño',  nombre: 'Cumpleañero', emoji: '🎂', porcentaje: 50, condicion: 'Solo para ti',    requisito: 'Presentar DNI en físico',                              color: 'rojo'  },
]

// ids = valores que ya usa Producto.categoria
const CATEGORIAS = [
  { id: 'entradas', nombre: 'Entradas', emoji: '🥗',  color: 'rojo',     area: 'cocina', orden: 1 },
  { id: 'fondos',   nombre: 'Fondos',   emoji: '🍽️', color: 'gold',     area: 'cocina', orden: 2 },
  { id: 'bebidas',  nombre: 'Bebidas',  emoji: '🥤',  color: 'steel',    area: 'bar',    orden: 3 },
  { id: 'cocteles', nombre: 'Bar',      emoji: '🍺',  color: 'gold_osc', area: 'bar',    orden: 4 },
  { id: 'postres',  nombre: 'Postres',  emoji: '🍮',  color: 'rojo_osc', area: 'cocina', orden: 5 },
  { id: 'extras',   nombre: 'Extras',   emoji: '🍟',  color: 'gris',     area: 'cocina', orden: 6 },
]


async function main() {
  if ((await prisma.categoriaProducto.count()) === 0) {
    await prisma.categoriaProducto.createMany({ data: CATEGORIAS })
    console.log('✅ ' + CATEGORIAS.length + ' categorías de productos creadas')
  } else console.log('ℹ️  Categorías ya existentes, no se tocaron')

  if ((await prisma.promocion.count()) === 0) {
    await prisma.promocion.createMany({ data: PROMOS })
    console.log('✅ ' + PROMOS.length + ' promociones creadas')
  } else console.log('ℹ️  Promociones ya existentes, no se tocaron')

}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
