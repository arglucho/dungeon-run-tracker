interface ErrorMessageProps {
  message: string
  onRetry?: () => void
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-danger/10 border border-danger rounded-md">
      <p className="text-danger-light text-sm">⚠️ {message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs text-secondary underline hover:text-secondary-light cursor-pointer"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
