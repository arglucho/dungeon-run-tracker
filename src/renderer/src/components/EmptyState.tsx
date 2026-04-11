interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="text-4xl mb-3">{icon}</span>
      <h3 className="text-lg font-bold text-text-muted mb-1">{title}</h3>
      {description && <p className="text-sm text-text-dark mb-4">{description}</p>}
      {action}
    </div>
  )
}
