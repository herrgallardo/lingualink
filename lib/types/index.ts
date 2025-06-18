/**
 * Core types for LinguaLink application
 */

// User-related types
export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  preferredLanguage: string;
  status: UserStatus;
  isTyping: boolean;
  lastSeen: Date;
}

export type UserStatus = 'available' | 'busy' | 'do-not-disturb' | 'invisible';

// Language support
export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
}

// This will be expanded as we build the application
export const SUPPORTED_LANGUAGES: readonly Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
] as const;

// Utility type for language codes
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

// Chat-related types
export interface Chat {
  id: string;
  createdAt: Date;
  participants: string[]; // User IDs
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  timestamp: Date;
  originalText: string;
  translations: Record<string, string>; // language code -> translated text
}

// Translation-related types
export interface TranslationRequest {
  text: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  context?: string[]; // Previous messages for context
}

export interface TranslationResponse {
  translatedText: string;
  provider: TranslationProvider;
  cached: boolean;
  timestamp: Date;
}

export type TranslationProvider = 'groq' | 'cloudflare' | 'libretranslate';

// Glossary types
export interface GlossaryEntry {
  id: string;
  originalTerm: string;
  language: LanguageCode;
  translatedTerm: string;
  createdBy: string; // User ID
  createdAt: Date;
}

// Type guards
export function isValidLanguageCode(code: string): code is LanguageCode {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
}

export function isValidUserStatus(status: string): status is UserStatus {
  return ['available', 'busy', 'do-not-disturb', 'invisible'].includes(status);
}

// Re-export theme types
export * from './theme';
