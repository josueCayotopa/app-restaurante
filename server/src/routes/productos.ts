import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

function mapProducto(p: Record<string, unknown>) {
  return {
    ...p,
    guarnicionesDisponibles: p.guarnicionesDisponibles
      ? JSON.parse(p.guarnicionesDisponibles as string)
      : undefined,
  }
}

// GET /api/productos
router.get('/', autenticar, async (req: Request, res: Response) => {
  const { categoria, disponible } = req.query
  const where: Record<string, unknown> = {}
  if (categoria) where.categoria = categoria
  if (disponible !== undefined) where.disponible = disponible === 'true'
  const productos = await prisma.producto.findMany({ where, orderBy: { nombre: 'asc' } })
  res.json(productos.map((p) => mapProducto(p as never)))
})

// GET /api/productos/:id
router.get('/:id', autenticar, async (req: Request, res: Response): Promise<void> => {
  const p = await prisma.producto.findUnique({ where: { id: String(req.params.id) } })
  if (!p) { res.status(404).json({ error: 'Producto no encontrado' }); return }
  res.json(mapProducto(p as never))
})

// POST /api/productos
router.post('/', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response) => {
  const {
    nombre, descripcion, precio, categoria, disponible, imagen,
    tiempoPreparacion, esAlcoholico, tieneGuarnicion, guarnicionesDisponibles,
    seccionCarta,
  } = req.body
  // Nuevo producto en la carta → al final de su sección, salvo que venga un orden
  let ordenCarta: number = req.body.ordenCarta ?? 0
  if (seccionCarta && req.body.ordenCarta === undefined) {
    const ultimo = await prisma.producto.aggregate({ where: { seccionCarta }, _max: { ordenCarta: true } })
    ordenCarta = (ultimo._max.ordenCarta ?? 0) + 1
  }
  const p = await prisma.producto.create({
    data: {
      nombre, descripcion, precio, categoria, disponible, imagen,
      tiempoPreparacion, esAlcoholico, tieneGuarnicion: tieneGuarnicion ?? false,
      guarnicionesDisponibles: guarnicionesDisponibles?.length ? JSON.stringify(guarnicionesDisponibles) : null,
      seccionCarta: seccionCarta || null, ordenCarta,
    },
  })
  res.status(201).json(mapProducto(p as never))
})

// PATCH /api/productos/:id
router.patch('/:id', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response) => {
  const { guarnicionesDisponibles, ...resto } = req.body
  const p = await prisma.producto.update({
    where: { id: String(req.params.id) },
    data: {
      ...resto,
      ...(guarnicionesDisponibles !== undefined
        ? { guarnicionesDisponibles: guarnicionesDisponibles?.length ? JSON.stringify(guarnicionesDisponibles) : null }
        : {}),
    },
  })
  res.json(mapProducto(p as never))
})

// PATCH /api/productos/:id/disponibilidad
router.patch('/:id/disponibilidad', autenticar, requerirRol('admin', 'cajero', 'cocinero', 'bartender'), async (req: Request, res: Response) => {
  const { disponible } = req.body
  const p = await prisma.producto.update({
    where: { id: String(req.params.id) },
    data: { disponible },
  })
  res.json(p)
})

// DELETE /api/productos/:id
router.delete('/:id', autenticar, requerirRol('admin', 'cajero'), async (req: Request, res: Response) => {
  try {
    await prisma.producto.delete({ where: { id: String(req.params.id) } })
  } catch (e) {
    // Ya se vendió (está en comandas): borrarlo rompería el historial de ventas
    if ((e as { code?: string }).code === 'P2003') {
      res.status(409).json({ error: 'Este producto ya tiene ventas registradas: no se puede eliminar. Márcalo como "No disponible" o quítalo de la carta.' })
      return
    }
    throw e
  }
  res.status(204).send()
})

export default router
