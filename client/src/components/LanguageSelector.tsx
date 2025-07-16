import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocalization } from "@/hooks/useLocalization";
import { SupportedLanguage } from "@shared/localization";
import { Globe } from "lucide-react";

export function LanguageSelector() {
  const { language, changeLanguage, t } = useLocalization();

  const languages = [
    { code: 'en' as const, name: 'English', native: 'English' },
    { code: 'hi' as const, name: 'Hindi', native: 'हिंदी' },
    { code: 'or' as const, name: 'Odia', native: 'ଓଡ଼ିଆ' }
  ];

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4" />
      <Select 
        value={language} 
        onValueChange={(value: SupportedLanguage) => changeLanguage(value)}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{lang.native}</span>
                <span className="text-sm text-muted-foreground">({lang.name})</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}