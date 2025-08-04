'use client'

export function AnalyticsFilters() {
  return (
    <div className="flex gap-4 items-center">
      <label htmlFor="date" className="text-sm font-medium">
        Date Range:
      </label>
      <input type="date" id="start" name="start" className="input input-bordered" />
      <span className="text-muted-foreground">to</span>
      <input type="date" id="end" name="end" className="input input-bordered" />
    </div>
  )
}

