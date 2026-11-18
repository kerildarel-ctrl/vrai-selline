import { Router } from 'express'
import multer from 'multer'
import fs from 'node:fs/promises'
import path from 'node:path'
import { HttpError, uid } from '../lib.js'

const MAX_BYTES = 8 * 1024 * 1024

/** Détecte le vrai type à partir des premiers octets */
function sniff(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' }
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' }
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'GIF8') return { ext: 'gif', mime: 'image/gif' }
  if (buf.length > 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { ext: 'webp', mime: 'image/webp' }
  return null
}

/** Upload vers Cloudinary (production) */
async function uploadToCloudinary(buffer, folder = 'selline') {
  const { v2: cloudinary } = await import('cloudinary')
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image', transformation: [{ quality: 'auto', fetch_format: 'auto' }] },
      (err, result) => err ? reject(err) : resolve(result.secure_url)
    )
    stream.end(buffer)
  })
}

/** Upload vers le disque local (développement) */
async function uploadToLocal(buffer, ext, config) {
  const name = `${uid()}.${ext}`
  await fs.mkdir(config.uploadDir, { recursive: true })
  await fs.writeFile(path.join(config.uploadDir, name), buffer, { flag: 'wx' })
  return `${config.publicUrl}/api/uploads/${name}`
}

export function uploadRoutes({ config }) {
  const r = Router()
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 5 } })

  // Initialiser Cloudinary si les credentials sont présents
  if (process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)) {
    import('cloudinary').then(({ v2: cloudinary }) => {
      if (process.env.CLOUDINARY_URL) {
        cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL })
      } else {
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        })
      }
      console.log('[upload] ☁️  Cloudinary configuré')
    }).catch(() => {})
  }

  r.post('/uploads', upload.single('file'), async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Aucun fichier reçu (champ « file »).')
    const type = sniff(req.file.buffer)
    if (!type) throw new HttpError(400, 'Format non pris en charge : envoyez une image JPG, PNG, WebP ou GIF.')

    const useCloudinary = !!(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME)

    let url
    if (useCloudinary) {
      url = await uploadToCloudinary(req.file.buffer)
    } else {
      url = await uploadToLocal(req.file.buffer, type.ext, config)
    }

    res.status(201).json({ url })
  })

  return r
}
