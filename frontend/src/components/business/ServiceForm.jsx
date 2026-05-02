import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

/** Modal isolates validation churn so the services grid stays mounted for quicker edits */
export default function ServiceForm({ open, onOpenChange, mode, service, onSubmit, isPending }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('60')
  const [price, setPrice] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && service) {
      setName(service.name ?? '')
      setDescription(service.description ?? '')
      setDuration(String(service.duration ?? 60))
      setPrice(String(service.price ?? ''))
      setIsActive(service.isActive !== false)
    } else {
      setName('')
      setDescription('')
      setDuration('60')
      setPrice('')
      setIsActive(true)
    }
  }, [open, mode, service])

  const handleSubmit = (e) => {
    e.preventDefault()
    const dur = Number(duration)
    const pr = Number(price)
    if (!name.trim() || Number.isNaN(dur) || dur < 1 || Number.isNaN(pr) || pr < 0) return
    const payload = {
      name: name.trim(),
      description: description.trim(),
      duration: dur,
      price: pr,
      isActive,
    }
    if (mode === 'edit' && service?._id) {
      onSubmit(service._id, payload)
    } else {
      onSubmit(null, payload)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit service' : 'New service'}</DialogTitle>
          <DialogDescription>Set duration and pricing clients will see when booking.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="svc-name">Name</Label>
            <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="svc-desc">Description</Label>
            <Textarea id="svc-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="svc-dur">Duration (minutes)</Label>
              <Input
                id="svc-dur"
                type="number"
                min={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="svc-price">Price</Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(Boolean(v))} />
            Active (visible for booking flows later)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : mode === 'edit' ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
