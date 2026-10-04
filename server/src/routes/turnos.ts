import { Router, Request, Response } from 'express'
import { PrismaClient, type Turno } from '@prisma/client'
import { autenticar, requerirRol } from '../middleware/auth'
import { nombreDeUsuario } from '../lib/usuario'
import { getIo } from '../sockets/io'

const router = Router()
const prisma = new PrismaClient()

// Reglas del turno de salón:
//  · Solo un administrador abre, cierra y asigna mozos.
//  · Solo puede haber UN turno abierto (abrir otro no cierra el anterior a escondidas).
//  · Los mozos del turno son usuarios reales, activos y con rol "mozo".
//  · No se cierra el turno con mesas sin cobrar, ni se saca a un mozo que tiene mesas abiertas.
//  · Sin turno abierto no se crean comandas nuevas (lo valida la ruta de comandas).

const idsMozos = (t: Turno): string[] => { try { return JSON.parse(t.mozos ?? '[]') } catch { return [] } }

async function mapTurno(t: Turno) {
  const ids = idsMozos(t)
  const usuarios = ids.length
    ? await prisma.usuario.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true } })
    : []
  // Respeta el orden en que se agregaron (y descarta ids que ya no existen)
  const mozos = ids.map((id) => usuarios.find((u) => u.id === id)).filter(Boolean) as { id: string; nombre: string }[]
  return { id: t.id, estado: t.estado, iniciadoPor: t.iniciadoPor, iniciadoEn: t.iniciadoEn, cerradoEn: t.cerradoEn, mozos }
}

export const turnoActivo = () => prisma.turno.findFirst({ where: { estado: 'activo' }, orderBy: { iniciadoEn: 'desc' } })

// Comandas sin cobrar (todo lo que no está cerrado ni cancelado)
const comandasAbiertas = (where: Record<string, unknown> = {}) =>
  prisma.comanda.findMany({ where: { estado: { notIn: ['cerrada', 'cancelada'] }, ...where }, select: { numeroMesa: true, mozo: true } })

const mozosValidos = (ids: string[]) =>
  prisma.usuario.findMany({ where: { id: { in: ids }, rol: 'mozo', activo: true }, select: { id: true, nombre: true } })

const avisar = () => getIo().emit('turno:actualizado')

// GET /api/turnos/activo → turno abierto (o null) con sus mozos {id, nombre}
router.get('/activo', autenticar, async (_req: Request, res: Response) => {
  const t = await turnoActivo()
  res.json(t ? await mapTurno(t) : null)
})

// GET /api/turnos/mozos-disponibles → usuarios mozo activos (para armar el turno)
router.get('/mozos-disponibles', autenticar, async (_req: Request, res: Response) => {
  res.json(await prisma.usuario.findMany({ where: { rol: 'mozo', activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } }))
})

// POST /api/turnos/iniciar { mozos?: string[] (ids) }
router.post('/iniciar', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const abierto = await turnoActivo()
  if (abierto) {
    res.status(409).json({ error: `Ya hay un turno abierto desde las ${abierto.iniciadoEn.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} (${abierto.iniciadoPor}). Ciérralo antes de abrir otro.` })
    return
  }
  const pedidos: string[] = Array.isArray(req.body.mozos) ? req.body.mozos.map(String) : []
  const validos = await mozosValidos(pedidos)
  if (validos.length !== new Set(pedidos).size) { res.status(400).json({ error: 'Alguno de los mozos no existe o está inactivo' }); return }

  const turno = await prisma.turno.create({
    data: {
      iniciadoPor: (await nombreDeUsuario(req.usuario?.id)) ?? 'Administrador',
      mozos: JSON.stringify([...new Set(pedidos)]),
      estado: 'activo',
    },
  })
  avisar()
  res.status(201).json(await mapTurno(turno))
})

