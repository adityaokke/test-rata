interface ModalActionsProps {
  onCancel: () => void
  submitLabel: string
  loadingLabel: string
  loading: boolean
  disabled?: boolean
}

export function ModalActions({
  onCancel,
  submitLabel,
  loadingLabel,
  loading,
  disabled,
}: ModalActionsProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 border border-zinc-700 text-ink-muted rounded-xl py-2.5 text-sm hover:border-zinc-600 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={disabled || loading}
        className="flex-1 bg-accent text-surface rounded-xl py-2.5 text-sm font-medium hover:bg-accent-dim transition-colors disabled:opacity-40"
      >
        {loading ? loadingLabel : submitLabel}
      </button>
    </div>
  )
}
