import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Volume2 } from "lucide-react";
import { useState } from "react";

interface LanguageSelectorProps {
  currentLanguage: 'en' | 'hi' | 'or';
  onLanguageChange: (language: 'en' | 'hi' | 'or') => void;
}

export function LanguageSelector({ currentLanguage, onLanguageChange }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
    { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' }
  ];

  const currentLang = languages.find(lang => lang.code === currentLanguage);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2"
      >
        <Globe className="w-4 h-4" />
        <span>{currentLang?.nativeName}</span>
      </Button>

      {isOpen && (
        <Card className="absolute top-full right-0 mt-2 z-50 w-48">
          <CardContent className="p-2">
            <div className="space-y-1">
              {languages.map((lang) => (
                <Button
                  key={lang.code}
                  variant={currentLanguage === lang.code ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    onLanguageChange(lang.code as 'en' | 'hi' | 'or');
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{lang.nativeName}</span>
                      <span className="text-xs text-gray-500">{lang.name}</span>
                    </div>
                    {currentLanguage === lang.code && (
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}