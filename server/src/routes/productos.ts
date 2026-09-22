import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar } from '../middleware/auth'

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
  const p = await prisma.producto.findUnique({ where: { id: req.params.id } })
  if (!p) { res.status(404).json({ error: 'Producto no encontrado' }); return }
  res.json(mapProducto(p as never))
})

// POST /api/productos
router.post('/', autenticar, async (req: Request, res: Response) => {
  const {
    nombre, descripcion, precio, categoria, disponible, imagen,
    tiempoPreparacion, esAlcoholico, tieneGuarnicion, guarnicionesDisponibles,
  } = req.body
  const p = await prisma.producto.create({
    data: {
      nombre, descripcion, precio, categoria, disponible, imagen,
      tiempoPreparacion, esAlcoholico, tieneGuarnicion: tieneGuarnicion ?? false,
      guarnicionesDisponibles: guarnicionesDisponibles?.length ? JSON.stringify(guarnicionesDisponibles) : null,
    },
  })
  res.status(201).json(mapProducto(p as never))
})

// PATCH /api/productos/:id
router.patch('/:id', autenticar, async (req: Request, res: Response) => {
  const { guarnicionesDisponibles, ...resto } = req.body
  const p = await prisma.producto.update({
    where: { id: req.params.id },
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
router.patch('/:id/disponibilidad', autenticar, async (req: Request, res: Response) => {
  const { disponible } = req.body
  const p = await prisma.producto.update({
    where: { id: req.params.id },
    data: { disponible },
  })
  res.json(p)
})

// DELETE /api/productos/:id
router.delete('/:id', autenticar, async (req: Request, res: Response) => {
  await prisma.producto.delete({ where: { id: req.params.id } })
  res.status(204).send()
})

export default router
