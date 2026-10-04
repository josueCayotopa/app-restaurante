import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import { autenticar } from '../middleware/auth'
import { CARPETA_UPLOADS } from '../lib/rutas'

const router = Router()

const uploadsDir = CARPETA_UPLOADS
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${crypto.randomUUID()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
      cb(new Error('Tipo de archivo no permitido. Usa JPG, PNG, WEBP o GIF.'))
      return
    }
    cb(null, true)
  },
})

// POST /api/uploads/imagen
router.post('/imagen', autenticar, (req: Request, res: Response) => {
  upload.single('imagen')(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Error subiendo el archivo'
      res.status(400).json({ error: message })
      return
    }
    if (!req.file) {
      res.status(400).json({ error: 'No se recibió ningún archivo' })
      return
    }
    res.status(201).json({ url: `/uploads/${req.file.filename}` })
  })
})

export default router
