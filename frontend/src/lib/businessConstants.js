// Mirrors backend enum so selects stay in sync without hardcoding magic strings in JSX
export const BUSINESS_CATEGORIES = [
  { value: 'beauty', label: 'Beauty' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'education', label: 'Education' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'other', label: 'Other' },
]

export function categoryLabel(value) {
  return BUSINESS_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

export const WEEKDAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
]
