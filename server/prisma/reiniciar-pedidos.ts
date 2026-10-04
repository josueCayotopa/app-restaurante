// Reinicia la operación de pedidos: borra TODAS las comandas (con ítems y cuentas divididas),
// el historial de turnos, y deja todas las mesas en "libre".
// NO toca usuarios, carta, mesas, zonas, caja, inventario, proveedores ni reservas.
// Antes de borrar guarda un respaldo JSON en server/backups/.
// Uso: npm run db:reiniciar-pedidos -- --confirmar
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  if (!process.argv.includes('--confirmar')) {
    console.log('⚠️  Esto borra todos los pedidos y turnos y libera las mesas. Ejecuta con --confirmar.')
    return
  }

  const respaldo = {
    fecha: new Date().toISOString(),
    comandas: await prisma.comanda.findMany({ include: { items: true, cuentas: { include: { items: true } } } }),
    turnos: await prisma.turno.findMany(),
    estadoMesas: await prisma.mesa.findMany({ select: { id: true, numero: true, estado: true } }),
  }
  const dir = path.join(__dirname, '..', 'backups')
  fs.mkdirSync(dir, { recursive: true })
  const archivo = path.join(dir, `pedidos-${respaldo.fecha.replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(archivo, JSON.stringify(respaldo, null, 2))
  console.log(`💾 Respaldo: ${archivo}`)

  await prisma.$transaction([
    prisma.itemCuenta.deleteMany(),
    prisma.cuentaParcial.deleteMany(),
    prisma.itemComanda.deleteMany(),
    prisma.comanda.deleteMany(),
    prisma.turno.deleteMany(),
    prisma.mesa.updateMany({ data: { estado: 'libre' } }),
  ])

  console.log('✅ Pedidos reiniciados:', {
    comandas: await prisma.comanda.count(),
    turnos: await prisma.turno.count(),
    mesas: (await prisma.mesa.findMany({ select: { numero: true, estado: true } })).map((m) => `${m.numero}:${m.estado}`).join(' '),
  })
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
