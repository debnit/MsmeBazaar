'use client'

import { Button } from '@/components/ui/button'

export function DownloadButtons() {
  const handleDownload = (type: 'csv' | 'pdf') => {
    alert(`Downloading ${type}...`)
    // TODO: Implement actual download logic
  }

  return (
    <div className="flex gap-2">
      <Button onClick={() => handleDownload('csv')} variant="outline">
        Download CSV
      </Button>
      <Button onClick={() => handleDownload('pdf')} variant="default">
        Export PDF
      </Button>
    </div>
  )
}

