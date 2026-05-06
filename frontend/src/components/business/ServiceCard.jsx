import { Clock, DollarSign, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

/** Compact card keeps dense owner dashboards scannable during operations staffing */
export default function ServiceCard({ service, onEdit, onDelete }) {
  return (
    <Card
      data-size="sm"
      className="border-gray-100 shadow-sm transition-all duration-200 hover:border-indigo-100 hover:shadow-md"
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-heading font-bold text-bookr-text">{service.name}</p>
            {!service.isActive && <span className="text-xs font-medium text-amber-700">Inactive</span>}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="rounded-full text-indigo-700 hover:bg-indigo-50"
              onClick={() => onEdit(service)}
            >
              <Pencil className="size-3.5" aria-hidden />
              <span className="sr-only">Edit service</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="rounded-full text-red-600 hover:bg-red-50"
              onClick={() => onDelete(service)}
            >
              <Trash2 className="size-3.5" aria-hidden />
              <span className="sr-only">Delete service</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-2">
        {service.description ? <p className="text-sm text-bookr-muted">{service.description}</p> : null}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">
            <Clock className="size-3.5" aria-hidden />
            {service.duration} min
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-900">
            <DollarSign className="size-3.5" aria-hidden />
            ${Number(service.price).toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
