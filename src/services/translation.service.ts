import { Injectable, signal, computed, effect } from '@angular/core';
import { LANG_DE } from '../i18n/de';
import { LANG_EN } from '../i18n/en';

const ALL_TRANSLATIONS = {
  de: LANG_DE,
  en: LANG_EN,
};

export type Language = keyof typeof ALL_TRANSLATIONS;
export type TranslationKey = keyof typeof LANG_DE.translations;

@Injectable({
  providedIn: 'root',
})
export class TranslationService {
  private storageKey = 'med-diary-lang';
  
  language = signal<Language>(this.getInitialLanguage());

  translations = computed(() => ALL_TRANSLATIONS[this.language()].translations);
  defaultMoods = computed(() => ALL_TRANSLATIONS[this.language()].defaultMoods);
  defaultEffects = computed(() => ALL_TRANSLATIONS[this.language()].defaultEffects);

  constructor() {
    effect(() => {
      localStorage.setItem(this.storageKey, this.language());
    });
  }
  
  private getInitialLanguage(): Language {
    const storedLang = localStorage.getItem(this.storageKey);
    if (storedLang && this.isLanguage(storedLang)) {
      return storedLang;
    }

    const browserLang = navigator.language.split('-')[0];
    if (this.isLanguage(browserLang)) {
      return browserLang;
    }
    
    return 'en'; // Default to English if browser lang is not supported
  }

  private isLanguage(lang: string): lang is Language {
    return lang in ALL_TRANSLATIONS;
  }

  setLanguage(lang: Language) {
    this.language.set(lang);
  }

  /**
   * Returns a translated string for a given key from the current language.
   * @param key The key of the translation string.
   * @returns The translated string.
   */
  t(key: TranslationKey): string {
    return this.translations()[key];
  }
}