// POST /api/turnos/cerrar
router.post('/cerrar', autenticar, requerirRol('admin'), async (_req: Request, res: Response): Promise<void> => {
  const turno = await turnoActivo()
  if (!turno) { res.status(409).json({ error: 'No hay ningún turno abierto' }); return }
  const abiertas = await comandasAbiertas()
  if (abiertas.length > 0) {
    const mesas = [...new Set(abiertas.map((c) => c.numeroMesa))].sort((a, b) => a - b)
    res.status(409).json({ error: `No se puede cerrar el turno: hay ${abiertas.length} pedido(s) sin cobrar (mesa${mesas.length > 1 ? 's' : ''} ${mesas.join(', ')})` })
    return
  }
  const cerrado = await prisma.turno.update({ where: { id: turno.id }, data: { estado: 'cerrado', cerradoEn: new Date() } })
  avisar()
  res.json(await mapTurno(cerrado))
})

// PATCH /api/turnos/:id/mozos { usuarioId } → agrega o quita un mozo del turno
router.patch('/:id/mozos', autenticar, requerirRol('admin'), async (req: Request, res: Response): Promise<void> => {
  const turno = await prisma.turno.findUnique({ where: { id: String(req.params.id) } })
  if (!turno) { res.status(404).json({ error: 'Turno no encontrado' }); return }
  if (turno.estado !== 'activo') { res.status(409).json({ error: 'El turno ya está cerrado' }); return }

  const usuarioId = String(req.body.usuarioId ?? '')
  const ids = idsMozos(turno)
  let nuevos: string[]
  if (ids.includes(usuarioId)) {
    // Quitar: no si todavía tiene mesas sin cobrar
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { nombre: true } })
    const suyas = usuario ? await comandasAbiertas({ mozo: usuario.nombre }) : []
    if (suyas.length > 0) {
      res.status(409).json({ error: `${usuario!.nombre} tiene ${suyas.length} mesa(s) sin cobrar (${[...new Set(suyas.map((c) => c.numeroMesa))].join(', ')}). Cóbralas antes de sacarlo del turno.` })
      return
    }
    nuevos = ids.filter((x) => x !== usuarioId)
  } else {
    const [valido] = await mozosValidos([usuarioId])
    if (!valido) { res.status(400).json({ error: 'Solo se pueden agregar usuarios con rol mozo y activos' }); return }
    nuevos = [...ids, usuarioId]
  }
  const actualizado = await prisma.turno.update({ where: { id: turno.id }, data: { mozos: JSON.stringify(nuevos) } })
  avisar()
  res.json(await mapTurno(actualizado))
})

// GET /api/turnos/historial?limite=20 → turnos anteriores (admin)
router.get('/historial', autenticar, requerirRol('admin'), async (req: Request, res: Response) => {
  const turnos = await prisma.turno.findMany({ where: { estado: 'cerrado' }, orderBy: { iniciadoEn: 'desc' }, take: Math.min(Number(req.query.limite) || 20, 100) })
  res.json(await Promise.all(turnos.map(mapTurno)))
})

export default router

// Usado por la ruta de comandas: decide quién es el mozo de una comanda nueva.
//  · Un mozo solo crea comandas a su nombre y debe estar en el turno.
//  · Un admin puede crearla a nombre de cualquier mozo del turno (o a su propio nombre).
export async function resolverMozo(usuario: { id: string; rol: string } | undefined, mozoPedido: unknown)
  : Promise<{ nombre: string } | { error: string; status: number }> {
  const turno = await turnoActivo()
  if (!turno) return { error: 'No hay un turno abierto: pide al administrador que inicie el turno', status: 409 }
  const enTurno = (await mapTurno(turno)).mozos
  if (!usuario) return { error: 'Sesión inválida', status: 401 }

  if (usuario.rol === 'mozo') {
    const yo = enTurno.find((m) => m.id === usuario.id)
    if (!yo) return { error: 'No estás en el turno de hoy: pide al administrador que te agregue', status: 403 }
    return { nombre: yo.nombre }
  }
  if (usuario.rol === 'admin') {
    const nombre = typeof mozoPedido === 'string' ? mozoPedido.trim() : ''
    const propio = await nombreDeUsuario(usuario.id)
    if (!nombre || nombre === propio) return { nombre: propio ?? 'Administrador' }
    if (!enTurno.some((m) => m.nombre === nombre)) return { error: `${nombre} no está en el turno`, status: 400 }
    return { nombre }
  }
  return { error: 'Tu rol no puede crear comandas', status: 403 }
}
