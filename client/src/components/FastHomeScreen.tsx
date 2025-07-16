import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';

// Minimal critical above-the-fold content
const CriticalHomeContent = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4">
            MSMESquare
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            India&apos;s Leading MSME Marketplace
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/auth/login">Get Started</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/buyer/browse-msmes">Browse MSMEs</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Non-critical content loaded after initial render
const SecondaryContent = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle>For Sellers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300">
              List your MSME business and connect with verified buyers
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>For Buyers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300">
              Discover profitable MSME opportunities with AI-powered matching
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>For NBFCs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-300">
              Provide acquisition financing with streamlined loan processing
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const FastHomeScreen = () => {
  const [showSecondaryContent, setShowSecondaryContent] = useState(false);

  useEffect(() => {
    // Load secondary content after 1 second delay
    const timer = setTimeout(() => {
      setShowSecondaryContent(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <CriticalHomeContent />
      {showSecondaryContent && <SecondaryContent />}
    </>
  );
};

export default FastHomeScreen;