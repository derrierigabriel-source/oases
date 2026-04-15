'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-medium text-brand-text-dim">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-3 py-2.5 rounded-lg text-sm
            bg-brand-card border text-brand-text
            placeholder:text-brand-muted
            focus:outline-none focus:ring-2 focus:ring-brand-gold/40 focus:border-brand-gold/50
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500/60' : 'border-brand-border'}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {hint && !error && <p className="text-xs text-brand-muted">{hint}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
