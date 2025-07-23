import { Metadata } from 'next'
import { AnalyticsFilters } from './filters'
import { DownloadButtons } from './download-buttons'
import { AdminRouteGuard } from './guards'

export const metadata: Metadata = {
  title: 'Admin Analytics | MSMEBazaar',
  description: 'Admin view of usage statistics and metrics',
}

export default function AdminAnalyticsPage() {
  return (
    <AdminRouteGuard>
      <section className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Analytics Dashboard</h1>
          <DownloadButtons />
        </div>
        <AnalyticsFilters />

        <div className="border border-dashed rounded-lg p-6 text-muted-foreground text-center">
          Charts and stats will go here.
        </div>
      </section>
    </AdminRouteGuard>
  )
}

