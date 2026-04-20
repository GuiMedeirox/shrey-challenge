'use client'

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { ContactCard } from './contact-card'
import type { Contact, ReorderItem } from '@/lib/types'

interface ContactsGridProps {
  contacts: Contact[]
  onOpen: (contact: Contact) => void
  onReorder: (items: ReorderItem[]) => void
  sortable?: boolean
}

export function ContactsGrid({ contacts, onOpen, onReorder, sortable = true }: ContactsGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    if (!sortable) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = contacts.findIndex((c) => c.id === active.id)
    const newIndex = contacts.findIndex((c) => c.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const pageSortOrders = contacts.map((c) => c.sortOrder).sort((a, b) => a - b)
    const reordered = arrayMove(contacts, oldIndex, newIndex)
    const items: ReorderItem[] = reordered.map((c, index) => ({ id: c.id, sortOrder: pageSortOrders[index]! }))
    onReorder(items)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={contacts.map((c) => c.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {contacts.map((c) => (
            <ContactCard key={c.id} contact={c} onOpen={onOpen} sortable={sortable} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
