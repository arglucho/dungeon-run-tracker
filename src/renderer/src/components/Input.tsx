import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-')

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            px-3 py-2 bg-bg-input border rounded-md text-text
            placeholder:text-text-dark
            focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary
            disabled:opacity-50
            ${error ? 'border-danger' : 'border-border'}
            ${className}
          `}
          {...props}
        />
        {error && <span className="text-xs text-danger-light">{error}</span>}
        {hint && !error && <span className="text-xs text-text-dark">{hint}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
