'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { getInitials } from '@/lib/initials'
import type { Contact } from '@/lib/types'

interface ContactCardProps {
  contact: Contact
  onOpen: (contact: Contact) => void
  sortable?: boolean
}

export function ContactCard({ contact, onOpen, sortable = true }: ContactCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: contact.id,
    disabled: !sortable,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        if (isDragging) return
        e.preventDefault()
        onOpen(contact)
      }}
      {...attributes}
      {...listeners}
      aria-label={`Open ${contact.name}`}
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl p-3 text-center outline-none transition-colors',
        'hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring',
        'touch-none select-none',
        isDragging && 'z-10 cursor-grabbing opacity-80 shadow-lg'
      )}
    >
      <Avatar className="size-16 sm:size-20">
        {contact.photo ? <AvatarImage src={contact.photo} alt={contact.name} /> : null}
        <AvatarFallback className="text-lg sm:text-xl font-medium">
          {getInitials(contact.name)}
        </AvatarFallback>
      </Avatar>
      <span className="line-clamp-2 min-h-[2lh] text-xs sm:text-sm font-medium text-foreground">
        {contact.name}
      </span>
    </button>
  )
}
