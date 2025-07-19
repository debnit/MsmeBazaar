import { useState, useEffect } from 'react';
import { SupportedLanguage, getLocalizedText, detectLanguage } from '@shared/localization';

export function useLocalization() {
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for saved language preference
    const savedLanguage = localStorage.getItem('msme-language') as SupportedLanguage;
    if (savedLanguage && ['en', 'hi', 'or'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    } else {
      // Auto-detect language from browser
      const detectedLanguage = detectLanguage(navigator.userAgent, navigator.language);
      setLanguage(detectedLanguage);
    }
    setIsLoading(false);
  }, []);

  const changeLanguage = (newLanguage: SupportedLanguage) => {
    setLanguage(newLanguage);
    localStorage.setItem('msme-language', newLanguage);
  };

  const t = (key: string) => getLocalizedText(key, language);

  return {
    language,
    changeLanguage,
    t,
    isLoading,
  };
}

// Hook for text-to-speech functionality (accessibility for low-literacy users)
export function useTextToSpeech() {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
  }, []);

  const speak = (text: string, language: SupportedLanguage = 'en') => {
    if (!isSupported) {return;}

    // Cancel any ongoing speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Configure voice based on language
    const voices = speechSynthesis.getVoices();
    let voice = null;

    switch (language) {
    case 'hi':
      voice = voices.find(v => v.lang.includes('hi')) || voices.find(v => v.lang.includes('IN'));
      break;
    case 'or':
      voice = voices.find(v => v.lang.includes('or')) || voices.find(v => v.lang.includes('IN'));
      break;
    default:
      voice = voices.find(v => v.lang.includes('en-IN')) || voices.find(v => v.lang.includes('en'));
    }

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 0.8;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    speechSynthesis.speak(utterance);
  };

  const stop = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
  };

  return {
    speak,
    stop,
    isPlaying,
    isSupported,
  };
}
