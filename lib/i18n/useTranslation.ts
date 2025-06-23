import { useCallback } from 'react';
import { en } from './locales/en';
import type { Translation, TranslationStructure, TranslationValues } from './types';

/**
 * Current locale (will be dynamic in the future)
 */
const currentLocale = en;

/**
 * Type for nested translation access
 */
type TranslationNode = string | Translation | TranslationStructure;

/**
 * Hook for accessing translations
 */
export function useTranslation() {
  /**
   * Get a translation by dot notation key path
   */
  const t = useCallback((key: string, values?: TranslationValues): string => {
    const keys = key.split('.');
    let current: TranslationNode = currentLocale.translations;

    for (const k of keys) {
      if (typeof current === 'string') {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }

      if (current && typeof current === 'object' && k in current) {
        const next = current[k as keyof typeof current] as TranslationNode;
        current = next;
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    if (typeof current !== 'string') {
      console.warn(`Translation key is not a string: ${key}`);
      return key;
    }

    /**
     * Replace template variables with provided values
     */
    if (values) {
      return current.replace(/\{\{(\w+)\}\}/g, (match, placeholder) => {
        return String(values[placeholder] ?? match);
      });
    }

    return current;
  }, []);

  /**
   * Get all translations for a specific section
   */
  const section = useCallback((sectionKey: string): Record<string, string> => {
    const keys = sectionKey.split('.');
    let current: TranslationNode = currentLocale.translations;

    for (const k of keys) {
      if (typeof current === 'string') {
        return {};
      }

      if (current && typeof current === 'object' && k in current) {
        const next = current[k as keyof typeof current] as TranslationNode;
        current = next;
      } else {
        return {};
      }
    }

    if (typeof current === 'object' && current !== null) {
      /**
       * Flatten nested translation objects into dot notation keys
       */
      const flatten = (obj: Record<string, unknown>, prefix = ''): Record<string, string> => {
        const result: Record<string, string> = {};

        Object.entries(obj).forEach(([key, val]) => {
          const newKey = prefix ? `${prefix}.${key}` : key;

          if (typeof val === 'string') {
            result[newKey] = val;
          } else if (typeof val === 'object' && val !== null) {
            Object.assign(result, flatten(val as Record<string, unknown>, newKey));
          }
        });

        return result;
      };

      return flatten(current as Record<string, unknown>);
    }

    return {};
  }, []);

  return {
    t,
    section,
    locale: currentLocale.locale,
    language: currentLocale.name,
  };
}
