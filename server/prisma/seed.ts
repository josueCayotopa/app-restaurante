import { PrismaClient } from '@prisma/client'
import { asignarSeccionesCarta } from '../src/lib/seccionesCarta'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Sembrando datos iniciales...')

  // ── Usuarios ──────────────────────────────────────────────────────────
  const hash = await bcrypt.hash('admin123', 10)
  await prisma.usuario.upsert({
    where: { email: 'admin@cade.pe' },
    update: {},
    create: { nombre: 'Administrador', email: 'admin@cade.pe', password: hash, rol: 'admin' },
  })
  await prisma.usuario.upsert({
    where: { email: 'carlos@cade.pe' },
    update: {},
    create: { nombre: 'Carlos López', email: 'carlos@cade.pe', password: await bcrypt.hash('mozo123', 10), rol: 'mozo' },
  })
  await prisma.usuario.upsert({
    where: { email: 'ana@cade.pe' },
    update: {},
    create: { nombre: 'Ana García', email: 'ana@cade.pe', password: await bcrypt.hash('mozo123', 10), rol: 'mozo' },
  })
  await prisma.usuario.upsert({
    where: { email: 'luis@cade.pe' },
    update: {},
    create: { nombre: 'Luis Torres', email: 'luis@cade.pe', password: await bcrypt.hash('cocina123', 10), rol: 'cocinero' },
  })
  await prisma.usuario.upsert({
    where: { email: 'rosa@cade.pe' },
    update: {},
    create: { nombre: 'Rosa Mendoza', email: 'rosa@cade.pe', password: await bcrypt.hash('caja123', 10), rol: 'cajero' },
  })

  // ── Zonas ─────────────────────────────────────────────────────────────
  const zonasData = ['Salón', 'Terraza', 'Barra', 'VIP']
  for (const nombre of zonasData) {
    await prisma.zona.upsert({ where: { nombre }, update: {}, create: { nombre } })
  }

  // ── Mesas ─────────────────────────────────────────────────────────────
  const mesasData = [
    { numero: 1, capacidad: 2, zona: 'Salón' as const, posX: 80,  posY: 80  },
    { numero: 2, capacidad: 4, zona: 'Salón' as const, posX: 200, posY: 80  },
    { numero: 3, capacidad: 4, zona: 'Salón' as const, posX: 320, posY: 80  },
    { numero: 4, capacidad: 6, zona: 'Salón' as const, posX: 80,  posY: 200 },
    { numero: 5, capacidad: 6, zona: 'Salón' as const, posX: 220, posY: 200 },
    { numero: 6, capacidad: 4, zona: 'Terraza' as const, posX: 80,  posY: 80  },
    { numero: 7, capacidad: 4, zona: 'Terraza' as const, posX: 200, posY: 80  },
    { numero: 8, capacidad: 2, zona: 'Barra' as const, posX: 80,  posY: 80  },
    { numero: 9, capacidad: 2, zona: 'Barra' as const, posX: 160, posY: 80  },
    { numero: 10, capacidad: 8, zona: 'VIP' as const, posX: 80,  posY: 80  },
    { numero: 11, capacidad: 4, zona: 'Salón' as const, posX: 360, posY: 200 },
    { numero: 12, capacidad: 4, zona: 'salon' as const, posX: 80,  posY: 320 },
  ]
  for (const m of mesasData) {
    await prisma.mesa.upsert({ where: { numero: m.numero }, update: {}, create: m })
  }

  // ── Productos — Carta real Chicharronería CADE ──────────────────────────
  const guarnicionesPlato = ['Arroz', 'Papa guisada', 'Mote', 'Yuca', 'Menestra', 'Chifles', 'Cancha', 'Humitas', 'Tamales']
  const guarnicionesCaldo = ['Papa sancochada', 'Fideos', 'Arroz', 'Yuca', 'Mote', 'Cebolla china', 'Huevo duro', 'Ají molido']

  type ProductoSeed = {
    nombre: string
    categoria: 'entradas' | 'fondos' | 'bebidas' | 'cocteles' | 'postres' | 'extras'
    precio: number
    descripcion?: string
    tiempoPreparacion?: number
    esAlcoholico?: boolean
    tieneGuarnicion?: boolean
    guarnicionesDisponibles?: string[]
  }

  const productosData: ProductoSeed[] = [
    // ── Platos de la casa ──────────────────────────────────────────────
    { nombre: 'Chicharrón (Personal)',        categoria: 'fondos', precio: 15, tiempoPreparacion: 20, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },
    { nombre: 'Chicharrón (Fuente)',          categoria: 'fondos', precio: 35, tiempoPreparacion: 20, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },
    { nombre: 'Cecina (Personal)',            categoria: 'fondos', precio: 17, tiempoPreparacion: 20, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },
    { nombre: 'Cecina (Fuente)',              categoria: 'fondos', precio: 40, tiempoPreparacion: 20, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },
    { nombre: 'Carne Seca (Personal)',        categoria: 'fondos', precio: 18, tiempoPreparacion: 20, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },
    { nombre: 'Carne Seca (Fuente)',          categoria: 'fondos', precio: 45, tiempoPreparacion: 20, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },
    { nombre: 'Tilapia (Personal)',           categoria: 'fondos', precio: 14, descripcion: 'Precio según tamaño (S/14 – S/18)', tiempoPreparacion: 20, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },
    { nombre: 'Tilapia (Fuente)',             categoria: 'fondos', precio: 18, descripcion: 'Precio según tamaño (S/18 – S/35)', tiempoPreparacion: 20, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },
    { nombre: 'Cuy (Personal)',               categoria: 'fondos', precio: 18, tiempoPreparacion: 25, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },
    { nombre: 'Cuy (Fuente)',                 categoria: 'fondos', precio: 60, tiempoPreparacion: 25, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },
    { nombre: 'Tortilla de Salchicha',        categoria: 'fondos', precio: 10, tiempoPreparacion: 15 },
    { nombre: 'Hígadito de Cuy',              categoria: 'fondos', precio: 15, tiempoPreparacion: 15 },
    { nombre: 'Arroz con Pato',               categoria: 'fondos', precio: 19, tiempoPreparacion: 20 },
    { nombre: 'Cabrito',                      categoria: 'fondos', precio: 19, tiempoPreparacion: 25 },
    { nombre: 'Pellejito en Sarza (Personal)',categoria: 'fondos', precio: 20, tiempoPreparacion: 20, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },
    { nombre: 'Pellejito en Sarza (Fuente)',  categoria: 'fondos', precio: 35, tiempoPreparacion: 20, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },
    { nombre: 'Cecina en Sarza (Personal)',   categoria: 'fondos', precio: 20, tiempoPreparacion: 20, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },
    { nombre: 'Cecina en Sarza (Fuente)',     categoria: 'fondos', precio: 40, tiempoPreparacion: 20, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },
    { nombre: 'Carne Seca en Sarza (Personal)', categoria: 'fondos', precio: 25, tiempoPreparacion: 20, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },
    { nombre: 'Carne Seca en Sarza (Fuente)', categoria: 'fondos', precio: 45, tiempoPreparacion: 20, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesPlato },

    // ── Chaufas ────────────────────────────────────────────────────────
    { nombre: 'Chaufa de Chancho (Personal)', categoria: 'fondos', precio: 14, tiempoPreparacion: 15 },
    { nombre: 'Chaufa de Chancho (Mixto)',    categoria: 'fondos', precio: 25, tiempoPreparacion: 15 },
    { nombre: 'Chaufa de Chancho (Fuente)',   categoria: 'fondos', precio: 30, tiempoPreparacion: 15 },
    { nombre: 'Chaufa de Cecina (Personal)',  categoria: 'fondos', precio: 18, tiempoPreparacion: 15 },
    { nombre: 'Chaufa de Cecina (Mixto)',     categoria: 'fondos', precio: 25, tiempoPreparacion: 15 },
    { nombre: 'Chaufa de Cecina (Fuente)',    categoria: 'fondos', precio: 35, tiempoPreparacion: 15 },
    { nombre: 'Chaufa de Carne Seca (Personal)', categoria: 'fondos', precio: 18, tiempoPreparacion: 15 },
    { nombre: 'Chaufa de Carne Seca (Mixto)', categoria: 'fondos', precio: 25, tiempoPreparacion: 15 },
    { nombre: 'Chaufa de Carne Seca (Fuente)', categoria: 'fondos', precio: 35, tiempoPreparacion: 15 },

    // ── Caldos ─────────────────────────────────────────────────────────
    { nombre: 'Caldo de Pata + Guarnición',          categoria: 'fondos', precio: 12, tiempoPreparacion: 15, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesCaldo },
    { nombre: 'Caldo de Gallina + Guarnición (Chico)', categoria: 'fondos', precio: 12, tiempoPreparacion: 15, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesCaldo },
    { nombre: 'Caldo de Gallina + Guarnición (Grande)', categoria: 'fondos', precio: 15, tiempoPreparacion: 15, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesCaldo },
    { nombre: 'Caldo de Shurumbo + Guarnición',      categoria: 'fondos', precio: 12, tiempoPreparacion: 15, tieneGuarnicion: true, guarnicionesDisponibles: guarnicionesCaldo },

    // ── Guarniciones ───────────────────────────────────────────────────
    { nombre: 'Guarnición de Arroz (Chico)',        categoria: 'extras', precio: 3,   tiempoPreparacion: 8 },
    { nombre: 'Guarnición de Arroz (Grande)',       categoria: 'extras', precio: 5,   tiempoPreparacion: 8 },
    { nombre: 'Guarnición de Papa Guisada (Chico)', categoria: 'extras', precio: 3,   tiempoPreparacion: 8 },
    { nombre: 'Guarnición de Papa Guisada (Grande)',categoria: 'extras', precio: 5,   tiempoPreparacion: 8 },
    { nombre: 'Guarnición de Mote (Chico)',         categoria: 'extras', precio: 3,   tiempoPreparacion: 8 },
    { nombre: 'Guarnición de Mote (Grande)',        categoria: 'extras', precio: 5,   tiempoPreparacion: 8 },
    { nombre: 'Guarnición de Yuca (Chico)',         categoria: 'extras', precio: 3,   tiempoPreparacion: 8 },
    { nombre: 'Guarnición de Yuca (Grande)',        categoria: 'extras', precio: 5,   tiempoPreparacion: 8 },
    { nombre: 'Guarnición de Menestra (Chico)',     categoria: 'extras', precio: 3,   tiempoPreparacion: 8 },
    { nombre: 'Guarnición de Menestra (Grande)',    categoria: 'extras', precio: 5,   tiempoPreparacion: 8 },
    { nombre: 'Guarnición de Chifles (Chico)',      categoria: 'extras', precio: 3,   tiempoPreparacion: 8 },
    { nombre: 'Guarnición de Chifles (Grande)',     categoria: 'extras', precio: 5,   tiempoPreparacion: 8 },
    { nombre: 'Guarnición de Cancha (Chico)',       categoria: 'extras', precio: 3,   tiempoPreparacion: 8 },
    { nombre: 'Guarnición de Cancha (Grande)',      categoria: 'extras', precio: 5,   tiempoPreparacion: 8 },
    { nombre: 'Tamales',                            categoria: 'extras', precio: 1.5, tiempoPreparacion: 5 },
    { nombre: 'Humitas',                            categoria: 'extras', precio: 1.5, tiempoPreparacion: 5 },

    // ── Guarniciones extra ─────────────────────────────────────────────
    { nombre: 'Papa Frita',        categoria: 'extras', precio: 5, tiempoPreparacion: 10 },
    { nombre: 'Yuca Frita',        categoria: 'extras', precio: 5, tiempoPreparacion: 10 },
    { nombre: 'Camote Frito',      categoria: 'extras', precio: 5, tiempoPreparacion: 10 },
    { nombre: 'Tamal Frito',       categoria: 'extras', precio: 3, tiempoPreparacion: 8  },
    { nombre: 'Humita Frita',      categoria: 'extras', precio: 3, tiempoPreparacion: 8  },
    { nombre: 'Wantán Frito',      categoria: 'extras', precio: 4, tiempoPreparacion: 8  },
    { nombre: 'Zarandaja Refrita', categoria: 'extras', precio: 5, tiempoPreparacion: 10 },

    // ── Bebidas calientes ──────────────────────────────────────────────
    { nombre: 'Café Pasado',   categoria: 'bebidas', precio: 2, tiempoPreparacion: 3 },
    { nombre: 'Manzanilla',    categoria: 'bebidas', precio: 2, tiempoPreparacion: 3 },
    { nombre: 'Anís',          categoria: 'bebidas', precio: 2, tiempoPreparacion: 3 },
    { nombre: 'Hierba Luisa',  categoria: 'bebidas', precio: 2, tiempoPreparacion: 3 },
    { nombre: 'Té',            categoria: 'bebidas', precio: 2, tiempoPreparacion: 3 },

    // ── Bebidas frías — jarras (1L) ────────────────────────────────────
    { nombre: 'Jarra 1L Chicha de Jora',  categoria: 'bebidas', precio: 7, tiempoPreparacion: 2 },
    { nombre: 'Jarra 1L Chicha Morada',   categoria: 'bebidas', precio: 7, tiempoPreparacion: 2 },
    { nombre: 'Jarra 1L Cebada',          categoria: 'bebidas', precio: 7, tiempoPreparacion: 2 },
    { nombre: 'Jarra 1L Carambola',       categoria: 'bebidas', precio: 7, tiempoPreparacion: 2 },
    { nombre: 'Jarra 1L Maracuyá',        categoria: 'bebidas', precio: 7, tiempoPreparacion: 2 },

    // ── Bebidas frías — gaseosas / cervezas ─────────────────────────────
    { nombre: 'Inca/Coca Personal 296ml', categoria: 'bebidas', precio: 2.5,  tiempoPreparacion: 1 },
    { nombre: 'Gaseosa Gordita 625ml',    categoria: 'bebidas', precio: 5,    tiempoPreparacion: 1 },
    { nombre: 'Coca/Inca/Fanta 1L',       categoria: 'bebidas', precio: 8,    tiempoPreparacion: 1 },
    { nombre: 'Inca/Coca/Fanta 1.5L',     categoria: 'bebidas', precio: 12,   tiempoPreparacion: 1 },
    { nombre: 'Inca/Coca 2L',             categoria: 'bebidas', precio: 16,   tiempoPreparacion: 1 },
    { nombre: 'Sporade',                  categoria: 'bebidas', precio: 2.5,  tiempoPreparacion: 1 },
    { nombre: 'Agua 1/2L',                categoria: 'bebidas', precio: 2.5,  tiempoPreparacion: 1 },
    { nombre: 'Agua 1L',                  categoria: 'bebidas', precio: 3.5,  tiempoPreparacion: 1 },
    { nombre: 'Cerveza Pilsen',           categoria: 'cocteles', precio: 9,  tiempoPreparacion: 1, esAlcoholico: true },
    { nombre: 'Cerveza Trigo',            categoria: 'cocteles', precio: 10, tiempoPreparacion: 1, esAlcoholico: true },
    { nombre: 'Cerveza Negra',            categoria: 'cocteles', precio: 10, tiempoPreparacion: 1, esAlcoholico: true },
  ]

  await prisma.producto.deleteMany({})
  for (const p of productosData) {
    await prisma.producto.create({
      data: {
        nombre: p.nombre,
        categoria: p.categoria,
        precio: p.precio,
        descripcion: p.descripcion,
        tiempoPreparacion: p.tiempoPreparacion,
        esAlcoholico: p.esAlcoholico ?? false,
        tieneGuarnicion: p.tieneGuarnicion ?? false,
        guarnicionesDisponibles: p.guarnicionesDisponibles?.length ? JSON.stringify(p.guarnicionesDisponibles) : null,
      },
    })
  }
  // Ubica cada producto en su sección de la carta pública
  await asignarSeccionesCarta(prisma)

  // ── Insumos ───────────────────────────────────────────────────────────
  const insumos = [
    { nombre: 'Limón',           categoria: 'verduras',    unidad: 'kg',  stockActual: 15,  stockMinimo: 5,  stockMaximo: 30, precioUnitario: 3.5  },
    { nombre: 'Ají Amarillo',    categoria: 'verduras',    unidad: 'kg',  stockActual: 4,   stockMinimo: 2,  stockMaximo: 10, precioUnitario: 8    },
    { nombre: 'Cebolla Roja',    categoria: 'verduras',    unidad: 'kg',  stockActual: 8,   stockMinimo: 3,  stockMaximo: 20, precioUnitario: 2.5  },
    { nombre: 'Lomo de Res',     categoria: 'carnes',      unidad: 'kg',  stockActual: 5,   stockMinimo: 2,  stockMaximo: 15, precioUnitario: 35   },
    { nombre: 'Pisco',           categoria: 'bebidas',     unidad: 'l',   stockActual: 12,  stockMinimo: 4,  stockMaximo: 25, precioUnitario: 45   },
    { nombre: 'Arroz Extra',     categoria: 'abarrotes',   unidad: 'kg',  stockActual: 50,  stockMinimo: 10, stockMaximo: 100, precioUnitario: 2.8 },
    { nombre: 'Aceite Vegetal',  categoria: 'abarrotes',   unidad: 'l',   stockActual: 18,  stockMinimo: 5,  stockMaximo: 30, precioUnitario: 7    },
  ]
  for (const i of insumos) {
    const existe = await prisma.insumo.findFirst({ where: { nombre: i.nombre } })
    if (!existe) await prisma.insumo.create({ data: i })
  }

  // ── Proveedores ───────────────────────────────────────────────────────
  const proveedores = [
    { nombre: 'Distribuidora El Mar', ruc: '20123456789', contacto: 'Juan Pérez', telefono: '987654321', email: 'ventas@elmar.pe' },
    { nombre: 'Carnes El Buen Sabor', ruc: '20234567890', contacto: 'María López', telefono: '976543210', email: 'ventas@bsabor.pe' },
    { nombre: 'Bodega La Cosecha',    ruc: '20345678901', contacto: 'Pedro Ramos', telefono: '965432109', email: 'bodega@cosecha.pe' },
  ]
  for (const p of proveedores) {
    const existe = await prisma.proveedor.findUnique({ where: { ruc: p.ruc } })
    if (!existe) await prisma.proveedor.create({ data: p })
  }

  console.log('✅ Datos iniciales creados correctamente.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
