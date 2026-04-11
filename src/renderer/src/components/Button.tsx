interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'accent' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-primary hover:bg-primary-light text-text border-primary-dark',
  secondary:
    'bg-secondary hover:bg-secondary-light text-bg border-secondary-dark',
  danger:
    'bg-danger hover:bg-danger-light text-text border-danger',
  accent:
    'bg-accent hover:bg-accent-light text-text border-accent-dark',
  ghost:
    'bg-transparent hover:bg-bg-lighter text-text-muted border-border'
}

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps): React.JSX.Element {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        border rounded-md font-medium
        transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        cursor-pointer
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
