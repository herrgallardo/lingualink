/**
 * Translation system types
 */

export type TranslationKey = string;

export interface TranslationValues {
  [key: string]: string | number | boolean;
}

export interface Translation {
  [key: string]: string | Translation;
}

/**
 * Structure of translation sections
 */
export interface TranslationStructure {
  common: Translation;
  auth: Translation;
  chat: Translation;
  profile: Translation;
  navigation: Translation;
  errors: Translation;
  notifications: Translation;
  settings: Translation;
  presence: Translation;
  search: Translation;
  users: Translation;
}

/**
 * Complete language translation object
 */
export interface LanguageTranslation {
  locale: string;
  name: string;
  translations: TranslationStructure;
}

/**
 * Translation section names
 */
export type TranslationSection = keyof TranslationStructure;

/**
 * Common translation keys used across the app
 */
export type CommonTranslationKey =
  | 'common.loading'
  | 'common.save'
  | 'common.cancel'
  | 'common.delete'
  | 'common.edit'
  | 'common.close'
  | 'common.back'
  | 'common.next'
  | 'common.search'
  | 'common.error'
  | 'common.success'
  | 'common.yes'
  | 'common.no'
  | 'common.signIn'
  | 'common.signUp'
  | 'common.signOut';

/**
 * Authentication-related translation keys
 */
export type AuthTranslationKey =
  | 'auth.signIn'
  | 'auth.signUp'
  | 'auth.signOut'
  | 'auth.email'
  | 'auth.password'
  | 'auth.username'
  | 'auth.emailPlaceholder'
  | 'auth.passwordPlaceholder'
  | 'auth.usernamePlaceholder'
  | 'auth.signInTitle'
  | 'auth.signUpTitle'
  | 'auth.signInSubtitle'
  | 'auth.signUpSubtitle'
  | 'auth.orContinueWith'
  | 'auth.continueWithGoogle'
  | 'auth.continueWithGithub'
  | 'auth.alreadyHaveAccount'
  | 'auth.dontHaveAccount'
  | 'auth.verifyEmailTitle'
  | 'auth.verifyEmailDescription'
  | 'auth.backToLogin'
  | 'auth.passwordTooShort';

/**
 * Chat-related translation keys
 */
export type ChatTranslationKey =
  | 'chat.title'
  | 'chat.newChat'
  | 'chat.startNewChat'
  | 'chat.yourChats'
  | 'chat.noChatsYet'
  | 'chat.noChatsDescription'
  | 'chat.typeMessage'
  | 'chat.sendMessage'
  | 'chat.online'
  | 'chat.offline'
  | 'chat.typing'
  | 'chat.lastSeen';

/**
 * Union of all known translation keys
 */
export type KnownTranslationKey =
  | CommonTranslationKey
  | AuthTranslationKey
  | ChatTranslationKey
  | TranslationKey;

/**
 * Translation function signature
 */
export type TranslationFunction = (
  key: KnownTranslationKey | string,
  values?: TranslationValues,
) => string;

/**
 * Supported language codes
 */
export type LanguageCode =
  | 'en'
  | 'es'
  | 'fr'
  | 'de'
  | 'it'
  | 'pt'
  | 'ru'
  | 'zh'
  | 'ja'
  | 'ko'
  | 'ar'
  | 'hi'
  | 'sv'
  | 'no'
  | 'da'
  | 'fi'
  | 'nl'
  | 'pl'
  | 'tr'
  | 'th'
  | 'vi'
  | 'id'
  | 'ms';

/**
 * Language metadata
 */
export interface SupportedLanguage {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag?: string;
  rtl?: boolean;
}

/**
 * Pluralization forms for different languages
 */
export interface PluralizationRule {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/**
 * Date and time formatting configuration
 */
export interface DateTimeFormatOptions {
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
  calendar?: string;
  numberingSystem?: string;
  timeZone?: string;
  hour12?: boolean;
}

/**
 * Number formatting configuration
 */
export interface NumberFormatOptions {
  style?: 'decimal' | 'currency' | 'percent' | 'unit';
  currency?: string;
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
  minimumIntegerDigits?: number;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  minimumSignificantDigits?: number;
  maximumSignificantDigits?: number;
  notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
  compactDisplay?: 'short' | 'long';
  useGrouping?: boolean;
  unit?: string;
  unitDisplay?: 'short' | 'long' | 'narrow';
}

/**
 * Translation context with formatting utilities
 */
export interface TranslationContext {
  locale: LanguageCode;
  translations: TranslationStructure;
  formatDate: (date: Date | string, options?: DateTimeFormatOptions) => string;
  formatNumber: (number: number, options?: NumberFormatOptions) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatRelativeTime: (date: Date | string) => string;
  pluralize: (count: number, rule: PluralizationRule) => string;
}

/**
 * Type guard for translation keys
 */
export function isTranslationKey(key: string): key is KnownTranslationKey {
  return true;
}

/**
 * Extract nested object keys as dot notation paths
 */
export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

/**
 * Translation path with section prefix
 */
export type TranslationPath = `${TranslationSection}.${string}`;
