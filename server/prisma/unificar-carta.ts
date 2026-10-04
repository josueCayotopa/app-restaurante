// Migración única: la Carta pública pasa a armarse desde Producto.
// Asigna seccionCarta/ordenCarta a cada producto (respetando el orden de la carta
// antigua y copiando sus fotos). Solo toca productos sin sección: se puede re-ejecutar.
// Uso: npm run db:unificar-carta
import { PrismaClient } from '@prisma/client'
import { asignarSeccionesCarta } from '../src/lib/seccionesCarta'

const prisma = new PrismaClient()

async function main() {
  const cartaAntigua = await prisma.itemCarta.findMany()
  const n = await asignarSeccionesCarta(prisma, cartaAntigua)
  console.log(`✅ ${n} productos ubicados en la carta`)
  const sinSeccion = await prisma.producto.findMany({ where: { seccionCarta: null }, select: { nombre: true } })
  if (sinSeccion.length) console.log('ℹ️  Sin sección (no salen en la carta):', sinSeccion.map((p) => p.nombre).join(', '))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
