// apps/web/app/admin/analytics/page.tsx

export const dynamic = 'force-dynamic'; // Prevents SSG issues

export default function AnalyticsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Admin Analytics</h1>
      <p className="text-muted">This page is under construction.</p>
    </div>
  );
}




/*import { Metadata } from 'next'
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

*/