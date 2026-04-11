interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string | number; label: string }[]
  placeholder?: string
}

export function Select({
  label,
  error,
  options,
  placeholder,
  className = '',
  id,
  ...props
}: SelectProps): React.JSX.Element {
  const selectId = id || label?.toLowerCase().replace(/\s/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-text-muted">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          px-3 py-2 bg-bg-input border rounded-md text-text
          focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary
          disabled:opacity-50
          ${error ? 'border-danger' : 'border-border'}
          ${className}
        `}
        {...props}
      >
        {placeholder && (
          <option value="" className="text-text-dark">
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-danger-light">{error}</span>}
    </div>
  )
}
