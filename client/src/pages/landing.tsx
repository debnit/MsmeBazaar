import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocalization } from "@/hooks/useLocalization";
import { LanguageSelector } from "@/components/LanguageSelector";
import { AccessibilityToolbar } from "@/components/AccessibilityToolbar";
import { Building, Users, MapPin, Coins, TrendingUp, ShieldCheck } from "lucide-react";

export default function Landing() {
  const { t } = useLocalization();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building className="h-8 w-8 text-blue-600 mr-2" />
              <h1 className="text-xl font-bold text-gray-900">MSMESquare</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <Button variant="outline" onClick={() => window.location.href = '/auth'}>
                {t('nav.login')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              {t('hero.title')} <span className="text-blue-600">MSMESquare</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                {t('nav.sell')}
              </Button>
              <Button size="lg" variant="outline">
                {t('nav.buy')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t('features.title')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  {t('features.proximity.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{t('features.proximity.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-green-600" />
                  {t('features.loan.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{t('features.loan.description')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-purple-600" />
                  {t('features.compliance.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">{t('features.compliance.description')}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
            {t('stats.title')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">20 {t('stats.lakh')}</div>
              <p className="text-gray-600">{t('stats.odisha.msmes')}</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">6 {t('stats.crore')}</div>
              <p className="text-gray-600">{t('stats.national.msmes')}</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">30</div>
              <p className="text-gray-600">{t('stats.districts')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-white mb-6">
            {t('cta.title')}
          </h3>
          <p className="text-xl text-blue-100 mb-8">
            {t('cta.description')}
          </p>
          <Button size="lg" variant="secondary" onClick={() => window.location.href = '/auth'}>
            {t('cta.button')}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Building className="h-6 w-6 text-blue-400 mr-2" />
                <span className="text-lg font-semibold">MSMESquare</span>
              </div>
              <p className="text-gray-400">{t('footer.description')}</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">{t('footer.services')}</h4>
              <ul className="space-y-2 text-gray-400">
                <li>{t('nav.sell')}</li>
                <li>{t('nav.buy')}</li>
                <li>{t('nav.loan')}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">{t('footer.support')}</h4>
              <ul className="space-y-2 text-gray-400">
                <li>{t('footer.help')}</li>
                <li>{t('footer.contact')}</li>
                <li>{t('footer.faq')}</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">{t('footer.languages')}</h4>
              <div className="text-gray-400">
                <p>English</p>
                <p>हिंदी</p>
                <p>ଓଡ଼ିଆ</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 MSMESquare. {t('footer.rights')}</p>
          </div>
        </div>
      </footer>

      <AccessibilityToolbar />
    </div>
  );
}