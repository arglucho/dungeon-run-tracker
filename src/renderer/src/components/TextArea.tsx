interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function TextArea({ label, error, hint, className = '', id, ...props }: TextAreaProps): React.JSX.Element {
  const textareaId = id || label?.toLowerCase().replace(/\s/g, '-')

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={textareaId} className="text-sm font-medium text-text-muted">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          px-3 py-2 bg-bg-input border rounded-md text-text
          placeholder:text-text-dark resize-y min-h-[80px]
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
