import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Input({ label, error, id, ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-medium text-ink-muted uppercase tracking-wider">
        {label}
      </label>
      <input id={inputId} className="input-base" {...props} />
      {error && (
        <p className="text-xs text-danger animate-fade-in">{error}</p>
      )}
    </div>
  )
}
