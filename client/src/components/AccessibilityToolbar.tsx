import { Button } from "@/components/ui/button";
import { useTextToSpeech } from "@/hooks/useLocalization";
import { Volume2, VolumeX, Type, Minus, Plus } from "lucide-react";
import { useState } from "react";

export function AccessibilityToolbar() {
  const { speak, stop, isPlaying, isSupported } = useTextToSpeech();
  const [fontSize, setFontSize] = useState(16);

  const increaseFontSize = () => {
    const newSize = Math.min(fontSize + 2, 24);
    setFontSize(newSize);
    document.documentElement.style.fontSize = `${newSize}px`;
  };

  const decreaseFontSize = () => {
    const newSize = Math.max(fontSize - 2, 12);
    setFontSize(newSize);
    document.documentElement.style.fontSize = `${newSize}px`;
  };

  const readPageContent = () => {
    const content = document.querySelector('main')?.textContent || 
                   document.querySelector('body')?.textContent || 
                   'Content not available';
    speak(content);
  };

  if (!isSupported) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-background border rounded-lg shadow-lg p-2 flex items-center gap-2 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={decreaseFontSize}
        disabled={fontSize <= 12}
        title="Decrease font size"
      >
        <Minus className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={increaseFontSize}
        disabled={fontSize >= 24}
        title="Increase font size"
      >
        <Plus className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-border" />
      
      <Button
        variant="outline"
        size="sm"
        onClick={isPlaying ? stop : readPageContent}
        title={isPlaying ? "Stop reading" : "Read page content"}
      >
        {isPlaying ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </Button>
    </div>
  );
}