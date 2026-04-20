'use client'

import { Info, Pencil, Trash2 } from 'lucide-react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/initials'
import type { Contact } from '@/lib/types'

interface ContactActionSheetProps {
  contact: Contact | null
  onClose: () => void
  onAbout: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ContactActionSheet({ contact, onClose, onAbout, onEdit, onDelete }: ContactActionSheetProps) {
  const open = contact !== null

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[80vh] rounded-t-2xl p-0 sm:max-w-md sm:mx-auto sm:inset-x-0"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted-foreground/30" />

        {contact ? (
          <div className="flex items-center gap-3 px-5 pt-3 pb-4">
            <Avatar className="size-12">
              {contact.photo ? <AvatarImage src={contact.photo} alt="" /> : null}
              <AvatarFallback className="text-base font-medium">{getInitials(contact.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{contact.name}</p>
              {contact.phone ? (
                <p className="truncate text-xs text-muted-foreground">{contact.phone}</p>
              ) : contact.email ? (
                <p className="truncate text-xs text-muted-foreground">{contact.email}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col divide-y border-t">
          <ActionButton icon={<Info className="size-4" />} onClick={onAbout}>
            About {contact?.name}
          </ActionButton>
          <ActionButton icon={<Pencil className="size-4" />} onClick={onEdit}>
            Update {contact?.name}
          </ActionButton>
          <ActionButton
            icon={<Trash2 className="size-4" />}
            onClick={onDelete}
            destructive
          >
            Delete {contact?.name}&apos;s contact
          </ActionButton>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="block w-full border-t bg-muted/30 px-5 py-3 text-center text-sm font-medium text-muted-foreground hover:bg-muted/50"
        >
          Cancel
        </button>
      </SheetContent>
    </Sheet>
  )
}

function ActionButton({
  icon,
  children,
  onClick,
  destructive = false,
}: {
  icon: React.ReactNode
  children: React.ReactNode
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex items-center gap-3 px-5 py-4 text-left text-sm font-medium transition-colors hover:bg-muted/50 ' +
        (destructive ? 'text-destructive' : 'text-foreground')
      }
    >
      <span className={destructive ? 'text-destructive' : 'text-muted-foreground'}>{icon}</span>
      <span className="truncate">{children}</span>
    </button>
  )
}
