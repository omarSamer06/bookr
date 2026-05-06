import { cn } from "@/lib/utils"

function Textarea({
  className,
  ...props
}) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "field-sizing-content flex min-h-24 w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-base text-bookr-text transition-all outline-none placeholder:text-bookr-muted focus-visible:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-300/80 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50 aria-invalid:border-red-400 aria-invalid:ring-2 aria-invalid:ring-red-200 md:text-sm",
        className
      )}
      {...props} />
  );
}

export { Textarea }
