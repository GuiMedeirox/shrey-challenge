'use client'

import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type SortMode =
  | 'sortOrder'
  | 'name-asc'
  | 'name-desc'
  | 'createdAt-desc'
  | 'createdAt-asc'

export function parseSortMode(mode: SortMode): { sort: 'sortOrder' | 'name' | 'createdAt'; dir: 'asc' | 'desc' } {
  switch (mode) {
    case 'sortOrder':
      return { sort: 'sortOrder', dir: 'asc' }
    case 'name-asc':
      return { sort: 'name', dir: 'asc' }
    case 'name-desc':
      return { sort: 'name', dir: 'desc' }
    case 'createdAt-desc':
      return { sort: 'createdAt', dir: 'desc' }
    case 'createdAt-asc':
      return { sort: 'createdAt', dir: 'asc' }
  }
}

interface SortMenuProps {
  value: SortMode
  onChange: (mode: SortMode) => void
}

export function SortMenu({ value, onChange }: SortMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="icon-lg" aria-label="Sort contacts" />
        }
      >
        <ArrowUpDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(v) => onChange(v as SortMode)}
        >
          <DropdownMenuRadioItem value="sortOrder">Manual order</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="name-asc">Name (A → Z)</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="name-desc">Name (Z → A)</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="createdAt-desc">Newest first</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="createdAt-asc">Oldest first</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
