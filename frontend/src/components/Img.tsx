import { useState } from 'react'
import { ImageOff } from 'lucide-react'

interface ImgProps {
  src?: string | null
  alt: string
  className?: string
}

export default function Img({ src, alt, className = '' }: ImgProps) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-300 ${className}`} role="img" aria-label={alt}>
        <ImageOff size={28} />
      </div>
    )
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />
}
