import { FastHomeScreen } from '@/components/FastHomeScreen';
import { LanguageSelector } from '@/components/LanguageSelector';
import { AccessibilityToolbar } from '@/components/AccessibilityToolbar';
import { initializeCaching } from '@/utils/enhanced-caching';
import { useState, useEffect } from 'react';

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
    </>
  );
}