'use client'

import { Mail, Phone, Calendar } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/initials'
import { formatUSPhone } from '@/lib/phone'
import type { Contact } from '@/lib/types'

interface ContactAboutDialogProps {
  contact: Contact | null
  onClose: () => void
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export function ContactAboutDialog({ contact, onClose }: ContactAboutDialogProps) {
  return (
    <Dialog open={contact !== null} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center">
          <Avatar className="size-24">
            {contact?.photo ? <AvatarImage src={contact.photo} alt="" /> : null}
            <AvatarFallback className="text-2xl font-medium">
              {getInitials(contact?.name ?? '?')}
            </AvatarFallback>
          </Avatar>
          <DialogTitle className="font-serif italic text-2xl mt-2">
            {contact?.name}
          </DialogTitle>
        </DialogHeader>

        <dl className="divide-y rounded-lg border bg-muted/30">
          <Row
            icon={<Phone className="size-4" />}
            label="Phone"
            value={contact?.phone ? formatUSPhone(contact.phone) : null}
          />
          <Row
            icon={<Mail className="size-4" />}
            label="Email"
            value={contact?.email}
          />
          <Row
            icon={<Calendar className="size-4" />}
            label="Added"
            value={contact ? formatDate(contact.createdAt) : null}
          />
        </dl>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
        <dd className="text-sm text-foreground">
          {value ? value : <span className="text-muted-foreground/70">—</span>}
        </dd>
      </div>
    </div>
  )
}
