'use client'

import { Calendar, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface DateFilterSelectProps {
  value: string
  onValueChange: (value: string) => void
  className?: string
}

const dateFilters = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
  { label: 'Custom Range', value: 'custom' },
]

export function DateFilterSelect({ value, onValueChange, className }: DateFilterSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const selectedFilter = dateFilters.find(filter => filter.value === value) || dateFilters[1]

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
      >
        <Calendar className="h-4 w-4" />
        <span>{selectedFilter.label}</span>
        <ChevronDown className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-40 bg-card border border-border rounded-md shadow-lg z-20">
            <div className="py-1">
              {dateFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => {
                    onValueChange(filter.value)
                    setIsOpen(false)
                  }}
                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                    value === filter.value ? 'bg-accent text-accent-foreground' : 'text-foreground'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}