interface CardProps {
  title?: string
  children: React.ReactNode
  className?: string
  gold?: boolean
}

export function Card({ title, children, className = '', gold = false }: CardProps): React.JSX.Element {
  return (
    <div
      className={`
        bg-bg-card border rounded-lg p-4
        ${gold ? 'border-border-gold' : 'border-border'}
        ${className}
      `}
    >
      {title && (
        <h3 className="text-lg font-bold text-secondary mb-3 font-[family-name:var(--font-title)]">
          {title}
        </h3>
      )}
      {children}
    </div>
  )
}
