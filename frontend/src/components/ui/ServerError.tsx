interface ServerErrorProps {
  message: string
}

export function ServerError({ message }: ServerErrorProps) {
  if (!message) return null
  return (
    <div className="bg-red-950/50 border border-danger/30 rounded-xl px-4 py-3 animate-fade-in">
      <p className="text-sm text-danger">{message}</p>
    </div>
  )
}
