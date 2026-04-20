'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhotoPicker } from './photo-picker'
import { useCreateContact } from '@/lib/queries'
import { formatUSPhone } from '@/lib/phone'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().email('Invalid email').max(200).or(z.literal('')),
  phone: z.string().trim().max(50).or(z.literal('')),
  photo: z.string().nullable(),
})

type FormValues = z.infer<typeof schema>

interface NewContactSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewContactSheet({ open, onOpenChange }: NewContactSheetProps) {
  const create = useCreateContact()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', photo: null },
  })

  useEffect(() => {
    if (!open) reset({ name: '', email: '', phone: '', photo: null })
  }, [open, reset])

  const photo = watch('photo')
  const name = watch('name')

  const onSubmit = async (values: FormValues) => {
    try {
      await create.mutateAsync({
        name: values.name.trim(),
        email: values.email ? values.email.trim() : null,
        phone: values.phone ? values.phone.trim() : null,
        photo: values.photo,
      })
      toast.success('Contact created', { duration: 2000 })
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create contact')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New contact</SheetTitle>
          <SheetDescription>Add someone to your list.</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-5 px-4">
          <PhotoPicker
            value={photo}
            name={name}
            onChange={(v) => setValue('photo', v, { shouldDirty: true })}
          />

          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" autoComplete="off" placeholder="Jane Doe" {...register('name')} />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 123-4567"
              maxLength={14}
              {...register('phone', {
                onChange: (e) => {
                  const formatted = formatUSPhone(e.target.value)
                  setValue('phone', formatted, { shouldDirty: true })
                },
              })}
            />
            {errors.phone ? <p className="text-xs text-destructive">{errors.phone.message}</p> : null}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" placeholder="jane@example.com" {...register('email')} />
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>

          <SheetFooter className="-mx-4 mt-auto border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
