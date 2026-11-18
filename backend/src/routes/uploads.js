import { Router } from 'express'
import multer from 'multer'
import fs from 'node:fs/promises'
import path from 'node:path'
import { HttpError, uid } from '../lib.js'

const MAX_BYTES = 8 * 1024 * 1024

/** Détecte le vrai type à partir des premiers octets (on ne fait pas confiance au nom ni au Content-Type). */
function sniff(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'GIF8') return 'gif'
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp'
  return null
}

export function uploadRoutes({ config }) {
  const r = Router()
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 5 } })

  r.post('/uploads', upload.single('file'), async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Aucun fichier reçu (champ « file »).')
    const ext = sniff(req.file.buffer)
    if (!ext) throw new HttpError(400, 'Format non pris en charge : envoyez une image JPG, PNG, WebP ou GIF.')
    const name = `${uid()}.${ext}`
    await fs.mkdir(config.uploadDir, { recursive: true })
    await fs.writeFile(path.join(config.uploadDir, name), req.file.buffer, { flag: 'wx' })
    res.status(201).json({ url: `${config.publicUrl}/api/uploads/${name}` })
  })
  return r
}
