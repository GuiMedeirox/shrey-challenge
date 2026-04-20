'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ContactsGrid } from '@/components/contacts/contacts-grid'
import { ContactsSkeleton } from '@/components/contacts/contacts-skeleton'
import { EmptyState } from '@/components/contacts/empty-state'
import { NewContactSheet } from '@/components/contacts/new-contact-sheet'
import { ContactDetailSheet } from '@/components/contacts/contact-detail-sheet'
import { ContactActionSheet } from '@/components/contacts/contact-action-sheet'
import { ContactAboutDialog } from '@/components/contacts/contact-about-dialog'
import { DeleteContactDialog } from '@/components/contacts/delete-contact-dialog'
import { SortMenu, parseSortMode, type SortMode } from '@/components/contacts/sort-menu'
import { PaginationBar } from '@/components/contacts/pagination-bar'
import { useContacts, useReorderContacts, DEFAULT_PAGE_SIZE } from '@/lib/queries'
import type { Contact, ReorderItem } from '@/lib/types'

export default function Home() {
  const [sortMode, setSortMode] = useState<SortMode>('sortOrder')
  const [page, setPage] = useState(1)
  const { sort, dir } = parseSortMode(sortMode)
  const { data, isLoading, isError, error, refetch } = useContacts({ sort, dir, page, limit: DEFAULT_PAGE_SIZE })
  const reorder = useReorderContacts()

  const [newOpen, setNewOpen] = useState(false)
  const [menuFor, setMenuFor] = useState<Contact | null>(null)
  const [aboutFor, setAboutFor] = useState<Contact | null>(null)
  const [editFor, setEditFor] = useState<Contact | null>(null)
  const [deleteFor, setDeleteFor] = useState<Contact | null>(null)

  const contacts = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const isManual = sortMode === 'sortOrder'
  const canDrag = isManual

  const handleSortChange = (mode: SortMode) => {
    setSortMode(mode)
    setPage(1)
  }

  const handleReorder = (items: ReorderItem[]) => {
    reorder.mutate(items, {
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : 'Failed to reorder')
      },
    })
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 flex items-center justify-between">
        <h1
          className="font-serif italic text-5xl tracking-tight text-foreground"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 50, "WONK" 1' }}
        >
          Contacts
        </h1>
        <div className="flex items-center gap-2">
          <SortMenu value={sortMode} onChange={handleSortChange} />
          <Button
            size="icon-lg"
            aria-label="New contact"
            onClick={() => setNewOpen(true)}
          >
            <Plus />
          </Button>
        </div>
      </header>

      {isLoading ? (
        <ContactsSkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 py-16 text-center">
          <p className="text-sm font-medium text-destructive">Couldn&apos;t load contacts</p>
          <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : 'Unknown error'}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState onCreate={() => setNewOpen(true)} />
      ) : (
        <>
          <ContactsGrid
            contacts={contacts}
            onOpen={setMenuFor}
            onReorder={handleReorder}
            sortable={canDrag}
          />
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {canDrag
              ? 'Tip: drag a contact to reorder.'
              : 'Switch to Manual order to drag-and-drop.'}
          </p>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={DEFAULT_PAGE_SIZE}
            onPageChange={setPage}
          />
        </>
      )}

      <NewContactSheet open={newOpen} onOpenChange={setNewOpen} />

      <ContactActionSheet
        contact={menuFor}
        onClose={() => setMenuFor(null)}
        onAbout={() => {
          setAboutFor(menuFor)
          setMenuFor(null)
        }}
        onEdit={() => {
          setEditFor(menuFor)
          setMenuFor(null)
        }}
        onDelete={() => {
          setDeleteFor(menuFor)
          setMenuFor(null)
        }}
      />

      <ContactAboutDialog contact={aboutFor} onClose={() => setAboutFor(null)} />

      <ContactDetailSheet
        contact={editFor}
        onOpenChange={(open) => {
          if (!open) setEditFor(null)
        }}
      />

      <DeleteContactDialog contact={deleteFor} onClose={() => setDeleteFor(null)} />
    </main>
  )
}
