'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Mail, Phone } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhotoPicker } from './photo-picker'
import { useUpdateContact } from '@/lib/queries'
import { formatUSPhone } from '@/lib/phone'
import type { Contact } from '@/lib/types'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().email('Invalid email').max(200).or(z.literal('')),
  phone: z.string().trim().max(50).or(z.literal('')),
  photo: z.string().nullable(),
})

type FormValues = z.infer<typeof schema>

interface ContactDetailSheetProps {
  contact: Contact | null
  onOpenChange: (open: boolean) => void
}

export function ContactDetailSheet({ contact, onOpenChange }: ContactDetailSheetProps) {
  const update = useUpdateContact()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', photo: null },
  })

  useEffect(() => {
    if (contact) {
      reset({
        name: contact.name,
        email: contact.email ?? '',
        phone: contact.phone ? formatUSPhone(contact.phone) : '',
        photo: contact.photo,
      })
    }
  }, [contact, reset])

  const photo = watch('photo')
  const name = watch('name')

  const onSubmit = async (values: FormValues) => {
    if (!contact) return
    try {
      await update.mutateAsync({
        id: contact.id,
        patch: {
          name: values.name.trim(),
          email: values.email ? values.email.trim() : null,
          phone: values.phone ? values.phone.trim() : null,
          photo: values.photo,
        },
      })
      toast.success('Contact updated', { duration: 2000 })
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update contact')
    }
  }

  return (
    <Sheet open={contact !== null} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{contact?.name ?? 'Contact'}</SheetTitle>
          </SheetHeader>

          {contact ? (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-5 px-4">
              <PhotoPicker
                value={photo}
                name={name}
                onChange={(v) => setValue('photo', v, { shouldDirty: true })}
              />

              <div className="grid gap-1.5">
                <Label htmlFor="detail-name">Name</Label>
                <Input id="detail-name" autoComplete="off" {...register('name')} />
                {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="detail-phone" className="gap-1.5">
                  <Phone className="size-3.5" /> Phone
                </Label>
                <Input
                  id="detail-phone"
                  inputMode="tel"
                  placeholder="(555) 123-4567"
                  maxLength={14}
                  {...register('phone', {
                    onChange: (e) => {
                      const formatted = formatUSPhone(e.target.value)
                      setValue('phone', formatted, { shouldDirty: true })
                    },
                  })}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="detail-email" className="gap-1.5">
                  <Mail className="size-3.5" /> Email
                </Label>
                <Input id="detail-email" type="email" {...register('email')} />
                {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
              </div>

              <SheetFooter className="-mx-4 mt-auto border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!isDirty || isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </SheetFooter>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>
  )
}
