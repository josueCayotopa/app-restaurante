import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'

const router = Router()
const prisma = new PrismaClient()

const COLORES = ['gold', 'gold_osc', 'rojo', 'rojo_osc', 'steel', 'gris', 'verde']
const AREAS = ['cocina', 'bar']

function datosCategoria(body: Record<string, unknown>) {
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
  if (!nombre) return { error: 'El nombre es obligatorio' }
  return {
    data: {
      nombre,
      emoji: typeof body.emoji === 'string' && body.emoji.trim() ? body.emoji.trim() : '🍽️',
      color: typeof body.color === 'string' && COLORES.includes(body.color) ? body.color : 'gold',
      area:  typeof body.area === 'string' && AREAS.includes(body.area) ? body.area : 'cocina',
    },
  }
}

// GET /api/categorias
router.get('/', autenticar, async (_req: Request, res: Response) => {
  const categorias = await prisma.categoriaProducto.findMany({ orderBy: [{ orden: 'asc' }, { creadaEn: 'asc' }] })
  res.json(categorias)
})

// POST /api/categorias
router.post('/', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const r = datosCategoria(req.body)
  if ('error' in r) { res.status(400).json({ error: r.error }); return }
  const existe = await prisma.categoriaProducto.findFirst({ where: { nombre: { equals: r.data!.nombre, mode: 'insensitive' } } })
  if (existe) { res.status(409).json({ error: 'Ya existe una categoría con ese nombre' }); return }
  const ultimo = await prisma.categoriaProducto.aggregate({ _max: { orden: true } })
  const categoria = await prisma.categoriaProducto.create({ data: { ...r.data!, orden: (ultimo._max.orden ?? 0) + 1 } })
  res.status(201).json(categoria)
})

// PATCH /api/categorias/:id
router.patch('/:id', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const r = datosCategoria(req.body)
  if ('error' in r) { res.status(400).json({ error: r.error }); return }
  const categoria = await prisma.categoriaProducto.update({ where: { id: String(req.params.id) }, data: r.data! })
  res.json(categoria)
})

// DELETE /api/categorias/:id — solo si ningún producto la usa
router.delete('/:id', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const enUso = await prisma.producto.count({ where: { categoria: id } })
  if (enUso > 0) {
    res.status(409).json({ error: `No se puede eliminar: ${enUso} producto(s) usan esta categoría. Muévelos a otra primero.` })
    return
  }
  await prisma.categoriaProducto.delete({ where: { id } })
  res.status(204).send()
})

export default router
