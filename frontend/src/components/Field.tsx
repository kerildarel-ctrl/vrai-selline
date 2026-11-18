import type { InputHTMLAttributes } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export default function Field({ label, hint, id, ...props }: FieldProps) {
  const inputId = id ?? props.name
  return (
    <div>
      <label htmlFor={inputId} className="label">{label}</label>
      <input id={inputId} className="input-field" {...props} />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
