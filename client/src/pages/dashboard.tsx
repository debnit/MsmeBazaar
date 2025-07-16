import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocalization } from "@/hooks/useLocalization";
import { AccessibilityToolbar } from "@/components/AccessibilityToolbar";
import { Building, Users, MapPin, TrendingUp, FileText, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { t } = useLocalization();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    retry: false,
  });

  const { data: nearbyListings } = useQuery({
    queryKey: ['/api/buyer/matches'],
    retry: false,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">MSMESquare</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => window.location.href = '/api/auth/logout'}>
                {t('nav.logout')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.welcome')}</h2>
          <p className="text-gray-600">{t('dashboard.subtitle')}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.stats.total.listings')}</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.totalListings || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.stats.nearby.businesses')}</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{nearbyListings?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.stats.loan.applications')}</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.loanApplications || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('dashboard.stats.active.interests')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.activeInterests || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Nearby Businesses */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                {t('dashboard.nearby.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {nearbyListings?.slice(0, 3).map((match: any) => (
                  <div key={match.msme.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{match.msme.businessName}</h4>
                      <p className="text-sm text-gray-600">{match.msme.industry}</p>
                      <p className="text-sm text-gray-500">
                        {match.msme.city} • {match.distance ? `${Math.round(match.distance)} km` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary">
                        {t('dashboard.match.score')}: {Math.round(match.score * 100)}%
                      </Badge>
                      <p className="text-sm text-green-600 mt-1">
                        ₹{match.msme.askingPrice ? Number(match.msme.askingPrice).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                ))}
                {(!nearbyListings || nearbyListings.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>{t('dashboard.nearby.empty')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                {t('dashboard.activity.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('dashboard.activity.new.match')}</p>
                    <p className="text-xs text-gray-500">2 {t('dashboard.activity.hours.ago')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('dashboard.activity.loan.approved')}</p>
                    <p className="text-xs text-gray-500">1 {t('dashboard.activity.day.ago')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t('dashboard.activity.valuation.updated')}</p>
                    <p className="text-xs text-gray-500">3 {t('dashboard.activity.days.ago')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">{t('dashboard.quick.actions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Building className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold mb-2">{t('nav.sell')}</h4>
                <p className="text-sm text-gray-600">{t('dashboard.actions.sell.description')}</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-semibold mb-2">{t('nav.buy')}</h4>
                <p className="text-sm text-gray-600">{t('dashboard.actions.buy.description')}</p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6 text-center">
                <FileText className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-semibold mb-2">{t('nav.loan')}</h4>
                <p className="text-sm text-gray-600">{t('dashboard.actions.loan.description')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AccessibilityToolbar />
    </div>
  );
}