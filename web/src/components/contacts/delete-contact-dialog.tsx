'use client'

import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useDeleteContact } from '@/lib/queries'
import type { Contact } from '@/lib/types'

interface DeleteContactDialogProps {
  contact: Contact | null
  onClose: () => void
}

export function DeleteContactDialog({ contact, onClose }: DeleteContactDialogProps) {
  const del = useDeleteContact()

  const handleDelete = async () => {
    if (!contact) return
    try {
      await del.mutateAsync(contact.id)
      toast.success(`${contact.name} deleted`, { duration: 2000 })
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contact')
    }
  }

  return (
    <Dialog open={contact !== null} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {contact?.name}&apos;s contact?</DialogTitle>
          <DialogDescription>This cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={del.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
            {del.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
