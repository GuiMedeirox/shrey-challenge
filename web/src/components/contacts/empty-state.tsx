import { Users } from 'lucide-react'

interface EmptyStateProps {
  onCreate: () => void
}

export function EmptyState({ onCreate }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Users className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">No contacts yet</p>
        <p className="text-xs text-muted-foreground">Tap the + button to add your first one</p>
      </div>
      <button
        onClick={onCreate}
        className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Add contact
      </button>
    </div>
  )
}
