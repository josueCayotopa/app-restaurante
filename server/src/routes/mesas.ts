import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'
import { getIo } from '../sockets/io'

const router = Router()
// "en limpieza" ya no existe: al cobrar la mesa pasa directo a libre
const ESTADOS_MESA = ['libre', 'ocupada', 'reservada', 'esperando_pago', 'unida']
const prisma = new PrismaClient()

// GET /api/mesas
router.get('/', autenticar, async (_req: Request, res: Response) => {
  const mesas = await prisma.mesa.findMany({ orderBy: { numero: 'asc' } })
  res.json(mesas)
})

// GET /api/mesas/:id
router.get('/:id', autenticar, async (req: Request, res: Response): Promise<void> => {
  const mesa = await prisma.mesa.findUnique({ where: { id: String(req.params.id) } })
  if (!mesa) { res.status(404).json({ error: 'Mesa no encontrada' }); return }
  res.json(mesa)
})

// POST /api/mesas
router.post('/', autenticar, requerirRol('admin'), async (req: Request, res: Response) => {
  const { numero, capacidad, zona, posX, posY } = req.body
  const mesa = await prisma.mesa.create({
    data: { numero, capacidad, zona, posX: posX ?? 0, posY: posY ?? 0 },
  })
  res.status(201).json(mesa)
})

// PATCH /api/mesas/:id/estado
router.patch('/:id/estado', autenticar, async (req: Request, res: Response): Promise<void> => {
  const { estado } = req.body
  if (!ESTADOS_MESA.includes(estado)) { res.status(400).json({ error: 'Estado de mesa inválido' }); return }
  const mesa = await prisma.mesa.update({
    where: { id: String(req.params.id) },
    data: { estado },
  })
  getIo().emit('mesa:estado_actualizado', mesa)
  res.json(mesa)
})

// PATCH /api/mesas/:id
router.patch('/:id', autenticar, requerirRol('admin'), async (req: Request, res: Response) => {
  const { numero, capacidad, zona, posX, posY } = req.body
  const mesa = await prisma.mesa.update({
    where: { id: String(req.params.id) },
    data: { numero, capacidad, zona, posX, posY },
  })
  res.json(mesa)
})

// ── Unir / separar mesas (se guarda en el servidor: todas las pantallas lo ven) ──
// La secundaria queda "unida" apuntando a la principal, que es la que lleva la comanda.

// Avisa a todos los equipos que cambiaron las mesas (recargan la lista)
const avisarMesas = () => getIo().emit('mesas:actualizadas')

// Separa las mesas unidas a una principal (al separar a mano, al cobrar o al cancelar su comanda)
export async function liberarUnidas(principalId: string) {
  const r = await prisma.mesa.updateMany({ where: { unidaA: principalId }, data: { unidaA: null, estado: 'libre' } })
  if (r.count) avisarMesas()
}

// POST /api/mesas/:id/unir { secundariaId }
router.post('/:id/unir', autenticar, async (req: Request, res: Response): Promise<void> => {
  const principalId = String(req.params.id)
  const secundariaId = String(req.body?.secundariaId ?? '')
  if (principalId === secundariaId) { res.status(400).json({ error: 'Elige dos mesas distintas' }); return }
  const [principal, secundaria] = await Promise.all([
    prisma.mesa.findUnique({ where: { id: principalId } }),
    prisma.mesa.findUnique({ where: { id: secundariaId } }),
  ])
  if (!principal || !secundaria) { res.status(404).json({ error: 'Mesa no encontrada' }); return }
  if (principal.unidaA) { res.status(409).json({ error: `La mesa ${principal.numero} ya está unida a otra` }); return }
  if (secundaria.unidaA === principalId) { res.json({ ok: true }); return }   // reintento
  if (secundaria.unidaA || (await prisma.mesa.count({ where: { unidaA: secundariaId } }))) {
    res.status(409).json({ error: `La mesa ${secundaria.numero} ya está en otra unión` }); return
  }
  const abierta = await prisma.comanda.findFirst({ where: { mesaId: secundariaId, estado: { notIn: ['cerrada', 'cancelada'] } } })
  if (abierta) { res.status(409).json({ error: `La mesa ${secundaria.numero} tiene una comanda abierta: cóbrala o cancélala antes de unirla` }); return }
  await prisma.mesa.update({ where: { id: secundariaId }, data: { unidaA: principalId, estado: 'unida' } })
  avisarMesas()
  res.json({ ok: true })
})

// POST /api/mesas/:id/separar → libera las mesas unidas a esta principal
router.post('/:id/separar', autenticar, async (req: Request, res: Response): Promise<void> => {
  await liberarUnidas(String(req.params.id))
  res.json({ ok: true })
})

// DELETE /api/mesas/:id
router.delete('/:id', autenticar, requerirRol('admin'), async (req: Request, res: Response) => {
  await prisma.mesa.delete({ where: { id: String(req.params.id) } })
  res.status(204).send()
})

export default router
