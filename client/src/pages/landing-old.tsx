import { FastHomeScreen } from '@/components/FastHomeScreen';
import { LanguageSelector } from '@/components/LanguageSelector';
import { AccessibilityToolbar } from '@/components/AccessibilityToolbar';
import { initializeCaching } from '@/utils/enhanced-caching';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Building } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Translation function placeholder - replace with actual i18n implementation
const t = (key: string) => {
  const translations: Record<string, string> = {
    'features.title': 'Features',
    'features.proximity.title': 'Proximity-Based Matching',
    'features.proximity.description': 'Connect with nearby businesses for faster transactions',
    'features.loan.title': 'Easy Loan Access',
    'features.loan.description': 'Get quick access to business loans',
    'features.compliance.title': 'Compliance Support',
    'features.compliance.description': 'Stay compliant with government regulations',
    'stats.title': 'Platform Statistics',
    'stats.lakh': 'Lakh+',
    'stats.crore': 'Crore+',
    'stats.odisha.msmes': 'MSMEs in Odisha',
    'stats.national.msmes': 'MSMEs Nationally',
    'stats.districts': 'Districts Covered',
    'cta.title': 'Ready to Get Started?',
    'cta.description': 'Join thousands of MSMEs already on our platform',
    'cta.button': 'Get Started',
    'footer.description': 'Connecting MSMEs across India',
    'footer.services': 'Services',
    'footer.support': 'Support',
    'footer.languages': 'Languages',
    'footer.help': 'Help Center',
    'footer.contact': 'Contact Us',
    'footer.faq': 'FAQ',
    'footer.rights': 'All rights reserved.',
    'nav.sell': 'Sell Business',
    'nav.buy': 'Buy Business',
    'nav.loan': 'Get Loan'
  };
  return translations[key] || key;
};

export default function Landing() {
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'hi' | 'or'>('en');
  
  useEffect(() => {
    // Initialize enhanced caching system
    initializeCaching();
  }, []);

  const handleLanguageChange = (language: 'en' | 'hi' | 'or') => {
    setCurrentLanguage(language);
  };

  return (
    <>
      <AccessibilityToolbar />
      <div className="relative">
        <div className="absolute top-4 right-4 z-10">
          <LanguageSelector
            currentLanguage={currentLanguage}
            onLanguageChange={handleLanguageChange}
          />
        </div>
        <FastHomeScreen />
      </div>

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
    </>
  );
}