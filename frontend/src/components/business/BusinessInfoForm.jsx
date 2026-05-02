import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BUSINESS_CATEGORIES } from '@/lib/businessConstants'
import { cn } from '@/lib/utils'

const emptyLocation = () => ({ address: '', city: '', country: '' })

/** Shared field wiring keeps setup vs edit flows visually aligned without duplicating validation UX */
export default function BusinessInfoForm({
  initialValues,
  onSubmit,
  submitLabel = 'Save',
  isPending,
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('beauty')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')

  useEffect(() => {
    if (!initialValues) return
    setName(initialValues.name ?? '')
    setDescription(initialValues.description ?? '')
    setCategory(initialValues.category ?? 'beauty')
    const loc = initialValues.location ?? emptyLocation()
    setAddress(loc.address ?? '')
    setCity(loc.city ?? '')
    setCountry(loc.country ?? '')
    setPhone(initialValues.phone ?? '')
    setWebsite(initialValues.website ?? '')
  }, [initialValues])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      category,
      location: {
        address: address.trim(),
        city: city.trim(),
        country: country.trim(),
      },
      phone: phone.trim(),
      website: website.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="biz-name">Business name</Label>
        <Input
          id="biz-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="biz-desc">Description</Label>
        <Textarea
          id="biz-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="min-h-[96px] resize-y"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="biz-category">Category</Label>
        <select
          id="biz-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={cn(
            'flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30'
          )}
        >
          {BUSINESS_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2 sm:col-span-3">
          <Label htmlFor="biz-address">Address</Label>
          <Input id="biz-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="biz-city">City</Label>
          <Input id="biz-city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="biz-country">Country</Label>
          <Input id="biz-country" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="biz-phone">Phone</Label>
          <Input id="biz-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="biz-web">Website</Label>
          <Input id="biz-web" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
