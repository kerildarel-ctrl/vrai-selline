import { Router } from 'express'
import multer from 'multer'
import fs from 'node:fs/promises'
import path from 'node:path'
import { v2 as cloudinary } from 'cloudinary'
import { HttpError, uid } from '../lib.js'

const MAX_BYTES = 8 * 1024 * 1024

// Configurer Cloudinary une seule fois au démarrage
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
  console.log(`[upload] ☁️  Cloudinary configuré (${process.env.CLOUDINARY_CLOUD_NAME})`)
}

/** Détecte le vrai type à partir des premiers octets */
function sniff(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'GIF8') return 'gif'
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp'
  return null
}

/** Upload vers Cloudinary */
function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'selline',
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto', width: 1200, crop: 'limit' }],
      },
      (err, result) => {
        if (err) return reject(new Error(`Cloudinary: ${err.message}`))
        resolve(result.secure_url)
      }
    )
    stream.end(buffer)
  })
}

/** Upload vers le disque local (dev uniquement) */
async function uploadToLocal(buffer, ext, config) {
  const name = `${uid()}.${ext}`
  await fs.mkdir(config.uploadDir, { recursive: true })
  await fs.writeFile(path.join(config.uploadDir, name), buffer, { flag: 'wx' })
  return `${config.publicUrl}/api/uploads/${name}`
}

export function uploadRoutes({ config }) {
  const r = Router()
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES, files: 1, fields: 5 },
  })

  const useCloudinary = !!process.env.CLOUDINARY_CLOUD_NAME

  r.post('/uploads', upload.single('file'), async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Aucun fichier reçu (champ « file »).')
    const ext = sniff(req.file.buffer)
    if (!ext) throw new HttpError(400, 'Format non pris en charge : JPG, PNG, WebP ou GIF uniquement.')

    const url = useCloudinary
      ? await uploadToCloudinary(req.file.buffer)
      : await uploadToLocal(req.file.buffer, ext, config)

    res.status(201).json({ url })
  })

  return r
}
