import { Clock, DollarSign, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/** Compact card keeps dense owner dashboards scannable during operations staffing */
export default function ServiceCard({ service, onEdit, onDelete }) {
  return (
    <Card data-size="sm" className="ring-border/80">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium">{service.name}</p>
            {!service.isActive && (
              <span className="text-xs text-muted-foreground">Inactive</span>
            )}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button type="button" variant="ghost" size="icon-xs" onClick={() => onEdit(service)}>
              <Pencil className="size-3.5" aria-hidden />
              <span className="sr-only">Edit service</span>
            </Button>
            <Button type="button" variant="ghost" size="icon-xs" onClick={() => onDelete(service)}>
              <Trash2 className="size-3.5 text-destructive" aria-hidden />
              <span className="sr-only">Delete service</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-2">
        {service.description ? (
          <p className="text-sm text-muted-foreground">{service.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {service.duration} min
          </span>
          <span className="inline-flex items-center gap-1">
            <DollarSign className="size-3.5" aria-hidden />
            ${Number(service.price).toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
